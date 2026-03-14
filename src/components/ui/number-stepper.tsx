"use client";

import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

export function NumberStepper({ value, onChange, min = 1, max = 99, suffix }: NumberStepperProps) {
  return (
    <div className="flex items-center rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-l-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex-1 text-center text-sm font-medium text-gray-900">
        {value} {suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-r-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
