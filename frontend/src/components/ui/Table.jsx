import React from "react";
import { cx } from "./cx";

/**
 * Data table with a horizontally scrollable wrapper and sticky header.
 * Cell helpers (className on <td>): cell-id, cell-primary, cell-wide,
 * cell-muted, cell-num, cell-actions, cell-tight.
 *
 * `label` names the scroll region for keyboard and screen-reader users.
 */
export function Table({ label, compact = false, minWidth, maxHeight, className, wrapClassName, children, ...rest }) {
  return (
    <div
      className={cx("table-wrap", wrapClassName)}
      style={maxHeight ? { maxHeight } : undefined}
      role={label ? "region" : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <table className={cx("table", compact && "table--compact", className)} style={minWidth ? { minWidth } : undefined} {...rest}>
        {children}
      </table>
    </div>
  );
}
