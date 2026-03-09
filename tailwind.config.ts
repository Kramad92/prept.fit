import type { Config } from "tailwindcss";

/** Helper: reference a CSS custom property as an RGB color with alpha support */
function brandColor(shade: string) {
  return `rgb(var(--brand-${shade}) / <alpha-value>)`;
}
function accentColor(shade: string) {
  return `rgb(var(--accent-${shade}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: brandColor("50"),
          100: brandColor("100"),
          200: brandColor("200"),
          300: brandColor("300"),
          400: brandColor("400"),
          500: brandColor("500"),
          600: brandColor("600"),
          700: brandColor("700"),
          800: brandColor("800"),
          900: brandColor("900"),
          950: brandColor("950"),
        },
        accent: {
          50: accentColor("50"),
          100: accentColor("100"),
          200: accentColor("200"),
          300: accentColor("300"),
          400: accentColor("400"),
          500: accentColor("500"),
          600: accentColor("600"),
          700: accentColor("700"),
          800: accentColor("800"),
          900: accentColor("900"),
          950: accentColor("950"),
        },
        // Semantic surface colors (swap automatically in dark mode via CSS vars)
        surface: {
          primary: "rgb(var(--surface-primary) / <alpha-value>)",
          secondary: "rgb(var(--surface-secondary) / <alpha-value>)",
          elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
