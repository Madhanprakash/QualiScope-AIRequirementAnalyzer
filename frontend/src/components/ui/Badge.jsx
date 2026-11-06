import React from "react";
import { cx } from "./cx";

/**
 * Small status label.
 * tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info"
 * tag:  compact uppercase-style tag (e.g. ASSUMPTION, EDITED)
 */
export function Badge({ tone = "neutral", variant, dot = false, square = false, tag = false, className, children, ...rest }) {
  return (
    <span
      className={cx("badge", `badge--${tone}`, variant === "outline" && "badge--outline", square && "badge--square", tag && "badge--tag", className)}
      {...rest}
    >
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Keyboard key hint, e.g. <Kbd>Ctrl K</Kbd>. */
export function Kbd({ children, className }) {
  return <kbd className={cx("kbd", className)}>{children}</kbd>;
}

/** Initials avatar with the theme's brand gradient. Decorative by default. */
export function Avatar({ name = "", size = "md", square = false, className, label }) {
  const initials = String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "QA";
  return (
    <span
      className={cx("avatar", size === "sm" && "avatar--sm", square && "avatar--square", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {initials}
    </span>
  );
}
