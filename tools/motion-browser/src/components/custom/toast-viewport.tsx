import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

import { dismissToast, getToasts, subscribeToasts } from "@/lib/toast";

export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, () => []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex w-full max-w-lg items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm text-white shadow-xl ${
            toast.kind === "error" ? "bg-red-600" : "bg-grey-900"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
