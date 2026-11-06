import React, { forwardRef, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cx } from "./cx";

/**
 * Closes a popover on outside pointer-down or Esc. On Esc, focus returns to
 * `returnFocusRef` (normally the trigger button).
 */
export function useDismiss(ref, open, onClose, returnFocusRef) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = e => { if (ref.current && !ref.current.contains(e.target)) closeRef.current(); };
    // Capture phase + stopPropagation: Esc closes only the popover, not a drawer
    // or dialog that contains it.
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeRef.current();
      returnFocusRef?.current?.focus();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, ref, returnFocusRef]);
}

/** Arrow-key / Home / End navigation between menu items; focuses the checked or first item on open. */
function useMenuKeys(ref, open) {
  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const node = ref.current;
    const items = () => [...node.querySelectorAll("[role^='menuitem']:not([disabled])")];
    const start = node.querySelector("[aria-checked='true']") || items()[0];
    start?.focus({ preventScroll: true });
    const onKey = e => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      let next = null;
      if (e.key === "ArrowDown") next = list[(i + 1) % list.length];
      else if (e.key === "ArrowUp") next = list[(i - 1 + list.length) % list.length];
      else if (e.key === "Home") next = list[0];
      else if (e.key === "End") next = list[list.length - 1];
      if (next) { e.preventDefault(); next.focus(); }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [open, ref]);
}

/** Floating panel positioned under its `.popover-anchor` parent. role="menu" enables arrow keys. */
export const Popover = forwardRef(function Popover({ open, align = "end", role = "menu", className, children, ...rest }, ref) {
  const own = useRef(null);
  const panelRef = ref || own;
  useMenuKeys(panelRef, open && role === "menu");
  if (!open) return null;
  return (
    <div ref={panelRef} className={cx("popover", `popover--${align}`, className)} role={role} {...rest}>
      {children}
    </div>
  );
});

/** Menu row. Pass `checked` (boolean) to render it as a radio item with a check mark. */
export const MenuItem = forwardRef(function MenuItem({ icon: Icon, checked, className, children, role, ...rest }, ref) {
  const itemRole = role || (checked === undefined ? "menuitem" : "menuitemradio");
  return (
    <button
      ref={ref}
      type="button"
      role={itemRole}
      aria-checked={checked === undefined ? undefined : checked}
      tabIndex={-1}
      className={cx("menu__item", className)}
      {...rest}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
      {checked && <Check size={15} className="menu__item-check" aria-hidden="true" />}
    </button>
  );
});

export function MenuLabel({ children }) {
  return <div className="menu__label" role="presentation">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu__sep" role="separator" />;
}
