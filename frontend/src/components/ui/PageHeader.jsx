import React from "react";
import { cx } from "./cx";

/**
 * Top-of-page heading block (the page's only <h1>).
 * accent: optional trailing words rendered with the theme's brand gradient.
 * meta:   badges under the description. actions: buttons aligned right.
 */
export function PageHeader({ eyebrow, title, accent, description, meta, actions, className }) {
  return (
    <div className={cx("page-header", className)}>
      <div className="page-header__main">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-header__title">
          {title}
          {accent && <>{" "}<span className="page-header__accent">{accent}</span></>}
        </h1>
        {description && <p className="page-header__desc">{description}</p>}
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
