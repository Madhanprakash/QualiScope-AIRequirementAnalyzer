import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { IconButton } from "./Button";
import { cx } from "./cx";

/** Bottom-right notification area. `toast` is { id, message, kind: "ok" | "error" } or null. */
export function ToastViewport({ toast, onDismiss }) {
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className={cx("toast", toast.kind === "error" && "toast--error")} role={toast.kind === "error" ? "alert" : "status"}>
          {toast.kind === "error"
            ? <AlertCircle className="toast__icon" size={18} aria-hidden="true" />
            : <CheckCircle2 className="toast__icon" size={18} aria-hidden="true" />}
          <div className="toast__message">{toast.message}</div>
          <IconButton icon={X} label="Dismiss notification" size="sm" onClick={onDismiss} />
        </div>
      )}
    </div>
  );
}
