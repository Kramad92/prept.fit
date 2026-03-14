"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

interface TenantOption {
  clientProfileId: string;
  tenantId: string;
  name: string;
  slug: string;
  brandColor: string | null;
  logo: string | null;
}

export function TenantSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useT();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ activeTenantId: string; tenants: TenantOption[] }>("/api/portal/tenants")
      .then((data) => setTenants(data.tenants))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Don't show switcher if client only has one coach
  if (tenants.length <= 1) return null;

  const activeTenant = tenants.find((t) => t.tenantId === session?.user?.tenantId);

  async function handleSwitch(tenantId: string) {
    if (tenantId === session?.user?.tenantId || switching) return;
    setSwitching(true);
    try {
      await api.post("/api/portal/switch-tenant", { tenantId });
      // Update the NextAuth session JWT with new tenant
      await update({ tenantId });
      setOpen(false);
      router.refresh();
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeTenant?.brandColor && (
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: activeTenant.brandColor }}
            />
          )}
          <span className="truncate">{activeTenant?.name || "..."}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400">{t.portal.switchCoach}</div>
          {tenants.map((tenant) => {
            const isActive = tenant.tenantId === session?.user?.tenantId;
            return (
              <button
                key={tenant.tenantId}
                onClick={() => handleSwitch(tenant.tenantId)}
                disabled={switching}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {tenant.brandColor && (
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tenant.brandColor }}
                  />
                )}
                <span className="flex-1 truncate">{tenant.name}</span>
                {isActive && <Check className="h-4 w-4 flex-shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
