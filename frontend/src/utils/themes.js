/*
 * Theme registry. The palettes themselves are CSS (src/styles/themes.css);
 * this module only chooses which one is active via <html data-theme="…">.
 */
export const THEMES = [
  { id: "porcelain", label: "Porcelain", description: "Clean light, indigo accent", mode: "light", swatch: { sidebar: "#ffffff", bg: "#f6f7f9", surface: "#ffffff", accent: "#4f46e5", line: "#e4e7ec" } },
  { id: "midnight", label: "Midnight", description: "Deep dark, iris accent", mode: "dark", swatch: { sidebar: "#0c0d11", bg: "#0a0b0f", surface: "#111318", accent: "#6e6ade", line: "#2a2e38" } },
  { id: "navy", label: "Navy", description: "Navy sidebar, light workspace", mode: "light", swatch: { sidebar: "#0b1730", bg: "#f4f6fa", surface: "#ffffff", accent: "#2563eb", line: "#e2e8f0" } },
  { id: "graphite", label: "Graphite", description: "Charcoal with gold accent", mode: "dark", swatch: { sidebar: "#111214", bg: "#0e0f11", surface: "#16171a", accent: "#e8a33d", line: "#2c2e33" } },
  { id: "evergreen", label: "Evergreen", description: "Forest sidebar, light workspace", mode: "light", swatch: { sidebar: "#0b2a22", bg: "#f4f7f6", surface: "#ffffff", accent: "#047857", line: "#dfe7e3" } }
];

export const THEME_KEY = "qs_theme";
export const THEME_EVENT = "qs:themechange";

const isTheme = id => THEMES.some(t => t.id === id);

/** System preference: Midnight for dark mode, Porcelain otherwise. */
export function systemTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "midnight" : "porcelain";
  } catch {
    return "porcelain";
  }
}

/** The theme the user picked, or null when they have not chosen one. */
export function storedTheme() {
  try {
    const id = localStorage.getItem(THEME_KEY);
    return isTheme(id) ? id : null;
  } catch {
    return null;
  }
}

export function savedTheme() {
  return storedTheme() || systemTheme();
}

export function saveTheme(id) {
  try {
    if (isTheme(id)) localStorage.setItem(THEME_KEY, id);
  } catch { /* storage unavailable: theme still applies for this visit */ }
}

/** Activates a theme and notifies listeners (charts re-read their colours). */
export function applyTheme(id) {
  const theme = THEMES.find(t => t.id === id) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const color = getComputedStyle(root).getPropertyValue("--theme-color").trim();
    if (color) meta.setAttribute("content", color);
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme.id }));
  return theme.id;
}
