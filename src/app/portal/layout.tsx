import { PortalMobileNav, PortalDesktopNav } from "@/components/layout/portal-nav";
import { TopBar } from "@/components/layout/top-bar";
import { BrandColorProvider } from "@/components/brand-color-provider";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrandColorProvider />
      <PortalDesktopNav />
      <TopBar />
      <main className="pb-20 md:pb-0 md:pl-64">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <PortalMobileNav />
    </div>
  );
}
