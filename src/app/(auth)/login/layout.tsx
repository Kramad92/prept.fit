import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your TrainerHub account to manage clients, schedule sessions, and track progress.",
  openGraph: {
    title: "Sign In to TrainerHub",
    description:
      "Sign in to your TrainerHub account to manage clients, schedule sessions, and track progress.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
