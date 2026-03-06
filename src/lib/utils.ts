import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ExerciseInput } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BAM: "KM",
  EUR: "€",
  USD: "$",
  GBP: "£",
  RSD: "RSD",
  HRK: "kn",
  CHF: "CHF",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function formatCurrency(amount: number, currency: string = "BAM"): string {
  const symbol = getCurrencySymbol(currency);
  // European format: amount + symbol (e.g. "150,00 KM")
  if (["BAM", "EUR", "RSD", "HRK", "CHF"].includes(currency)) {
    return `${amount.toFixed(2)} ${symbol}`;
  }
  // US/UK format: symbol + amount (e.g. "$150.00")
  return `${symbol}${amount.toFixed(2)}`;
}

export function getWeightUnit(units: string): string {
  return units === "imperial" ? "lbs" : "kg";
}

export function getLengthUnit(units: string): string {
  return units === "imperial" ? "in" : "cm";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function createEmptyExercise(): ExerciseInput {
  return {
    tempId: Math.random().toString(36).slice(2),
    name: "",
    sets: "3",
    reps: "8-12",
    weight: "",
    restSeconds: "60",
    notes: "",
    videoUrl: "",
  };
}
