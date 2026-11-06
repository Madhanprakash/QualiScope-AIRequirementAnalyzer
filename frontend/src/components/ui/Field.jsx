import React, { cloneElement, forwardRef, isValidElement, useEffect, useId, useRef } from "react";
import { AlertCircle, ChevronDown, Search } from "lucide-react";
import { cx } from "./cx";

/**
 * Labelled form control. Wires the label, hint and error to the single child
 * control via id / aria-describedby / aria-invalid.
 *
 *   <Field label="Item Title" htmlFor="title"><Input id="title" … /></Field>
 *
 * Keep `label` plain text: tests and assistive tech match on it exactly.
 */
export function Field({ label, hint, error, htmlFor, className, children }) {
  const autoId = useId().replace(/:/g, "");
  const child = isValidElement(children) ? children : null;
  const id = htmlFor || child?.props.id || `field-${autoId}`;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child?.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = child
    ? cloneElement(child, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : child.props["aria-invalid"] })
    : children;

  return (
    <div className={cx("field", className)}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      {control}
      {hint && !error && <p id={hintId} className="field__hint">{hint}</p>}
      {error && <p id={errorId} className="field__error"><AlertCircle size={13} aria-hidden="true" />{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ size = "md", className, ...rest }, ref) {
  return <input ref={ref} className={cx("input", size === "sm" && "input--sm", className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ size = "md", className, ...rest }, ref) {
  return <textarea ref={ref} className={cx("textarea", size === "sm" && "textarea--sm", className)} {...rest} />;
});

/** Native <select> with a custom chevron. All props (aria-label, value…) go to the <select>. */
export const Select = forwardRef(function Select({ size = "md", className, wrapperClassName, children, ...rest }, ref) {
  return (
    <span className={cx("select-wrap", wrapperClassName)}>
      <select ref={ref} className={cx("select", size === "sm" && "select--sm", className)} {...rest}>{children}</select>
      <ChevronDown className="select-wrap__icon" size={16} aria-hidden="true" />
    </span>
  );
});

/** Search box with a leading icon. Pass aria-label (or wrap in a Field). */
export const SearchInput = forwardRef(function SearchInput({ wrapperClassName, ...rest }, ref) {
  return (
    <span className={cx("search", wrapperClassName)}>
      <Search className="search__icon" size={15} aria-hidden="true" />
      <Input ref={ref} type="search" autoComplete="off" {...rest} />
    </span>
  );
});

/** Native checkbox in the accent colour; supports the indeterminate state. */
export const Checkbox = forwardRef(function Checkbox({ indeterminate = false, className, ...rest }, ref) {
  const inner = useRef(null);
  useEffect(() => { if (inner.current) inner.current.indeterminate = indeterminate; }, [indeterminate]);
  const setRef = node => {
    inner.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  return <input ref={setRef} type="checkbox" className={cx("checkbox", className)} {...rest} />;
});
