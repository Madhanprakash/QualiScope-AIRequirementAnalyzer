import React from "react";
import { cx } from "./cx";

/**
 * Surface container.
 * padded: inner padding (default). flush: no padding, children reach the edges
 * (use with CardHeader + Table so the table spans the full width).
 */
export function Card({ as: Tag = "section", padded = true, flush = false, interactive = false, className, children, ...rest }) {
  return (
    <Tag className={cx("card", padded && !flush && "card--padded", flush && "card--flush", interactive && "card--interactive", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Title row for a Card: optional eyebrow, title, description and right-aligned actions. */
export function CardHeader({ eyebrow, title, description, actions, icon: Icon, titleAs: Title = "h2", titleId, className }) {
  return (
    <div className={cx("card__header", className)}>
      <div className="card__heading">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && <Title id={titleId} className="card__title">{Icon && <Icon size={17} aria-hidden="true" />}{title}</Title>}
        {description && <p className="card__desc">{description}</p>}
      </div>
      {actions && <div className="card__actions">{actions}</div>}
    </div>
  );
}

/** Padded block inside a flush Card; consecutive sections get a divider. */
export function CardSection({ className, children, ...rest }) {
  return <div className={cx("card__section", className)} {...rest}>{children}</div>;
}

/** Muted footer row, typically counts on the left and notes or actions on the right. */
export function CardFooter({ className, children, ...rest }) {
  return <div className={cx("card__footer", className)} {...rest}>{children}</div>;
}
