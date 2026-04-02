export const Colors = {
  brand: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  red: {
    50: "#fef2f2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
  },
  white: "#ffffff",
  black: "#000000",
} as const;

/**
 * Semantic color tokens for light and dark modes.
 * Use with `useThemeColors()` for icon tints and programmatic colors.
 *
 * Matches the webapp's dark mode palette:
 *   - surface-primary:   white / slate-800
 *   - surface-secondary: #F2F2F7 / slate-950
 *   - text-primary:      gray-900 / slate-50
 */
export const ThemeColors = {
  light: {
    background: "#f2f2f7",       // surface-secondary (iOS gray)
    card: "#ffffff",             // surface-primary
    cardElevated: "#ffffff",     // surface-elevated
    text: "#111827",             // gray-900
    textSecondary: "#4b5563",    // gray-600
    textTertiary: "#9ca3af",     // gray-400
    textMuted: "#6b7280",        // gray-500
    border: "#e5e7eb",           // gray-200
    borderLight: "#f3f4f6",      // gray-100
    icon: "#6b7280",             // gray-500
    iconMuted: "#9ca3af",        // gray-400
    brand: "#059669",            // brand-600
    brandLight: "#ecfdf5",       // brand-50
    destructive: "#dc2626",      // red-600
    tabBar: "#ffffff",
    tabBarBorder: "#e5e7eb",
    inputBg: "#ffffff",
    inputBorder: "#d1d5db",      // gray-300
    // Colored backgrounds for tags/badges
    blueBg: "#eff6ff",
    blueText: "#1d4ed8",
    purpleBg: "#faf5ff",
    purpleText: "#7e22ce",
    amberBg: "#fffbeb",
    amberText: "#b45309",
    greenBg: "#ecfdf5",
    greenText: "#047857",
    pinkBg: "#fdf2f8",
    pinkText: "#be185d",
    redBg: "#fef2f2",
    redText: "#b91c1c",
    // Icon tint colors
    blueIcon: "#3b82f6",
    purpleIcon: "#8b5cf6",
    amberIcon: "#f59e0b",
    pinkIcon: "#ec4899",
    tealIcon: "#14b8a6",
    indigoIcon: "#6366f1",
  },
  dark: {
    background: "#020617",       // slate-950 (surface-secondary)
    card: "#1e293b",             // slate-800 (surface-primary)
    cardElevated: "#334155",     // slate-700 (surface-elevated)
    text: "#f8fafc",             // slate-50
    textSecondary: "#cbd5e1",    // slate-300
    textTertiary: "#64748b",     // slate-500
    textMuted: "#94a3b8",        // slate-400
    border: "rgba(51,65,85,0.5)",     // slate-700/50
    borderLight: "rgba(51,65,85,0.4)", // slate-700/40
    icon: "#94a3b8",             // slate-400
    iconMuted: "#64748b",        // slate-500
    brand: "#34d399",            // brand-400 (lighter for dark bg)
    brandLight: "rgba(101,163,13,0.15)",
    destructive: "#ef4444",      // red-500
    tabBar: "#1e293b",           // slate-800
    tabBarBorder: "rgba(51,65,85,0.5)",
    inputBg: "#1e293b",          // slate-800
    inputBorder: "rgba(71,85,105,0.6)", // slate-600/60
    // Colored backgrounds for tags/badges (dark, low-opacity)
    blueBg: "rgba(30,58,138,0.25)",
    blueText: "#93c5fd",
    purpleBg: "rgba(88,28,135,0.2)",
    purpleText: "#d8b4fe",
    amberBg: "rgba(120,53,15,0.25)",
    amberText: "#fcd34d",
    greenBg: "rgba(20,83,45,0.25)",
    greenText: "#86efac",
    pinkBg: "rgba(131,24,67,0.2)",
    pinkText: "#f9a8d4",
    redBg: "rgba(127,29,29,0.25)",
    redText: "#fca5a5",
    // Icon tint colors
    blueIcon: "#60a5fa",
    purpleIcon: "#a78bfa",
    amberIcon: "#fbbf24",
    pinkIcon: "#f472b6",
    tealIcon: "#2dd4bf",
    indigoIcon: "#818cf8",
  },
} as const;

export type ThemeColorSet = { [K in keyof (typeof ThemeColors)["light"]]: string };
