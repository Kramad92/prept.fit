import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trainer-hub-psi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TrainerHub - Personal Training Management Platform",
    template: "%s | TrainerHub",
  },
  description:
    "Manage your personal training business in one place. Client management, workout programming, scheduling, progress tracking, nutrition plans, and more.",
  keywords: [
    "personal training",
    "fitness coaching",
    "client management",
    "workout plans",
    "training software",
    "fitness business",
    "personal trainer app",
    "gym management",
    "progress tracking",
    "coaching platform",
  ],
  authors: [{ name: "TrainerHub" }],
  creator: "TrainerHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "TrainerHub",
    title: "TrainerHub - Personal Training Management Platform",
    description:
      "Manage your personal training business in one place. Client management, workout programming, scheduling, progress tracking, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TrainerHub - Your personal training business, simplified",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrainerHub - Personal Training Management Platform",
    description:
      "Manage your personal training business in one place. Client management, workout programming, scheduling, progress tracking, and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
