export type FeedbackTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: FeedbackTone;
  message: string;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface FeedbackSnapshot {
  toasts: ToastItem[];
  confirmRequest: ConfirmRequest | null;
}

let toasts: ToastItem[] = [];
let confirmRequest: ConfirmRequest | null = null;
let snapshot: FeedbackSnapshot = { toasts, confirmRequest };
let nextId = 1;
let confirmResolve: ((ok: boolean) => void) | null = null;
const timers = new Map<number, number>();
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { toasts, confirmRequest };
  listeners.forEach((listener) => listener());
}

export function subscribeFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFeedbackSnapshot(): FeedbackSnapshot {
  return snapshot;
}

export function notify(message: string, tone: FeedbackTone = 'info'): void {
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }];
  emit();
  const duration = tone === 'error' ? 6000 : 4000;
  const timer = window.setTimeout(() => dismissToast(id), duration);
  timers.set(id, timer);
}

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer) window.clearTimeout(timer);
  timers.delete(id);
  if (!toasts.some((toast) => toast.id === id)) return;
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function confirmDialog(request: ConfirmRequest): Promise<boolean> {
  if (confirmResolve) resolveConfirm(false);
  confirmRequest = request;
  emit();
  return new Promise<boolean>((resolve) => {
    confirmResolve = resolve;
  });
}

export function resolveConfirm(ok: boolean): void {
  const resolver = confirmResolve;
  confirmResolve = null;
  confirmRequest = null;
  emit();
  resolver?.(ok);
}
