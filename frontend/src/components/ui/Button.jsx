import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "./cx";

/**
 * Button.
 * variant: "primary" | "secondary" | "ghost" | "soft" | "danger" | "danger-soft"
 * size:    "sm" | "md" | "lg"
 * icon / iconRight: lucide icon components rendered before / after the label.
 */
export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading = false, block = false, type = "button", className, disabled, children, ...rest },
  ref
) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button
      ref={ref}
      type={type}
      className={cx("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, block && "btn--block", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="btn__spinner" size={iconSize} aria-hidden="true" /> : Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
    </button>
  );
});

/** Square, icon-only button. `label` becomes the accessible name and tooltip. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "md", className, title, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, "btn--icon", className)}
      aria-label={label}
      title={title === undefined ? label : title || undefined}
      {...rest}
    >
      <Icon size={size === "sm" ? 15 : 17} aria-hidden="true" />
    </button>
  );
});
