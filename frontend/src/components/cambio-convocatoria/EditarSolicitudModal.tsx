import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Save, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { obtenerUsuarioActual } from '../../lib/auth-utils';
import { useEditarCambio } from '../../hooks/useCambiosTurno';
import { CAMBIO_ESTADO_LABELS } from '../../types/cambios';
import type { CambioListado } from '../../types/cambios';

interface Agente {
  id_agente: number;
  nombre: string;
  apellido: string;
  dni: string;
}

interface Convocatoria {
  id_convocatoria: number;
  id_agente: number;
  id_turno: number;
  fecha_turno: string;
  tipo_turno: string;
}

interface EditarSolicitudModalProps {
  isOpen: boolean;
  solicitud: CambioListado | null;
  onClose: () => void;
}

const hoy = new Date().toISOString().slice(0, 10);

const normalizarTurno = (tipo: string): string => {
  if (/capacitacion/i.test(tipo)) return 'Capacitación';
  if (/mañana|manana/i.test(tipo)) return 'Turno Mañana';
  if (/tarde/i.test(tipo)) return 'Turno Tarde';
  if (/apertura|público|publico/i.test(tipo)) return 'Apertura al Público';
  return tipo;
};

export default function EditarSolicitudModal({ isOpen, solicitud, onClose }: EditarSolicitudModalProps) {
  const editar = useEditarCambio();
  const modalRef = useRef<HTMLDivElement>(null);
  const [observaciones, setObservaciones] = useState('');
  const [convOrig, setConvOrig] = useState<Convocatoria | null>(null);
  const [convNueva, setConvNueva] = useState<Convocatoria | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isOpen && solicitud) {
      setObservaciones(solicitud.observaciones || '');
      setConvOrig(null);
      setConvNueva(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, solicitud?.id_transaccion]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const { data: agentes = [] } = useQuery({
    queryKey: ['agentes-activos-editar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('datos_personales' as any)
        .select('id_agente, nombre, apellido, dni')
        .eq('activo', true)
        .eq('cohorte', currentYear)
        .order('apellido');
      if (error) throw error;
      return (data || []) as Agente[];
    },
    enabled: isOpen,
  });

  const { data: convOrigenes = [] } = useQuery({
    queryKey: ['convocatorias-edit-orig', convOrig?.id_agente, solicitud?.id_convocatoria_original],
    queryFn: async () => {
      const id = convOrig?.id_agente ?? solicitud?.id_agente_original;
      const { data, error } = await supabase
        .from('vista_convocatoria_completa' as any)
        .select('*')
        .eq('id_agente', id)
        .gte('fecha_turno', hoy)
        .order('fecha_turno');
      if (error) throw error;
      return (data || []).filter((c: Convocatoria) => !/descanso|desc/i.test(c.tipo_turno));
    },
    enabled: isOpen && !!solicitud,
  });

  const { data: convNuevas = [] } = useQuery({
    queryKey: ['convocatorias-edit-nueva', convNueva?.id_agente, solicitud?.id_convocatoria_nueva],
    queryFn: async () => {
      const id = convNueva?.id_agente ?? solicitud?.id_agente_nuevo;
      const { data, error } = await supabase
        .from('vista_convocatoria_completa' as any)
        .select('*')
        .eq('id_agente', id)
        .gte('fecha_turno', hoy)
        .order('fecha_turno');
      if (error) throw error;
      return (data || []).filter((c: Convocatoria) => !/descanso|desc/i.test(c.tipo_turno));
    },
    enabled: isOpen && !!solicitud,
  });

  const agenteOrig = agentes.find((a: Agente) => a.id_agente === (convOrig?.id_agente ?? solicitud?.id_agente_original));
  const agenteNuevo = agentes.find((a: Agente) => a.id_agente === (convNueva?.id_agente ?? solicitud?.id_agente_nuevo));

  const handleGuardar = async () => {
    if (!solicitud) return;
    const usuario = await obtenerUsuarioActual();
    await editar.mutateAsync({
      id_transaccion: solicitud.id_transaccion!,
      observaciones: observaciones,
      id_convocatoria_original: convOrig?.id_convocatoria ?? solicitud.id_convocatoria_original ?? undefined,
      id_convocatoria_nueva: convNueva?.id_convocatoria ?? solicitud.id_convocatoria_nueva ?? undefined,
      id_agente_original: convOrig?.id_agente ?? solicitud.id_agente_original ?? undefined,
      id_agente_nuevo: convNueva?.id_agente ?? solicitud.id_agente_nuevo ?? undefined,
      id_turno_original: convOrig?.id_turno ?? solicitud.id_turno_original ?? undefined,
      id_turno_nuevo: convNueva?.id_turno ?? solicitud.id_turno_nuevo ?? undefined,
      fecha_original: convOrig?.fecha_turno ?? solicitud.fecha_original ?? undefined,
      fecha_nueva: convNueva?.fecha_turno ?? solicitud.fecha_nueva ?? undefined,
      usuario,
    });
    onClose();
  };

  if (!isOpen || !solicitud) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Editar solicitud #{solicitud.id_transaccion}</h2>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 rounded-lg hover:bg-outline-variant/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-medium">
              {CAMBIO_ESTADO_LABELS[solicitud.estado as keyof typeof CAMBIO_ESTADO_LABELS] || solicitud.estado}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Residente 1 / convocatoria a ceder */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Residente 1 (cede)</label>
              <select
                className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
                value={agenteOrig?.id_agente || ''}
                onChange={(e) => {
                  const a = agentes.find((x: Agente) => x.id_agente === Number(e.target.value));
                  setConvOrig(a ? { id_convocatoria: -1, id_agente: a.id_agente, id_turno: 0, fecha_turno: '', tipo_turno: '' } : null);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              >
                <option value="">{agenteOrig ? `${agenteOrig.apellido}, ${agenteOrig.nombre}` : 'Residente 1'}</option>
                {agentes.map((a: Agente) => (
                  <option key={a.id_agente} value={a.id_agente}>{a.apellido}, {a.nombre}</option>
                ))}
              </select>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                <select
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface pl-9 pr-3 py-2 text-sm"
                  value={convOrig?.id_convocatoria ?? solicitud.id_convocatoria_original ?? ''}
                  onChange={(e) => {
                    const c = convOrigenes.find((x: Convocatoria) => x.id_convocatoria === Number(e.target.value));
                    setConvOrig(c || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                >
                  <option value="">Seleccionar convocatoria...</option>
                  {convOrigenes.map((c: Convocatoria) => (
                    <option key={c.id_convocatoria} value={c.id_convocatoria}>
                      {c.fecha_turno} - {normalizarTurno(c.tipo_turno)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Residente 2 / convocatoria que recibe */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Residente 2 (recibe)</label>
              <select
                className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
                value={agenteNuevo?.id_agente || ''}
                onChange={(e) => {
                  const a = agentes.find((x: Agente) => x.id_agente === Number(e.target.value));
                  setConvNueva(a ? { id_convocatoria: -1, id_agente: a.id_agente, id_turno: 0, fecha_turno: '', tipo_turno: '' } : null);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              >
                <option value="">{agenteNuevo ? `${agenteNuevo.apellido}, ${agenteNuevo.nombre}` : 'Residente 2'}</option>
                {agentes.map((a: Agente) => (
                  <option key={a.id_agente} value={a.id_agente}>{a.apellido}, {a.nombre}</option>
                ))}
              </select>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                <select
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface pl-9 pr-3 py-2 text-sm"
                  value={convNueva?.id_convocatoria ?? solicitud.id_convocatoria_nueva ?? ''}
                  onChange={(e) => {
                    const c = convNuevas.find((x: Convocatoria) => x.id_convocatoria === Number(e.target.value));
                    setConvNueva(c || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                >
                  <option value="">Seleccionar convocatoria...</option>
                  {convNuevas.map((c: Convocatoria) => (
                    <option key={c.id_convocatoria} value={c.id_convocatoria}>
                      {c.fecha_turno} - {normalizarTurno(c.tipo_turno)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>

          {editar.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {(editar.error as any)?.message || 'Error al guardar los cambios'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleGuardar(); }}
            disabled={editar.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {editar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
