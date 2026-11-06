import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEMES, THEME_EVENT, applyTheme, saveTheme, storedTheme, systemTheme } from "../utils/themes";

const ThemeCtx = createContext(null);

/** Provides { theme, setTheme, themes }. Follows the OS light/dark setting until the user picks a theme. */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => storedTheme() || systemTheme());

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const onChange = () => { if (!storedTheme()) setThemeState(systemTheme()); };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback(id => { saveTheme(id); setThemeState(id); }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES }}>{children}</ThemeCtx.Provider>;
}

const FALLBACK = { theme: "porcelain", setTheme: () => {}, themes: THEMES };

export function useTheme() {
  return useContext(ThemeCtx) || FALLBACK;
}

/**
 * Reads CSS custom properties (e.g. ["chart-1", "text-tertiary"]) and re-reads
 * them whenever the theme changes. Use for libraries that need literal colours,
 * such as Recharts. Missing values fall back to `fallback[name]`.
 */
export function useThemeTokens(names, fallback = {}) {
  const key = names.join(",");
  const read = useCallback(() => {
    const styles = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
    return Object.fromEntries(key.split(",").map(n => [n, styles?.getPropertyValue(`--${n}`).trim() || fallback[n] || ""]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const [tokens, setTokens] = useState(read);
  useEffect(() => {
    const update = () => setTokens(read());
    update();
    window.addEventListener(THEME_EVENT, update);
    return () => window.removeEventListener(THEME_EVENT, update);
  }, [read]);
  return tokens;
}
