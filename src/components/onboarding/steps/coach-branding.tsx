"use client";

import { ImageUploader } from "@/components/ui/image-uploader";
import type { StepProps } from "../onboarding-wizard";

export function CoachBranding({ data, onUpdate }: StepProps) {
  const logoUrl = data.logo
    ? `${process.env.NEXT_PUBLIC_S3_URL || ""}/${data.logo}`
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-card-foreground">Your Brand</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your business logo to personalize your platform.
      </p>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Business Logo
        </label>
        {logoUrl ? (
          <div className="relative inline-block">
            <img
              src={logoUrl}
              alt="Logo"
              className="h-20 w-20 rounded-lg object-contain border border-border p-1"
            />
            <button
              onClick={() => onUpdate({ logo: null })}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80"
            >
              <span className="text-xs">✕</span>
            </button>
          </div>
        ) : (
          <ImageUploader
            folder="logos"
            onUploaded={(key) => onUpdate({ logo: key })}
            className="max-w-xs"
          />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          This will appear in your client portal and landing page.
        </p>
      </div>
    </div>
  );
}
