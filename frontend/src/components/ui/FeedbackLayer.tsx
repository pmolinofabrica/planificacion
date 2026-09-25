import { useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  dismissToast,
  getFeedbackSnapshot,
  resolveConfirm,
  subscribeFeedback,
  type ToastItem,
} from '../../lib/feedback';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './Button';

const TONE_STYLES: Record<ToastItem['tone'], { icon: typeof Info; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-600' },
  error: { icon: AlertTriangle, iconClass: 'text-red-600' },
  info: { icon: Info, iconClass: 'text-primary' },
};

export function FeedbackLayer() {
  const { toasts, confirmRequest } = useSyncExternalStore(
    subscribeFeedback,
    getFeedbackSnapshot,
    getFeedbackSnapshot,
  );

  return (
    <>
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const { icon: Icon, iconClass } = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              className="toast-item pointer-events-auto flex items-start gap-2 max-w-sm rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 shadow-lg"
            >
              <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
              <span className="text-sm leading-snug text-on-surface whitespace-pre-wrap break-words">
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar aviso"
                className="ml-1 shrink-0 rounded p-0.5 text-on-surface-variant hover:bg-outline-variant/20 hover:text-on-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={confirmRequest !== null} onOpenChange={(open) => { if (!open) resolveConfirm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmRequest?.title ?? 'Confirmar'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">
            {confirmRequest?.message}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => resolveConfirm(false)}
            >
              {confirmRequest?.cancelLabel ?? 'Cancelar'}
            </Button>
            <button
              type="button"
              autoFocus
              onClick={() => resolveConfirm(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                confirmRequest?.danger
                  ? 'bg-error text-on-error hover:opacity-90'
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              {confirmRequest?.confirmLabel ?? 'Aceptar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
