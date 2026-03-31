"use client";

import { FilterSelect } from "@/components/ui/filter-select";
import type { StepProps } from "../onboarding-wizard";

const TIMEZONE_OPTIONS = [
  { value: "Europe/Sarajevo", label: "Europe/Sarajevo (CET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Europe/Rome", label: "Europe/Rome (CET)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "America/New_York", label: "America/New York (EST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Denver", label: "America/Denver (MST)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
  { value: "America/Toronto", label: "America/Toronto (EST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
];

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "bs", label: "Bosanski" },
  { value: "sr", label: "Srpski" },
  { value: "hr", label: "Hrvatski" },
];

const UNITS_OPTIONS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, ft)" },
];

const CURRENCY_OPTIONS = [
  { value: "BAM", label: "BAM (KM)" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
];

export function CoachPreferences({ data, onUpdate }: StepProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
      <p className="mt-1 text-sm text-gray-500">
        Set your timezone, language, and measurement preferences.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <FilterSelect
            options={TIMEZONE_OPTIONS}
            value={data.timezone || "Europe/Sarajevo"}
            onChange={(v) => onUpdate({ timezone: v })}
            placeholder="Select timezone"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Language
          </label>
          <FilterSelect
            options={LOCALE_OPTIONS}
            value={data.locale || "en"}
            onChange={(v) => onUpdate({ locale: v })}
            placeholder="Select language"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Units
          </label>
          <FilterSelect
            options={UNITS_OPTIONS}
            value={data.units || "metric"}
            onChange={(v) => onUpdate({ units: v })}
            placeholder="Select units"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Currency
          </label>
          <FilterSelect
            options={CURRENCY_OPTIONS}
            value={data.currency || "BAM"}
            onChange={(v) => onUpdate({ currency: v })}
            placeholder="Select currency"
          />
        </div>
      </div>
    </div>
  );
}
