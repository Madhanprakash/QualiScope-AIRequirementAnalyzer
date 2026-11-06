import React from "react";
import { cx } from "./cx";

/**
 * KPI tile. tone colours the icon: "accent" | "success" | "warning" | "danger" | "info" | "neutral".
 * `children` renders below the value (e.g. a mini progress bar).
 */
export function StatCard({ icon: Icon, label, value, hint, tone = "accent", className, children }) {
  return (
    <div className={cx("stat", className)}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        {Icon && (
          <span className={cx("stat__icon", tone !== "accent" && `stat__icon--${tone}`)}>
            <Icon size={17} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="stat__value">{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
      {children}
    </div>
  );
}
