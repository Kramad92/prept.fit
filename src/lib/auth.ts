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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true, clientProfile: true },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) return null;

        // Block inactive clients from logging in
        if (
          user.role === "CLIENT" &&
          user.clientProfile &&
          user.clientProfile.status !== "active"
        ) {
          throw new Error("PORTAL_DISABLED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          clientProfileId: user.clientProfile?.id || null,
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
        include: { clientProfile: true },
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

        // Block inactive clients
        if (
          existingUser.role === "CLIENT" &&
          existingUser.clientProfile &&
          existingUser.clientProfile.status !== "active"
        ) {
          return "/login?error=PORTAL_DISABLED";
        }

        return true;
      }

      // No existing user — check for a pending invitation first
      const pendingInvite = await prisma.inviteToken.findFirst({
        where: {
          usedAt: null,
          expiresAt: { gt: new Date() },
          client: {
            email,
            userId: null,
          },
        },
        include: { client: true },
        orderBy: { createdAt: "desc" },
      });

      if (pendingInvite) {
        // Create CLIENT user, link to client profile, mark invite used, link OAuth account
        const newUser = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email,
              name: user.name || pendingInvite.client.name,
              role: "CLIENT",
              emailVerified: new Date(),
              tenantId: pendingInvite.client.tenantId,
              clientProfile: { connect: { id: pendingInvite.client.id } },
            },
          });

          await tx.inviteToken.update({
            where: { id: pendingInvite.id },
            data: { usedAt: new Date() },
          });

          await tx.account.create({
            data: {
              userId: created.id,
              provider: account!.provider,
              providerAccountId: account!.providerAccountId,
            },
          });

          return created;
        });

        // Block inactive clients
        if (pendingInvite.client.status !== "active") {
          return "/login?error=PORTAL_DISABLED";
        }

        return true;
      }

      // No invitation found — redirect to coach registration
      return `/register/complete?provider=${account!.provider}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(user.name || "")}`;
    },

    async jwt({ token, user, account }) {
      if (user && account?.provider !== "credentials") {
        // OAuth login — fetch full user from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { tenant: true, clientProfile: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.tenantSlug = dbUser.tenant.slug;
          token.clientProfileId = dbUser.clientProfile?.id || null;
        }
      } else if (user) {
        // Credentials login — same as before
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.clientProfileId = (user as any).clientProfileId;
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
      }
      return session;
    },
  },
};
