import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Info, Loader2 } from "lucide-react";
import { cx } from "./cx";

const ALERT_ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle, neutral: Info };

/**
 * Inline message. tone: "info" | "success" | "warning" | "danger" | "neutral".
 * Pass role="alert" for errors that must be announced immediately.
 */
export function Alert({ tone = "info", title, icon, action, className, children, ...rest }) {
  const Icon = icon === null ? null : icon || ALERT_ICONS[tone];
  return (
    <div className={cx("alert", tone !== "neutral" && `alert--${tone}`, className)} {...rest}>
      {Icon && <Icon className="alert__icon" size={16} aria-hidden="true" />}
      <div className="alert__content">
        {title && <div className="alert__title">{title}</div>}
        {children && <div className="alert__body">{children}</div>}
      </div>
      {action && <div className="alert__action">{action}</div>}
    </div>
  );
}

/** Inline loading indicator announced to screen readers (role="status"). */
export function Spinner({ label = "Loading…", size = 16, className }) {
  return (
    <span className={cx("spinner", className)} role="status">
      <Loader2 size={size} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Shimmering placeholder block. */
export function Skeleton({ width = "100%", height = 14, radius, className, style }) {
  return <span className={cx("skeleton", className)} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/** Friendly placeholder for empty lists and missing data. */
export function EmptyState({ icon: Icon = Inbox, title, titleAs: Title = "p", description, action, compact = false, className }) {
  return (
    <div className={cx("empty", compact && "empty--compact", className)}>
      {Icon && <span className="empty__icon"><Icon size={22} aria-hidden="true" /></span>}
      {title && <Title className="empty__title">{title}</Title>}
      {description && <p className="empty__desc">{description}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

/** Determinate progress bar. tone: any colour token name, e.g. "success". */
export function ProgressBar({ value, max = 100, label, tone, className }) {
  const pct = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx("progress", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="progress__bar" style={{ width: `${pct}%`, background: tone ? `var(--${tone})` : undefined }} />
    </div>
  );
}
