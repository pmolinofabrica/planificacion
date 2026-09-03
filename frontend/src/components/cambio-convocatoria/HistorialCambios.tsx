import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { History, AlertCircle, CheckCircle, Pencil, Trash2, Mail, FilePlus2, ArrowRight, Filter, Undo2 } from 'lucide-react';
import { useCambiosHistorial, useAceptarCambio, useCancelarCambio, useBorradoresEstado, useRevertirCambio, useToggleBorradorChip } from '../../hooks/useCambiosTurno';
import { CAMBIO_ESTADO_LABELS } from '../../types/cambios';
import type { CambioListado, CambioTransaccionEstado, BorradorEstado } from '../../types/cambios';
import { aFormatoFecha } from '../../lib/fecha-utils';
import { obtenerUsuarioActual } from '../../lib/auth-utils';
import { crearBorradorParaTarjeta } from '../../lib/email-utils';
import type { TemplateVars, ModoCorreo } from '../../lib/email-utils';
import EditarSolicitudModal from './EditarSolicitudModal';
import HistorialCambioModal from './HistorialCambioModal';
import EmailDraftModal from './EmailDraftModal';

const estadoColor: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  VALIDADO_SUPERVISOR: 'bg-blue-100 text-blue-800 border-blue-300',
  VALIDADO_AGENTE: 'bg-blue-100 text-blue-800 border-blue-300',
  APROBADO: 'bg-green-100 text-green-800 border-green-300',
  EN_EJECUCION: 'bg-purple-100 text-purple-800 border-purple-300',
  EJECUTADO: 'bg-green-100 text-green-800 border-green-300',
  RECHAZADO: 'bg-red-100 text-red-800 border-red-300',
  CANCELADO: 'bg-gray-100 text-gray-800 border-gray-300',
};

const normalizarTurno = (tipo: string | null): string => {
  if (!tipo) return '';
  if (/capacitacion/i.test(tipo)) return 'Capacitación';
  if (/mañana|manana/i.test(tipo)) return 'Turno Mañana';
  if (/tarde/i.test(tipo)) return 'Turno Tarde';
  if (/apertura|público|publico/i.test(tipo)) return 'Apertura al Público';
  return tipo;
};

const formatearFecha = aFormatoFecha;

const nombreResidente = (nombre: string | null, apellido: string | null, id: number | null) => {
  if (nombre && apellido) return `${nombre} ${apellido.charAt(0).toUpperCase()}.`;
  return id ? `ID: ${id}` : 'Desconocido';
};

const modoSugerido = (p: CambioListado): ModoCorreo =>
  p.estado === 'EJECUTADO' ? 'confirmado' : 'pendiente';

const EDITABLES = ['PENDIENTE', 'VALIDADO_SUPERVISOR', 'VALIDADO_AGENTE', 'APROBADO'];
const PARA_ACEPTAR = ['PENDIENTE', 'VALIDADO_SUPERVISOR', 'VALIDADO_AGENTE', 'APROBADO'];

const ESTADOS_FILTRO: CambioTransaccionEstado[] = ['PENDIENTE', 'EJECUTADO', 'CANCELADO'];

const mesDeFecha = (f: string | null): string | null => {
  if (!f) return null;
  const m = /(\d{4})-(\d{2})/.exec(f);
  return m ? `${m[1]}-${m[2]}` : null;
};

const nombreMes = (ym: string): string => {
  const [y, m] = ym.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const idx = Number(m) - 1;
  return `${meses[idx] || m} ${y}`;
};

export default function HistorialCambios() {
  const qc = useQueryClient();
  const aceptar = useAceptarCambio();
  const cancelar = useCancelarCambio();
  const { data: historial = [], isLoading } = useCambiosHistorial();
  const { data: borradores = [] } = useBorradoresEstado();
  const revertir = useRevertirCambio();
  const toggleChip = useToggleBorradorChip();
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');

  const borradoresPorTx = (borradores || []).reduce<Record<number, BorradorEstado>>((acc, b) => {
    acc[b.id_transaccion] = b;
    return acc;
  }, {});

  const [editando, setEditando] = useState<CambioListado | null>(null);
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [modos, setModos] = useState<Record<string, ModoCorreo>>({});
  const [creando, setCreando] = useState<Record<string, boolean>>({});
  const [correoModal, setCorreoModal] = useState<{
    solicitud: CambioListado;
    modo: ModoCorreo;
    templateVars: TemplateVars;
    emails: string[];
  } | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState<CambioListado | null>(null);

  const meses = useMemo(() => {
    const set = new Set<string>();
    (historial as CambioListado[]).forEach((h) => {
      const m1 = mesDeFecha(h.fecha_original);
      const m2 = mesDeFecha(h.fecha_nueva);
      if (m1) set.add(m1);
      if (m2) set.add(m2);
    });
    return [...set].sort();
  }, [historial]);

  const filtrados = (historial as CambioListado[]).filter((h) => {
    if (filtroEstado !== 'todos' && h.estado !== filtroEstado) return false;
    if (filtroMetodo !== 'todos' && h.metodo_aprobacion !== filtroMetodo) return false;
    if (filtroMes !== 'todos') {
      const m1 = mesDeFecha(h.fecha_original);
      const m2 = mesDeFecha(h.fecha_nueva);
      if (m1 !== filtroMes && m2 !== filtroMes) return false;
    }
    return true;
  });

  const getModo = (p: CambioListado): ModoCorreo => modos[String(p.id_transaccion)] ?? modoSugerido(p);

  const setModo = (p: CambioListado, modo: ModoCorreo) => {
    setModos((prev) => ({ ...prev, [String(p.id_transaccion)]: modo }));
  };

  const buildDatosCorreo = async (p: CambioListado) => {
    const ids = [p.id_agente_original, p.id_agente_nuevo].filter((id): id is number => id != null);
    const { data: agentes } = await supabase
      .from('datos_personales' as any)
      .select('id_agente, email')
      .in('id_agente', ids);
    const emailPorId = new Map((agentes || []).map((a: any) => [a.id_agente, a.email as string | undefined]));
    return {
      templateVars: {
        NOMBRE_RESIDENTE_1: nombreResidente(p.nombre_original, p.apellido_original, p.id_agente_original),
        NOMBRE_RESIDENTE_2: nombreResidente(p.nombre_nuevo, p.apellido_nuevo, p.id_agente_nuevo),
        FECHA_RESIDENTE_1: formatearFecha(p.fecha_original),
        FECHA_RESIDENTE_2: formatearFecha(p.fecha_nueva),
        DETALLE_FECHA_RESIDENTE_1: normalizarTurno(p.tipo_turno_original) || 'Turno 1',
        DETALLE_FECHA_RESIDENTE_2: normalizarTurno(p.tipo_turno_nuevo) || 'Turno 2',
      } as TemplateVars,
      emails: [emailPorId.get(p.id_agente_original!), emailPorId.get(p.id_agente_nuevo!)].filter((e): e is string => !!e),
    };
  };

  const handleCrearBorrador = async (p: CambioListado) => {
    const modo = getModo(p);
    setCreando((prev) => ({ ...prev, [String(p.id_transaccion)]: true }));
    try {
      const datos = await buildDatosCorreo(p);
      const usuario = await obtenerUsuarioActual();
      const resultado = await crearBorradorParaTarjeta({
        modo,
        emails: datos.emails,
        templateVars: datos.templateVars,
        idTransaccion: p.id_transaccion,
        usuario,
      });
      if (resultado.ok) {
        alert(`Borrador ${modo === 'confirmado' ? 'confirmado' : 'pendiente'} creado en Gmail correctamente.`);
        qc.invalidateQueries({ queryKey: ['borradores-estado'] });
      } else {
        alert('Error al crear borrador: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (err: any) {
      alert('Error al crear borrador: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setCreando((prev) => ({ ...prev, [String(p.id_transaccion)]: false }));
    }
  };

  const handleEditarBorrador = async (p: CambioListado) => {
    const modo = getModo(p);
    const datos = await buildDatosCorreo(p);
    setCorreoModal({ solicitud: p, modo, templateVars: datos.templateVars, emails: datos.emails });
  };

  const handleAceptar = async (p: CambioListado) => {
    if (!window.confirm(`¿Confirmar e intercambiar las convocatorias de la solicitud #${p.id_transaccion}?`)) return;
    try {
      const usuario = await obtenerUsuarioActual();
      await aceptar.mutateAsync({ id_transaccion: p.id_transaccion!, usuario });
    } catch (err: any) {
      alert('Error al aceptar: ' + (err?.message || JSON.stringify(err)));
    }
  };

  const handleCancelar = async (p: CambioListado) => {
    try {
      const usuario = await obtenerUsuarioActual();
      await cancelar.mutateAsync({ id_transaccion: p.id_transaccion!, motivo: 'Cancelada por el usuario', usuario });
      setConfirmarCancelar(null);
    } catch (err: any) {
      alert('Error al cancelar: ' + (err?.message || JSON.stringify(err)));
    }
  };

  const handleRevertir = async (p: CambioListado) => {
    const esEjecutado = p.estado === 'EJECUTADO';
    const msg = esEjecutado
      ? `¿Revertir el intercambio de la solicitud #${p.id_transaccion}? Las convocatorias volverán a sus residentes originales y la solicitud quedará PENDIENTE.`
      : `¿Reactivar la solicitud #${p.id_transaccion}? Volverá a estado PENDIENTE para poder gestionarla nuevamente.`;
    if (!window.confirm(msg)) return;
    try {
      const usuario = await obtenerUsuarioActual();
      await revertir.mutateAsync({ id_transaccion: p.id_transaccion!, usuario });
      alert(esEjecutado
        ? `Solicitud #${p.id_transaccion} revertida correctamente.`
        : `Solicitud #${p.id_transaccion} reactivada correctamente.`);
    } catch (err: any) {
      alert('Error al revertir: ' + (err?.message || JSON.stringify(err)));
    }
  };

  const handleToggleChip = async (p: CambioListado, tipo: 'pendiente' | 'confirmado', activar: boolean) => {
    if (!p.id_transaccion) return;
    try {
      const usuario = await obtenerUsuarioActual();
      await toggleChip.mutateAsync({ idTransaccion: p.id_transaccion, tipo, activar, usuario });
    } catch (err: any) {
      alert('Error al actualizar el estado del borrador: ' + (err?.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Historial de Solicitudes</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-on-surface-variant" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-lg border border-outline-variant/30 bg-surface px-2 py-1 text-sm"
          >
            <option value="todos">Estado: Todos</option>
            {ESTADOS_FILTRO.map((estado) => (
              <option key={estado} value={estado}>{CAMBIO_ESTADO_LABELS[estado]}</option>
            ))}
          </select>
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className="rounded-lg border border-outline-variant/30 bg-surface px-2 py-1 text-sm"
          >
            <option value="todos">Aprobación: Todas</option>
            <option value="SISTEMA">Aceptadas por sistema</option>
            <option value="AGENTES">Aceptadas por confirmación de agentes</option>
          </select>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="rounded-lg border border-outline-variant/30 bg-surface px-2 py-1 text-sm"
          >
            <option value="todos">Mes: Todos</option>
            {meses.map((m) => (
              <option key={m} value={m}>{nombreMes(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-outline-variant/10 animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay solicitudes en el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p: CambioListado) => {
            const puedeAceptar = PARA_ACEPTAR.includes(p.estado || '');
            const puedeEditar = EDITABLES.includes(p.estado || '') && p.estado !== 'EJECUTADO';
            const modo = getModo(p);
            const creandoEste = creando[String(p.id_transaccion)];
            const bEstado = p.id_transaccion != null ? borradoresPorTx[p.id_transaccion] : undefined;
            const pendienteCreado = !!bEstado?.borrador_pendiente;
            const confirmadoCreado = !!bEstado?.borrador_confirmado;
            const modoCreado = modo === 'confirmado' ? confirmadoCreado : pendienteCreado;
            return (
              <div key={p.id_transaccion} className="p-4 rounded-lg border border-outline-variant/20 bg-surface">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Solicitud #{p.id_transaccion}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estadoColor[p.estado || ''] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                      {CAMBIO_ESTADO_LABELS[p.estado as CambioTransaccionEstado] || p.estado}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {p.fecha_solicitud ? formatearFecha(p.fecha_solicitud) : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
                  <div className="p-3 rounded-lg bg-surface border border-outline-variant/20">
                    <p className="font-medium text-sm">{nombreResidente(p.nombre_original, p.apellido_original, p.id_agente_original)}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {formatearFecha(p.fecha_original)} · {normalizarTurno(p.tipo_turno_original) || 'Turno 1'}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <div className="p-3 rounded-lg bg-surface border border-outline-variant/20">
                    <p className="font-medium text-sm">{nombreResidente(p.nombre_nuevo, p.apellido_nuevo, p.id_agente_nuevo)}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {formatearFecha(p.fecha_nueva)} · {normalizarTurno(p.tipo_turno_nuevo) || 'Turno 2'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {puedeAceptar && (
                    <button
                      onClick={() => handleAceptar(p)}
                      disabled={aceptar.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aceptar
                    </button>
                  )}
                  {puedeEditar && (
                    <button
                      onClick={() => setEditando(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                  )}
                  {p.estado === 'PENDIENTE' && (
                    <button
                      onClick={() => setConfirmarCancelar(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Borrar
                    </button>
                  )}
                  <button
                    onClick={() => setHistorialId(p.id_transaccion)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-outline-variant/10 transition-colors"
                  >
                    <History className="h-4 w-4" />
                    Historial
                  </button>
                  {(p.estado === 'EJECUTADO' || p.estado === 'CANCELADO') && (
                    <button
                      onClick={() => handleRevertir(p)}
                      disabled={revertir.isPending}
                      title={p.estado === 'CANCELADO' ? 'Reactivar solicitud a PENDIENTE' : 'Revertir el intercambio'}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                    >
                      <Undo2 className="h-4 w-4" />
                      {p.estado === 'CANCELADO' ? 'Reactivar' : 'Revertir'}
                    </button>
                  )}

                  {/* Zona correo: chips de estado (editables) + switch + crear + editar */}
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleToggleChip(p, 'pendiente', !pendienteCreado)}
                      disabled={toggleChip.isPending}
                      title={pendienteCreado ? 'Borrador pendiente registrado. Clic para quitarlo.' : 'Registrar borrador pendiente (sin crear en Gmail). Clic para agregarlo.'}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${pendienteCreado ? 'bg-green-50 text-green-700 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-300 border-dashed'}`}
                    >
                      {pendienteCreado ? '✔' : '✖'} Pendiente
                    </button>
                    <button
                      onClick={() => handleToggleChip(p, 'confirmado', !confirmadoCreado)}
                      disabled={toggleChip.isPending}
                      title={confirmadoCreado ? 'Borrador confirmado registrado. Clic para quitarlo.' : 'Registrar borrador confirmado (sin crear en Gmail). Clic para agregarlo.'}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${confirmadoCreado ? 'bg-green-50 text-green-700 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-300 border-dashed'}`}
                    >
                      {confirmadoCreado ? '✔' : '✖'} Confirmado
                    </button>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-outline-variant/30">
                      <span className={`text-xs font-medium ${modo === 'pendiente' ? 'text-primary' : 'text-on-surface-variant'}`}>Pendiente</span>
                      <button
                        role="switch"
                        aria-checked={modo === 'confirmado'}
                        onClick={() => setModo(p, modo === 'confirmado' ? 'pendiente' : 'confirmado')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${modo === 'confirmado' ? 'bg-green-600' : 'bg-outline-variant/40'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modo === 'confirmado' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className={`text-xs font-medium ${modo === 'confirmado' ? 'text-green-700' : 'text-on-surface-variant'}`}>Confirmado</span>
                    </div>
                    <button
                      onClick={() => handleCrearBorrador(p)}
                      disabled={!!creandoEste}
                      title={modoCreado ? 'Borrador ya creado. Pulsar lo recrea/actualiza.' : 'Falta crear este borrador'}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${modoCreado ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}
                    >
                      {creandoEste ? (
                        <span className="flex items-center gap-1">Creando...</span>
                      ) : (
                        <><FilePlus2 className="h-4 w-4" /> Crear borrador</>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditarBorrador(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Editar borrador
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <EditarSolicitudModal
          isOpen={!!editando}
          solicitud={editando}
          onClose={() => setEditando(null)}
        />
      )}

      <HistorialCambioModal
        isOpen={historialId !== null}
        idTransaccion={historialId}
        onClose={() => setHistorialId(null)}
      />

      {correoModal && (
        <EmailDraftModal
          isOpen={!!correoModal}
          modo={correoModal.modo}
          templateVars={correoModal.templateVars}
          emails={correoModal.emails}
          onClose={() => setCorreoModal(null)}
        />
      )}

      {confirmarCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm m-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Cancelar solicitud #{confirmarCancelar.id_transaccion}</h3>
            <p className="text-sm text-on-surface-variant mb-5">
              ¿Estás seguro de que querés cancelar esta solicitud? Quedará registrada como CANCELADA.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarCancelar(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => handleCancelar(confirmarCancelar)}
                disabled={cancelar.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
