import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "4seas:theme";

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch { return null; }
}

/** Presenter surfaces default to dark; other views follow the device until the user chooses. */
export function useTheme(defaultTheme?: Theme) {
  const [theme, setThemeState] = useState<Theme>(() =>
    stored() ?? defaultTheme ?? (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171717" : "#f7f4ef");
  }, [theme]);

  // Other windows (e.g. the projector) follow a theme chosen in this origin's other tabs.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === KEY && (event.newValue === "dark" || event.newValue === "light")) setThemeState(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
