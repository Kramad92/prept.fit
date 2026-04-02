import { ThemeColors, type ThemeColorSet } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";

export function useThemeColors(): ThemeColorSet {
  const { isDark } = useTheme();
  return isDark ? ThemeColors.dark : ThemeColors.light;
}
