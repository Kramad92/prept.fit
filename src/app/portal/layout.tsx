import { PortalMobileNav, PortalDesktopNav } from "@/components/layout/portal-nav";
import { TopBar } from "@/components/layout/top-bar";
import { MobileInputScroll } from "@/components/mobile-input-scroll";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <PortalDesktopNav />
      <TopBar />
      <main className="overflow-x-hidden pb-20 md:pb-0 md:pl-64">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <PortalMobileNav />
      <MobileInputScroll />
    </div>
  );
}
