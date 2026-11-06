import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import { cx } from "./cx";

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"
].join(",");

// Active traps, innermost last. Only the top one reacts to keys, so a dialog
// opened from the mobile navigation drawer does not fight the drawer's trap.
const trapStack = [];

/**
 * Keeps keyboard focus inside `ref` while `active`, moves focus in on open,
 * calls onEscape on Esc and restores focus to the previously focused element.
 * Keys are handled at document level, so the trap still works if focus falls
 * back to <body> (e.g. when the focused submit button becomes disabled).
 */
export function useFocusTrap(ref, active, { onEscape, initialFocus } = {}) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const token = {};
    trapStack.push(token);
    const previous = document.activeElement;
    const focusables = () => [...node.querySelectorAll(FOCUSABLE)].filter(el => !el.closest("[inert]"));

    if (!node.contains(document.activeElement)) {
      const target = initialFocus?.current || node.querySelector("[data-autofocus]") || focusables()[0] || node;
      target.focus({ preventScroll: true });
    }

    const onKeyDown = e => {
      if (trapStack[trapStack.length - 1] !== token) return;
      if (e.key === "Escape") {
        escapeRef.current?.(e);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (!node.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trapStack.splice(trapStack.indexOf(token), 1);
      if (previous && typeof previous.focus === "function" && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active, ref, initialFocus]);
}

/** Locks page scroll while `active`. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [active]);
}

/**
 * Accessible dialog rendered in a portal.
 * size: "sm" | "md" | "lg" | "xl" | "full".  On phones it becomes a bottom sheet.
 * Use as="form" + onSubmit to make the footer's submit button submit the dialog.
 */
export function Modal({
  open = true, onClose, title, description, size = "md", footer, footerAlign = "end", children,
  ariaLabel, closeLabel = "Close", hideClose = false, initialFocus, closeOnBackdrop = true,
  as: Panel = "div", className, bodyClassName, ...panelProps
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, open, { onEscape: () => onClose?.(), initialFocus });
  useScrollLock(open);
  if (!open) return null;

  return createPortal(
    <div className={cx("modal", `modal--${size}`, className)}>
      <div className="modal__backdrop" aria-hidden="true" onClick={() => closeOnBackdrop && onClose?.()} />
      <Panel
        ref={panelRef}
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        {...panelProps}
      >
        {(title || !hideClose) && (
          <div className="modal__header">
            <div className="modal__heading">
              {title && <h2 id={titleId} className="modal__title">{title}</h2>}
              {description && <p id={descId} className="modal__desc">{description}</p>}
            </div>
            {!hideClose && <IconButton icon={X} label={closeLabel} size="sm" onClick={() => onClose?.()} />}
          </div>
        )}
        <div className={cx("modal__body", bodyClassName)}>{children}</div>
        {footer && <div className={cx("modal__footer", footerAlign === "between" && "modal__footer--between")}>{footer}</div>}
      </Panel>
    </div>,
    document.body
  );
}
