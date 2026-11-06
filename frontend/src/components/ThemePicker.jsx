import React, { useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { IconButton, MenuItem, MenuLabel, Popover, useDismiss } from "./ui";

/** Miniature of a theme: sidebar strip, workspace and accent dot. Colours are theme data, not styling. */
export function ThemeSwatch({ theme }) {
  const s = theme.swatch;
  return (
    <span className="theme-swatch" aria-hidden="true" style={{ background: s.bg }}>
      <span style={{ background: s.sidebar }} />
      <span />
      <span className="theme-swatch__dot" style={{ background: s.accent }} />
    </span>
  );
}

/** Top-bar palette button with a menu of the five themes. */
export function ThemeMenu() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  useDismiss(wrapRef, open, () => setOpen(false), triggerRef);

  const pick = id => {
    setTheme(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="popover-anchor" ref={wrapRef}>
      <IconButton ref={triggerRef} icon={Palette} label="Change theme" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} />
      <Popover open={open} align="end" className="theme-menu" aria-label="Theme">
        <MenuLabel>Theme</MenuLabel>
        {themes.map(t => (
          <MenuItem key={t.id} checked={theme === t.id} className="theme-option" onClick={() => pick(t.id)}>
            <ThemeSwatch theme={t} />
            <span className="theme-option__text">
              {t.label}
              <span className="theme-option__desc">{t.description}</span>
            </span>
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
}

/** Theme cards for the Settings page (radio group with arrow-key support). */
export function ThemeOptions() {
  const { theme, setTheme, themes } = useTheme();
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + themes.length) % themes.length;
    setTheme(themes[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="theme-grid" role="radiogroup" aria-label="Theme">
      {themes.map((t, i) => {
        const selected = theme === t.id;
        return (
          <button
            key={t.id}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="theme-card"
            onClick={() => setTheme(t.id)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            <span className="theme-card__preview" aria-hidden="true" style={{ background: t.swatch.bg }}>
              <span style={{ background: t.swatch.sidebar }} />
              <span className="theme-card__preview-main">
                <span className="theme-card__preview-bar" style={{ background: t.swatch.accent, width: "42%" }} />
                <span className="theme-card__preview-bar" style={{ background: t.swatch.line, width: "86%" }} />
                <span className="theme-card__preview-bar" style={{ background: t.swatch.line, width: "64%" }} />
              </span>
            </span>
            <span className="theme-card__label">
              {t.label}
              {selected && <Check size={15} className="text-accent" aria-hidden="true" />}
            </span>
            <span className="theme-card__desc">{t.description}</span>
          </button>
        );
      })}
    </div>
  );
}
