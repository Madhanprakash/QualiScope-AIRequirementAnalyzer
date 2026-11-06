import React from "react";
import { cx } from "./cx";

/**
 * Single-select filter rendered as toggle buttons (aria-pressed).
 * items: [{ id, label, count?, icon? }]
 */
export function FilterChips({ items, value, onChange, label, className }) {
  return (
    <div className={cx("chips", className)} role="group" aria-label={label}>
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button key={item.id} type="button" className="chip" aria-pressed={value === item.id} onClick={() => onChange(item.id)}>
            {Icon && <Icon size={14} aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && <span className="chip__count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
