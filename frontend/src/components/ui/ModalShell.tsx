import { useEffect, useState } from 'react';
import type { ReactNode, Ref } from 'react';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  /** Clases extra del overlay: alineación, fondo, blur, etc. */
  overlayClassName?: string;
  /** Clases extra del panel: ancho máximo, margen, overflow, etc. */
  panelClassName?: string;
  /** Ref opcional sobre el panel (para detección de clics externos). */
  panelRef?: Ref<HTMLDivElement>;
  /** Cerrar al hacer clic en el fondo. Por defecto sí. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Contenedor estándar de modales: gestiona el montaje, la animación de
 * entrada/salida y el cierre con Escape. El contenido debe quedar dentro y
 * puede seguir condicionado por su propio estado: mientras el modal está
 * abierto se conserva una copia del último contenido para que la salida no
 * muestre un panel vacío.
 */
export function ModalShell({
  open,
  onClose,
  overlayClassName = '',
  panelClassName = '',
  panelRef,
  dismissOnBackdrop = true,
  children,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [lastChildren, setLastChildren] = useState<ReactNode>(children);

  if (open && lastChildren !== children) {
    setLastChildren(children);
  }

  /* eslint-disable react-hooks/set-state-in-effect -- montaje/visibility sincronizados con open para animar entrada y salida */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      const t = window.setTimeout(() => setVisible(true), 20);
      return () => window.clearTimeout(t);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const state = visible ? 'true' : 'false';

  return (
    <div
      data-visible={state}
      role="dialog"
      aria-modal="true"
      onMouseDown={dismissOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      className={`modal-overlay fixed inset-0 z-50 ${overlayClassName}`}
    >
      <div
        ref={panelRef}
        data-visible={state}
        className={`modal-panel ${panelClassName}`}
      >
        {open ? children : lastChildren}
      </div>
    </div>
  );
}
