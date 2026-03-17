"use client";

import { useState, useEffect } from "react";
import { Palette } from "lucide-react";

const palettes = [
  {
    name: "Apple iOS",
    desc: "Cool blue-violet tint",
    surface: { primary: "255 255 255", secondary: "242 242 247", elevated: "255 255 255" },
    html: "#f2f2f7",
  },
  {
    name: "Warm Cream",
    desc: "Warm yellow undertone",
    surface: { primary: "250 250 248", secondary: "245 245 242", elevated: "252 252 250" },
    html: "#f5f5f2",
  },
  {
    name: "Notion",
    desc: "Neutral true gray",
    surface: { primary: "255 255 255", secondary: "247 247 245", elevated: "255 255 255" },
    html: "#f7f7f5",
  },
  {
    name: "Linear",
    desc: "Slate cool gray",
    surface: { primary: "252 252 253", secondary: "245 246 248", elevated: "255 255 255" },
    html: "#f5f6f8",
  },
  {
    name: "Zinc",
    desc: "Perfectly neutral",
    surface: { primary: "250 250 250", secondary: "244 244 245", elevated: "255 255 255" },
    html: "#f4f4f5",
  },
  {
    name: "Snow",
    desc: "Barely-there warmth",
    surface: { primary: "253 253 252", secondary: "248 248 246", elevated: "255 255 255" },
    html: "#f8f8f6",
  },
  {
    name: "Stone",
    desc: "Darker, paper-like",
    surface: { primary: "243 243 240", secondary: "235 235 230", elevated: "248 248 245" },
    html: "#ebebea",
  },
];

export function PaletteSwitcher() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("palette-index");
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (idx >= 0 && idx < palettes.length) {
        setActive(idx);
        applyPalette(idx);
      }
    }
  }, []);

  function applyPalette(idx: number) {
    const p = palettes[idx];
    const root = document.documentElement;
    // Only apply in light mode
    if (root.classList.contains("dark")) return;
    root.style.setProperty("--surface-primary", p.surface.primary);
    root.style.setProperty("--surface-secondary", p.surface.secondary);
    root.style.setProperty("--surface-elevated", p.surface.elevated);
    root.style.backgroundColor = p.html;
  }

  function selectPalette(idx: number) {
    setActive(idx);
    localStorage.setItem("palette-index", String(idx));
    applyPalette(idx);
  }

  if (!mounted) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
        title="Switch light mode palette"
      >
        <Palette className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{palettes[active].name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Light Mode Palette</p>
            </div>
            <div className="p-1.5">
              {palettes.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => { selectPalette(i); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === active
                      ? "bg-brand-50 text-brand-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {/* Color preview */}
                  <div className="flex shrink-0 gap-0.5">
                    <div
                      className="h-6 w-4 rounded-l-md border border-gray-200"
                      style={{ backgroundColor: `rgb(${p.surface.secondary})` }}
                    />
                    <div
                      className="h-6 w-4 rounded-r-md border border-gray-200"
                      style={{ backgroundColor: `rgb(${p.surface.primary})` }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.desc}</p>
                  </div>
                  {i === active && (
                    <svg className="ml-auto h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
