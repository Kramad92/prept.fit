import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept Invitation",
  description:
    "Set up your TrainerHub client account and start working with your personal trainer.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
