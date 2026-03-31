"use client";

import { ImageUploader } from "@/components/ui/image-uploader";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../onboarding-wizard";

export function CoachProfile({ data, onUpdate }: StepProps) {
  const photoUrl = data.coachPhoto
    ? `${process.env.NEXT_PUBLIC_S3_URL || ""}/${data.coachPhoto}`
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-card-foreground">Your Profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Help clients get to know you. Add a photo and a short bio.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Profile Photo
          </label>
          {photoUrl ? (
            <div className="relative inline-block">
              <img
                src={photoUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
              <button
                onClick={() => onUpdate({ coachPhoto: null })}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          ) : (
            <ImageUploader
              folder="coaches"
              onUploaded={(key) => onUpdate({ coachPhoto: key })}
              className="max-w-xs"
            />
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Bio
          </label>
          <Textarea
            value={data.bio || ""}
            onChange={(e) => onUpdate({ bio: e.target.value })}
            placeholder="Tell clients about your experience, certifications, and coaching style..."
            rows={4}
            maxLength={5000}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {(data.bio || "").length}/5000
          </p>
        </div>
      </div>
    </div>
  );
}
