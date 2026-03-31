import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';

export interface ViewConvocatoria {
  id_convocatoria: number;
  id_plani: number;
  id_agente: number;
  agente: string;
  dni: string;
  fecha_turno: string;
  anio: number;
  mes: number;
  tipo_turno: string;
  id_turno: number;
  estado: string | null;
  turno_cancelado: boolean | null;
  motivo_cambio: string | null;
  cant_horas: number | null;
}

interface PlaniOption { id_plani: number; fecha: string; tipo_turno: string; grupo: string | null; }
interface Agente { id_agente: number; nombre: string; apellido: string; dni: string; grupo_capacitacion: string | null; }

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

const makeTemplate = (overrides: Partial<ViewConvocatoria> = {}): ViewConvocatoria => ({
  id_convocatoria: 0,
  id_plani: 0,
  id_agente: 0,
  agente: '',
  dni: '',
  fecha_turno: '',
  anio: currentYear,
  mes: currentMonth,
  tipo_turno: '',
  id_turno: 0,
  estado: 'vigente',
  turno_cancelado: false,
  motivo_cambio: null,
  cant_horas: 0,
  ...overrides,
});

export default function ConvocatoriasPage() {
  const [data, setData] = useState<ViewConvocatoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [filtroMes, setFiltroMes] = useState(currentMonth);
  const [filtroAnio, setFiltroAnio] = useState(currentYear);

  // Buscador de planificaciones
  const [buscarDia, setBuscarDia] = useState<number | ''>('');
  const [buscarMes, setBuscarMes] = useState(currentMonth);
  const [buscarTurno, setBuscarTurno] = useState('');
  const [planesEncontrados, setPlanesEncontrados] = useState<PlaniOption[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [turnosDisponibles, setTurnosDisponibles] = useState<{tipo_turno: string}[]>([]);

  const agentesOptions = useMemo(() =>
    agentes.map(a => ({
      value: a.dni,
      label: `${a.apellido}, ${a.nombre} (${a.dni})`
    })),
    [agentes]
  );

  const fetchConvocatorias = useCallback(async () => {
    setLoading(true);
    setError('');

    const [agentesRes, convRes, turnosRes] = await Promise.all([
      supabase
        .from('datos_personales')
        .select('id_agente, nombre, apellido, dni, grupo_capacitacion')
        .eq('activo', true)
        .eq('cohorte', currentYear)
        .order('apellido'),
      supabase
        .from('vista_convocatoria_completa')
        .select('*')
        .eq('anio', filtroAnio)
        .eq('mes', filtroMes)
        .order('fecha_turno'),
      supabase
        .from('turnos')
        .select('tipo_turno')
        .eq('activo', true)
        .order('tipo_turno'),
    ]);

    if (agentesRes.data) setAgentes(agentesRes.data as Agente[]);
    if (turnosRes.data) setTurnosDisponibles(turnosRes.data);
    if (convRes.error) {
      setError('Error al cargar convocatorias: ' + convRes.error.message);
    } else {
      setData(convRes.data as ViewConvocatoria[] ?? []);
    }
    setRefreshKey(Date.now());
    setLoading(false);
  }, [filtroMes, filtroAnio]);

  useEffect(() => { fetchConvocatorias(); }, [fetchConvocatorias]);

  // Buscador de planificaciones: busca por fecha y tipo de turno
  const buscarPlanificaciones = async () => {
    if (!buscarDia) { setError('Seleccioná un día para buscar.'); return; }
    setBuscando(true);
    setPlanesEncontrados([]);

    const fechaFormat = `${currentYear}-${String(buscarMes).padStart(2, '0')}-${String(buscarDia).padStart(2, '0')}`;

    const { data: planes, error: err } = await supabase
      .from('vista_planificacion_anio')
      .select('id_plani, fecha, tipo_turno, grupo')
      .eq('fecha', fechaFormat)
      .order('tipo_turno');

    if (err) { setError('Error al buscar planificaciones.'); }
    else {
      const filtered = buscarTurno
        ? (planes ?? []).filter(p => p.tipo_turno?.toLowerCase().includes(buscarTurno.toLowerCase()))
        : (planes ?? []);
      setPlanesEncontrados(filtered as PlaniOption[]);
    }
    setBuscando(false);
  };

  // Batch insert: INSERT directo a tabla convocatoria (sin RPC fantasma)
  const customBatchInsert = async (inserts: ViewConvocatoria[]) => {
    const successes: ViewConvocatoria[] = [];
    const failures: BatchError[] = [];

    for (let i = 0; i < inserts.length; i++) {
      const row = inserts[i];
      // Necesitamos id_agente desde dni
      const agente = agentes.find(a => String(a.dni) === String(row.dni));

      if (!agente || !row.id_plani) {
        failures.push({ index: i, row, error: 'Falta Agente o ID Planificación' });
        continue;
      }

      const { data: inserted, error } = await supabase
        .from('convocatoria')
        .insert({
          id_plani: row.id_plani,
          id_agente: agente.id_agente,
          id_turno: row.id_turno || null,
          estado: row.estado ?? 'vigente',
        })
        .select('id_convocatoria')
        .single();

      if (error) {
        failures.push({ index: i, row, error: error.message });
      } else {
        successes.push({ ...row, id_convocatoria: inserted.id_convocatoria });
      }
    }

    return { successes, failures };
  };

  // Agregar filas de un grupo completo (A o B)
  const addGrupo = (grupo: 'A' | 'B') => {
    const grupoAgentes = agentes.filter(a => a.grupo_capacitacion === grupo);
    const newRows = grupoAgentes.map(a => makeTemplate({ dni: a.dni, id_agente: a.id_agente, agente: `${a.apellido}, ${a.nombre}` }));
    // Retornamos las filas para que el DataTable las agregue — usamos addBulkRows via ref
    setBulkPendingRows(prev => [...newRows, ...prev]);
  };

  const [bulkPendingRows, setBulkPendingRows] = useState<ViewConvocatoria[]>([]);

  const columns = useMemo<ColumnDef<TrackedRow<ViewConvocatoria>>[]>(() => [
    { id: 'id_convocatoria', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_convocatoria || '—'}</span>, size: 50 },
    editableColumn<ViewConvocatoria>('dni', 'Agente', 'select', agentesOptions),
    editableColumn<ViewConvocatoria>('id_plani', 'ID Planif.', 'number'),
    { id: 'fecha_turno', header: 'Fecha', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.fecha_turno || '—'}</span> },
    { id: 'tipo_turno', header: 'Turno', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.tipo_turno || '—'}</span> },
    editableColumn<ViewConvocatoria>('estado', 'Estado', 'select', [
      { value: 'vigente', label: 'Vigente' },
      { value: 'cumplida', label: 'Cumplida' },
      { value: 'cancelada', label: 'Cancelada' },
    ]),
    editableColumn<ViewConvocatoria>('turno_cancelado', 'Cancelado', 'boolean'),
    editableColumn<ViewConvocatoria>('motivo_cambio', 'Motivo'),
  ], [agentesOptions]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Convocatorias</h2>
          <p className="text-sm text-gray-500">Filtrado por mes/año. Selectores cargados en memoria.</p>
        </div>
        <div className="flex gap-2">
          <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Buscador de Planificaciones */}
      <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-indigo-700 mb-1">🔍 Buscador de ID Planificación</label>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number"
              placeholder="Día"
              min={1} max={31}
              value={buscarDia}
              onChange={(e) => setBuscarDia(e.target.value ? Number(e.target.value) : '')}
              className="border border-indigo-300 rounded px-2 py-1.5 text-sm bg-white w-16 focus:ring-1 focus:ring-indigo-400 text-center"
            />
            <select
              value={buscarMes}
              onChange={(e) => setBuscarMes(Number(e.target.value))}
              className="border border-indigo-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-indigo-400"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Mes {m}</option>
              ))}
            </select>
            <select
              value={buscarTurno}
              onChange={(e) => setBuscarTurno(e.target.value)}
              className="border border-indigo-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-indigo-400 w-44"
            >
              <option value="">Cualquier turno...</option>
              {turnosDisponibles.map(t => (
                <option key={t.tipo_turno} value={t.tipo_turno}>
                  {t.tipo_turno}
                </option>
              ))}
            </select>
            <button
              onClick={buscarPlanificaciones}
              disabled={buscando}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
        {planesEncontrados.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-indigo-600 font-semibold">Resultados:</span>
            {planesEncontrados.map(p => (
              <span
                key={p.id_plani}
                className="bg-white border border-indigo-300 text-indigo-800 text-xs px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 font-mono"
                title={`ID ${p.id_plani} — ${p.tipo_turno}${p.grupo ? ` (Grupo ${p.grupo})` : ''}`}
                onClick={() => navigator.clipboard.writeText(String(p.id_plani))}
              >
                ID: {p.id_plani} · {p.tipo_turno}{p.grupo ? ` · Grupo ${p.grupo}` : ''}
              </span>
            ))}
            <span className="text-xs text-gray-400 italic">Click para copiar ID</span>
          </div>
        )}
        {planesEncontrados.length === 0 && buscarDia && !buscando && (
          <span className="text-xs text-gray-400 italic">Sin resultados para ese día/turno.</span>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando convocatorias...</div>
      ) : (
        <DataTable<ViewConvocatoria>
          key={refreshKey}
          tableName="convocatoria"
          pkField="id_convocatoria"
          initialData={data}
          columns={columns}
          onRefresh={fetchConvocatorias}
          buildNewRow={() => makeTemplate()}
          onBatchInsert={customBatchInsert}
          enableClone={true}
          bulkRows={bulkPendingRows}
          onBulkRowsConsumed={() => setBulkPendingRows([])}
          extraToolbar={
            <div className="flex gap-1">
              <button
                onClick={() => addGrupo('A')}
                className="px-2 py-1.5 text-xs bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 rounded font-semibold"
                title="Agregar las 18 filas del Grupo A"
              >
                + Grupo A ({agentes.filter(a => a.grupo_capacitacion === 'A').length})
              </button>
              <button
                onClick={() => addGrupo('B')}
                className="px-2 py-1.5 text-xs bg-teal-100 text-teal-700 border border-teal-300 hover:bg-teal-200 rounded font-semibold"
                title="Agregar las 18 filas del Grupo B"
              >
                + Grupo B ({agentes.filter(a => a.grupo_capacitacion === 'B').length})
              </button>
              <button
                onClick={() => { addGrupo('A'); addGrupo('B'); }}
                className="px-2 py-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 rounded font-semibold"
                title="Agregar los 36 residentes (A + B)"
              >
                +36 (Todos)
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
