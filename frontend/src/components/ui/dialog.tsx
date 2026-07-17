import { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onOpenChange(false);
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onOpenChange]);

  return (
    <dialog
      ref={ref}
      className="bg-transparent backdrop:bg-black/40 p-0 max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl open:flex"
      onClick={(e) => { if (e.target === ref.current) onOpenChange(false); }}
    >
      {children}
    </dialog>
  );
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  return (
    <div className={`bg-surface-container-lowest text-on-surface rounded-2xl w-full ${className}`}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-2 border-b border-outline-variant/20">
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
}

export function DialogTitle({ children }: DialogTitleProps) {
  return (
    <h2 className="text-lg font-bold text-on-surface font-headline">
      {children}
    </h2>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
}

export function DialogFooter({ children }: DialogFooterProps) {
  return (
    <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-end gap-2">
      {children}
    </div>
  );
}
