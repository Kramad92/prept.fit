import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    ...(process.env.APPLE_CLIENT_ID
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET || "",
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: credentials.email, mode: "insensitive" } },
          include: { tenant: true, clientProfiles: true },
        });

        if (!user || !user.passwordHash) return null;

        // Check for one-time login token (from social registration)
        if (user.passwordHash.startsWith("otp:")) {
          const [, token, expiry] = user.passwordHash.split(":");
          if (credentials.password !== token || new Date(expiry) < new Date()) {
            return null;
          }
          // Clear the one-time token after use
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: null },
          });
        } else {
          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) return null;
        }

        // Admin users don't belong to a tenant — empty string sentinel
        if (user.role === "ADMIN") {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: "",
            tenantSlug: "",
            clientProfileId: null,
            onboardingComplete: true,
          };
        }

        // Block inactive clients — only if ALL profiles are inactive
        if (user.role === "CLIENT" && user.clientProfiles.length > 0) {
          const hasActive = user.clientProfiles.some((cp) => cp.status === "active");
          if (!hasActive) {
            throw new Error("PORTAL_DISABLED");
          }
        }

        // Block unverified coaches
        if (user.role === "COACH" && !user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Block deactivated tenants
        if (user.tenant && !user.tenant.isActive) {
          throw new Error("TENANT_DEACTIVATED");
        }

        // For CLIENT users, find the active client profile for their current tenant
        const activeProfile = user.role === "CLIENT"
          ? user.clientProfiles.find((cp) => cp.tenantId === user.tenantId && cp.status === "active")
            || user.clientProfiles.find((cp) => cp.status === "active")
          : null;

        // If client's stored tenantId doesn't match any active profile, update it
        if (user.role === "CLIENT" && activeProfile && activeProfile.tenantId !== user.tenantId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { tenantId: activeProfile.tenantId },
          });
        }

        const effectiveTenantId = activeProfile?.tenantId || user.tenantId || "";
        const effectiveTenant = effectiveTenantId === user.tenantId
          ? user.tenant
          : await prisma.tenant.findUnique({ where: { id: effectiveTenantId } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: effectiveTenantId,
          tenantSlug: effectiveTenant?.slug || "",
          clientProfileId: activeProfile?.id || null,
          onboardingComplete: user.onboardingComplete,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials flow handled by authorize()
      if (account?.provider === "credentials") return true;

      // OAuth flow — check if user exists by email
      const email = user.email;
      if (!email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { clientProfiles: true },
      });

      if (existingUser) {
        // Link OAuth account if not already linked
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account!.provider,
              providerAccountId: account!.providerAccountId,
            },
          },
          update: {},
          create: {
            userId: existingUser.id,
            provider: account!.provider,
            providerAccountId: account!.providerAccountId,
          },
        });

        // Mark email as verified (OAuth providers verify emails)
        if (!existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }

        // Block inactive clients — only if ALL profiles are inactive
        if (
          existingUser.role === "CLIENT" &&
          existingUser.clientProfiles.length > 0 &&
          !existingUser.clientProfiles.some((cp) => cp.status === "active")
        ) {
          return "/login?error=PORTAL_DISABLED";
        }

        return true;
      }

      // No existing user — check if there's a pending client invite for this email
      const pendingClient = await prisma.client.findFirst({
        where: { email, userId: null },
        include: { tenant: true },
      });

      if (pendingClient) {
        // Auto-create CLIENT account for invited user signing in via OAuth
        const newUser = await prisma.user.create({
          data: {
            email,
            name: user.name || pendingClient.name,
            role: "CLIENT",
            tenantId: pendingClient.tenantId,
            emailVerified: new Date(),
          },
        });

        // Link OAuth account
        await prisma.account.create({
          data: {
            userId: newUser.id,
            provider: account!.provider,
            providerAccountId: account!.providerAccountId,
          },
        });

        // Link all pending client profiles with this email to the new user
        await prisma.client.updateMany({
          where: { email, userId: null },
          data: { userId: newUser.id },
        });

        // Mark all pending invite tokens for this client as used
        await prisma.inviteToken.updateMany({
          where: {
            clientId: pendingClient.id,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        return true;
      }

      // No pending invite — redirect to complete registration (coach signup)
      return `/register/complete?provider=${account!.provider}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(user.name || "")}`;
    },

    async jwt({ token, user, account, trigger, session: updateData }) {
      if (user && account?.provider !== "credentials") {
        // OAuth login — fetch full user from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { tenant: true, clientProfiles: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId || "";
          token.tenantSlug = dbUser.tenant?.slug || "";
          token.onboardingComplete = dbUser.onboardingComplete;
          // Find active client profile for current tenant
          const activeProfile = dbUser.clientProfiles.find(
            (cp) => cp.tenantId === dbUser.tenantId && cp.status === "active"
          ) || dbUser.clientProfiles.find((cp) => cp.status === "active");
          token.clientProfileId = activeProfile?.id || null;
        }
      } else if (user) {
        // Credentials login
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.clientProfileId = (user as any).clientProfileId;
        token.onboardingComplete = (user as any).onboardingComplete;
      }

      // Handle onboarding completion via useSession().update()
      if (trigger === "update" && updateData?.onboardingComplete === true) {
        token.onboardingComplete = true;
        await prisma.user.update({
          where: { id: token.sub },
          data: { onboardingComplete: true },
        });
      }

      // Handle tenant switch via useSession().update()
      if (trigger === "update" && updateData?.tenantId) {
        const newTenantId = updateData.tenantId as string;
        const clientProfile = await prisma.client.findFirst({
          where: { userId: token.sub, tenantId: newTenantId, status: "active" },
        });
        if (clientProfile) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: newTenantId },
            select: { slug: true },
          });
          token.tenantId = newTenantId;
          token.tenantSlug = tenant?.slug || "";
          token.clientProfileId = clientProfile.id;
          // Persist the switch
          await prisma.user.update({
            where: { id: token.sub },
            data: { tenantId: newTenantId },
          });
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantSlug = token.tenantSlug;
        (session.user as any).clientProfileId = token.clientProfileId;
        (session.user as any).onboardingComplete = token.onboardingComplete;
      }
      return session;
    },
  },
};
