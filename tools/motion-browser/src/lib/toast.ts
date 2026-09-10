export interface Toast {
  id: number;
  message: string;
  kind: "error" | "info";
}

type Listener = () => void;

let nextId = 0;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getToasts(): Toast[] {
  return toasts;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
}

export function showToast(message: string, kind: Toast["kind"] = "info"): void {
  const toast = { id: nextId++, message, kind } satisfies Toast;
  toasts = [...toasts, toast];
  notify();
  window.setTimeout(() => dismissToast(toast.id), 6000);
}

export const toast = {
  error: (message: string) => showToast(message, "error"),
  info: (message: string) => showToast(message, "info"),
};
