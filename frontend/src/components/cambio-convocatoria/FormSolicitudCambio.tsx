import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { ArrowLeftRight, User, Calendar, CheckCircle } from 'lucide-react';

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
  fecha_convocatoria?: string;
  estado: string | null;
  tipo_turno: string;
}

const hoy = new Date().toISOString().slice(0, 10);

export default function FormSolicitudCambio() {
  const [agenteOrigen, setAgenteOrigen] = useState<Agente | null>(null);
  const [agenteDestino, setAgenteDestino] = useState<Agente | null>(null);
  const [convOrigen, setConvOrigen] = useState<Convocatoria | null>(null);
  const [convDestino, setConvDestino] = useState<Convocatoria | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentYear = new Date().getFullYear();

  const { data: agentes = [] } = useQuery({
    queryKey: ['agentes-activos'],
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
  });

  const { data: convOrigenes = [] } = useQuery({
    queryKey: ['convocatorias-agente', agenteOrigen?.id_agente],
    queryFn: async () => {
      if (!agenteOrigen) return [];
      const { data, error } = await supabase
        .from('vista_convocatoria_completa' as any)
        .select('*')
        .eq('id_agente', agenteOrigen.id_agente)
        .gte('fecha_turno', hoy)
        .order('fecha_turno');
      if (error) throw error;
      return (data || []) as Convocatoria[];
    },
    enabled: !!agenteOrigen,
  });

  const { data: convDestinos = [] } = useQuery({
    queryKey: ['convocatorias-agente-destino', agenteDestino?.id_agente],
    queryFn: async () => {
      if (!agenteDestino) return [];
      const { data, error } = await supabase
        .from('vista_convocatoria_completa' as any)
        .select('*')
        .eq('id_agente', agenteDestino.id_agente)
        .gte('fecha_turno', hoy)
        .order('fecha_turno');
      if (error) throw error;
      return (data || []) as Convocatoria[];
    },
    enabled: !!agenteDestino,
  });

  const convOrigenesFiltradas = convOrigenes.filter((c: Convocatoria) => {
    return !/descanso|desc/i.test(c.tipo_turno);
  });

  const convDestinosFiltradas = convDestinos.filter((c: Convocatoria) => {
    return !/descanso|desc/i.test(c.tipo_turno);
  });

  const formatoResidente = (agente: Agente): string => {
    const primeraLetraApellido = agente.apellido?.charAt(0)?.toUpperCase() || '';
    return `${agente.nombre} ${primeraLetraApellido}.`;
  };

  const normalizarTurno = (tipo: string): string => {
    if (/capacitacion/i.test(tipo)) return 'Capacitación';
    if (/mañana|manana/i.test(tipo)) return 'Turno Mañana';
    if (/tarde/i.test(tipo)) return 'Turno Tarde';
    if (/apertura|público|publico/i.test(tipo)) return 'Apertura al Público';
    return tipo;
  };

  const handleSubmit = async () => {
    if (!agenteOrigen || !agenteDestino || !convOrigen || !convDestino) return;
    setSending(true);

    try {
      const { data, error } = await supabase.rpc('rpc_crear_solicitud_cambio', {
        p_agente_iniciador: agenteOrigen.id_agente,
        p_id_convocatoria_orig: convOrigen.id_convocatoria,
        p_id_convocatoria_nueva: convDestino.id_convocatoria,
        p_id_agente_original: agenteOrigen.id_agente,
        p_id_agente_nuevo: agenteDestino.id_agente,
        p_id_turno_original: convOrigen.id_turno,
        p_id_turno_nuevo: convDestino.id_turno,
        p_fecha_original: convOrigen.fecha_turno,
        p_fecha_nueva: convDestino.fecha_turno,
        p_observaciones: observaciones || null,
        p_tipo_transaccion: 'cambio_turno',
        p_secuencia: 1,
      });
      if (error) {
        alert('Error al guardar: ' + (error.message || JSON.stringify(error)));
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setAgenteOrigen(null);
        setAgenteDestino(null);
        setConvOrigen(null);
        setConvDestino(null);
        setObservaciones('');
        setStep(1);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error_description ||
        err?.error ||
        (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert('Error al guardar: ' + msg);
    } finally {
      setSending(false);
    }
  };

  const agenteOrigenFiltered = agentes.filter((a: Agente) => a.id_agente !== agenteDestino?.id_agente);
  const agenteDestinoFiltered = agentes.filter((a: Agente) => a.id_agente !== agenteOrigen?.id_agente);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Solicitud creada</h2>
        <p className="text-on-surface-variant">La solicitud se guardó correctamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Solicitar Cambio de Turno</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step === 1 ? 'bg-primary text-on-primary' : 'bg-outline-variant/30'}`}>1</span>
        <span>Seleccionar residentes y convocatorias</span>
        <ArrowLeftRight className="h-4 w-4 mx-1" />
        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step === 2 ? 'bg-primary text-on-primary' : 'bg-outline-variant/30'}`}>2</span>
        <span>Confirmar</span>
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Residente 1 */}
          <div className="space-y-3 p-4 rounded-lg border border-outline-variant/20 bg-surface">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Residente 1
            </div>
            <select
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
              value={agenteOrigen?.id_agente || ''}
              onChange={(e) => {
                const agente = agentes.find((a: Agente) => a.id_agente === Number(e.target.value));
                setAgenteOrigen(agente || null);
                setConvOrigen(null);
              }}
            >
              <option value="">Seleccionar residente...</option>
              {agenteOrigenFiltered.map((a: Agente) => (
                <option key={a.id_agente} value={a.id_agente}>
                  {a.apellido}, {a.nombre} ({a.dni})
                </option>
              ))}
            </select>

            {agenteOrigen && (
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant">Convocatoria residente 1</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                  <select
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface pl-9 pr-3 py-2 text-sm"
                    value={convOrigen?.id_convocatoria || ''}
                    onChange={(e) => {
                      const conv = convOrigenesFiltradas.find((c: Convocatoria) => c.id_convocatoria === Number(e.target.value));
                      setConvOrigen(conv || null);
                    }}
                  >
                    <option value="">Seleccionar convocatoria...</option>
                  {convOrigenesFiltradas.map((c: Convocatoria) => (
                    <option key={c.id_convocatoria} value={c.id_convocatoria}>
                      {c.fecha_turno}
                    </option>
                  ))}
                </select>
                </div>
                {convOrigen && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    {normalizarTurno(convOrigen.tipo_turno)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Residente 2 */}
          <div className="space-y-3 p-4 rounded-lg border border-outline-variant/20 bg-surface">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Residente 2
            </div>
            <select
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
              value={agenteDestino?.id_agente || ''}
              onChange={(e) => {
                const agente = agentes.find((a: Agente) => a.id_agente === Number(e.target.value));
                setAgenteDestino(agente || null);
                setConvDestino(null);
              }}
            >
              <option value="">Seleccionar residente...</option>
              {agenteDestinoFiltered.map((a: Agente) => (
                <option key={a.id_agente} value={a.id_agente}>
                  {a.apellido}, {a.nombre} ({a.dni})
                </option>
              ))}
            </select>

            {agenteDestino && (
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant">Convocatoria residente 2</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                  <select
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface pl-9 pr-3 py-2 text-sm"
                    value={convDestino?.id_convocatoria || ''}
                    onChange={(e) => {
                      const conv = convDestinosFiltradas.find((c: Convocatoria) => c.id_convocatoria === Number(e.target.value));
                      setConvDestino(conv || null);
                    }}
                  >
                    <option value="">Seleccionar convocatoria...</option>
                  {convDestinosFiltradas.map((c: Convocatoria) => (
                    <option key={c.id_convocatoria} value={c.id_convocatoria}>
                      {c.fecha_turno}
                    </option>
                  ))}
                </select>
                </div>
                {convDestino && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    {normalizarTurno(convDestino.tipo_turno)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 rounded-lg border border-outline-variant/20 bg-surface">
          <h3 className="font-medium">Resumen del cambio</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-sm">
            <div className="p-3 rounded-lg bg-surface border border-outline-variant/20">
              <p className="text-xs text-on-surface-variant mb-1">Residente 1</p>
              <p className="font-medium">{agenteOrigen ? formatoResidente(agenteOrigen) : ''}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {convOrigen?.fecha_turno} - {convOrigen ? normalizarTurno(convOrigen.tipo_turno) : ''}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
            </div>
            <div className="p-3 rounded-lg bg-surface border border-outline-variant/20">
              <p className="text-xs text-on-surface-variant mb-1">Residente 2</p>
              <p className="font-medium">{agenteDestino ? formatoResidente(agenteDestino) : ''}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {convDestino?.fecha_turno} - {convDestino ? normalizarTurno(convDestino.tipo_turno) : ''}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo del cambio..."
              rows={2}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
          >
            Volver
          </button>
        )}
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!agenteOrigen || !agenteDestino || !convOrigen || !convDestino}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? 'Guardando...' : 'Crear solicitud'}
          </button>
        )}
      </div>
    </div>
  );
}
