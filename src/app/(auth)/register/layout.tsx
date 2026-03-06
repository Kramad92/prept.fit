import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for TrainerHub and start managing your personal training business. Free to get started.",
  openGraph: {
    title: "Create Your TrainerHub Account",
    description:
      "Sign up for TrainerHub and start managing your personal training business. Free to get started.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
