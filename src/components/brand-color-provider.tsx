"use client";

import { useEffect } from "react";

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(hex: string): Record<string, string> {
  const { h, s } = hexToHSL(hex);
  const shades: [string, number][] = [
    ["50", 97],
    ["100", 94],
    ["200", 86],
    ["300", 74],
    ["400", 60],
    ["500", 46],
    ["600", 39],
    ["700", 32],
    ["800", 26],
    ["900", 20],
    ["950", 10],
  ];
  const palette: Record<string, string> = {};
  for (const [key, l] of shades) {
    palette[key] = hslToHex(h, Math.min(s, key === "50" ? 40 : s), l);
  }
  return palette;
}

export function BrandColorProvider() {
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.brandColor) {
          const palette = generatePalette(data.brandColor);
          const root = document.documentElement;
          for (const [shade, color] of Object.entries(palette)) {
            root.style.setProperty(`--brand-${shade}`, color);
          }
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
