"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepProps } from "../onboarding-wizard";

export function ClientWelcome({ onNext }: StepProps) {
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((data) => setTenantName(data.tenant?.name || ""))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
        <Heart className="h-8 w-8 text-rose-400" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-card-foreground">
        {tenantName ? `Welcome to ${tenantName}!` : "Welcome!"}
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Let&apos;s set up your profile so your coach can create the best plan for you.
        This takes about 2 minutes.
      </p>
      <Button onClick={onNext} className="mt-8" size="lg">
        Get Started
      </Button>
    </div>
  );
}
