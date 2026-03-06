import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { BrandColorProvider } from "@/components/brand-color-provider";
import { MobileInputScroll } from "@/components/mobile-input-scroll";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s - Dashboard | TrainerHub",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrandColorProvider />
      <Sidebar />
      <TopBar />
      <main className="pb-20 md:pb-0 md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <MobileNav />
      <MobileInputScroll />
    </div>
  );
}
