import { X, History, ArrowRight, User } from 'lucide-react';
import { useHistorialCambio } from '../../hooks/useCambiosTurno';
import { aFormatoFecha } from '../../lib/fecha-utils';
import { ModalShell } from '../ui/ModalShell';
import { Button } from '../ui/Button';

interface HistorialCambioModalProps {
  isOpen: boolean;
  idTransaccion: number | null;
  onClose: () => void;
}

const formatearFecha = aFormatoFecha;

export default function HistorialCambioModal({ isOpen, idTransaccion, onClose }: HistorialCambioModalProps) {
  const { data: registros = [], isLoading } = useHistorialCambio(isOpen ? idTransaccion : null);

  const nombreResidente = (nombre: string | null, apellido: string | null, id: number | null) => {
    if (nombre && apellido) return `${nombre} ${apellido.charAt(0).toUpperCase()}.`;
    return id ? `ID: ${id}` : 'Desconocido';
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      overlayClassName="flex items-center justify-center bg-black/30"
      panelClassName="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto"
    >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Historial de cambios</h2>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 rounded-lg hover:bg-outline-variant/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-on-surface-variant">
            Transacción #{idTransaccion} — Registro de quién cubre cada convocatoria
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-outline-variant/10 animate-pulse" />
              ))}
            </div>
          ) : registros.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant text-sm">
              Sin registros de cambio para esta transacción.
            </p>
          ) : (
            <div className="space-y-3">
              {registros.map((r) => (
                <div key={r.id_hist} className="p-3 rounded-lg border border-outline-variant/20 bg-surface">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Convocatoria #{r.id_convocatoria}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
                      {r.tipo_cambio || 'cambio'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <User className="h-3.5 w-3.5" />
                      {nombreResidente(r.nombre_anterior, r.apellido_anterior, r.id_agente_anterior)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="flex items-center gap-1 font-medium">
                      <User className="h-3.5 w-3.5" />
                      {nombreResidente(r.nombre_nuevo, r.apellido_nuevo, r.id_agente_nuevo)}
                    </span>
                  </div>
                  {r.motivo && <p className="text-xs text-on-surface-variant mt-1">{r.motivo}</p>}
                  <div className="flex items-center justify-between mt-2 text-xs text-on-surface-variant">
                    <span>{formatearFecha(r.fecha_cambio)}</span>
                    {r.usuario_responsable && <span>por {r.usuario_responsable}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-outline-variant/20">
          <Button
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            Cerrar
          </Button>
        </div>
    </ModalShell>
  );
}
