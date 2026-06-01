import { useEffect } from 'react';
import type { ReactNode } from 'react';

type ModuleDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export default function ModuleDrawer({ isOpen, onClose, title, children }: ModuleDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 h-screen w-full sm:w-[28rem] md:w-[34rem] z-[70] bg-surface shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 bg-on-secondary-fixed text-white">
          <h2 className="font-headline uppercase tracking-widest text-xs font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar panel"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {children}
        </div>
      </aside>
    </>
  );
}
