import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "halloween";
const KEY = "4seas:theme";
/** Order the toggle cycles through. */
export const THEMES: readonly Theme[] = ["dark", "light", "halloween"];
const META_COLOR: Record<Theme, string> = { dark: "#171717", light: "#f7f4ef", halloween: "#120e14" };

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return isTheme(value) ? value : null;
  } catch { return null; }
}

/** The festive theme switches itself on for Halloween week (20 Oct – 2 Nov) until someone picks a theme. */
export function seasonalTheme(date: Date = new Date()): Theme | null {
  const month = date.getMonth();
  const day = date.getDate();
  return (month === 9 && day >= 20) || (month === 10 && day <= 2) ? "halloween" : null;
}

export const nextTheme = (theme: Theme): Theme => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

/** A chosen theme wins, then the season; presenter surfaces otherwise default to dark and other views follow the device. */
export function useTheme(defaultTheme?: Theme) {
  const [theme, setThemeState] = useState<Theme>(() =>
    stored() ?? seasonalTheme() ?? defaultTheme ?? (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
  }, [theme]);

  // Other windows (e.g. the projector) follow a theme chosen in this origin's other tabs.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === KEY && isTheme(event.newValue)) setThemeState(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
  }, []);

  return { theme, setTheme, toggle: () => setTheme(nextTheme(theme)) };
}
