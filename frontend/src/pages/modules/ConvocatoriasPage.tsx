import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import { EditableCell } from '../../components/table/EditableCell';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';

export interface ViewConvocatoria {
  id_convocatoria: number;
  id_plani: number;
  id_agente: number;
  agente: string;
  dni: string;
  fecha_turno: string;
  fecha_convocatoria?: string;
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
interface AgenteGrupoDia { id_agente: number; dia_semana: number; grupo: string; }

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();
const getLocalIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeTemplate = (overrides: Partial<ViewConvocatoria> = {}): ViewConvocatoria => ({
  id_plani: 0,
  id_agente: 0,
  agente: '',
  dni: '',
  fecha_turno: '',
  fecha_convocatoria: '',
  anio: currentYear,
  mes: currentMonth,
  tipo_turno: '',
  id_turno: 0,
  estado: 'vigente',
  turno_cancelado: false,
  motivo_cambio: null,
  cant_horas: 0,
  ...overrides,
} as ViewConvocatoria);

export default function ConvocatoriasPage() {
  const [data, setData] = useState<ViewConvocatoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [filtroMes, setFiltroMes] = useState(currentMonth);

  // Buscador de planificaciones
  const [buscarDia, setBuscarDia] = useState<number | ''>('');
  const [buscarMes, setBuscarMes] = useState(currentMonth);
  const [buscarTurno, setBuscarTurno] = useState('');
  const [planesEncontrados, setPlanesEncontrados] = useState<PlaniOption[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [turnosDisponibles, setTurnosDisponibles] = useState<{tipo_turno: string}[]>([]);
  const [agentesGruposDias, setAgentesGruposDias] = useState<AgenteGrupoDia[]>([]);

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

    const [agentesRes, convRes, turnosRes, agdRes] = await Promise.all([
      supabase
        .from('datos_personales')
        .select('id_agente, nombre, apellido, dni, grupo_capacitacion')
        .eq('activo', true)
        .eq('cohorte', currentYear)
        .order('apellido'),
      supabase
        .from('vista_convocatoria_completa')
        .select('*')
        .eq('anio', currentYear)
        .eq('mes', filtroMes)
        .order('fecha_turno'),
      supabase
        .from('turnos')
        .select('tipo_turno')
        .eq('activo', true)
        .order('tipo_turno'),
      supabase
        .from('agentes_grupos_dias')
        .select('id_agente, dia_semana, grupo'),
    ]);

    if (agentesRes.data) setAgentes(agentesRes.data as Agente[]);
    if (turnosRes.data) setTurnosDisponibles(turnosRes.data);
    if (agdRes.data) setAgentesGruposDias(agdRes.data as AgenteGrupoDia[]);
    if (convRes.error) {
      setError('Error al cargar convocatorias: ' + convRes.error.message);
    } else {
      setData(convRes.data as ViewConvocatoria[] ?? []);
    }
    setRefreshKey(Date.now());
    setLoading(false);
  }, [filtroMes]);

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
      const planesTyped = (planes ?? []) as PlaniOption[];
      const filtered = buscarTurno
        ? planesTyped.filter((p: PlaniOption) => p.tipo_turno?.toLowerCase().includes(buscarTurno.toLowerCase()))
        : planesTyped;
      setPlanesEncontrados(filtered);
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

      const fechaConvocatoriaFinal = getLocalIsoDate();

      const { data: inserted, error } = await supabase
        .from('convocatoria')
        .insert({
          id_plani: row.id_plani,
          id_agente: agente.id_agente,
          id_turno: row.id_turno || null,
          fecha_convocatoria: fechaConvocatoriaFinal,
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

  const addAgentesPorDiaYGrupo = (diaSemana: number, grupo: 'manana' | 'tarde') => {
    const ids = new Set(
      agentesGruposDias
        .filter(a => a.dia_semana === diaSemana && a.grupo === grupo)
        .map(a => a.id_agente)
    );

    const newRows = agentes
      .filter(a => ids.has(a.id_agente))
      .map(a => makeTemplate({ dni: a.dni, id_agente: a.id_agente, agente: `${a.apellido}, ${a.nombre}` }));

    setBulkPendingRows(prev => [...newRows, ...prev]);
  };

  const countAgentesPorDiaYGrupo = (diaSemana: number, grupo: 'manana' | 'tarde') =>
    agentesGruposDias.filter(a => a.dia_semana === diaSemana && a.grupo === grupo).length;

  const [bulkPendingRows, setBulkPendingRows] = useState<ViewConvocatoria[]>([]);

  const columns = useMemo<ColumnDef<TrackedRow<ViewConvocatoria>>[]>(() => {
    // Intercept id_plani edits to auto-fetch missing id_turno, fecha, tipo_turno
    const planiCol = editableColumn<ViewConvocatoria>('id_plani', 'ID Planif.', 'number');

    planiCol.cell = (props) => {
      const { row, table } = props;

      const handleSave = async (val: string) => {
        const meta = table.options.meta as { updateCell: (id: string, field: keyof ViewConvocatoria, val: string) => void };
        const idPlaniNum = Number(val);
        meta.updateCell(row.original._id, 'id_plani', idPlaniNum ? String(idPlaniNum) : '');

        if (idPlaniNum) {
          // Fetch missing fields from vista_planificacion_anio
          const { data } = await supabase
            .from('vista_planificacion_anio')
            .select('id_turno, fecha, tipo_turno')
            .eq('id_plani', idPlaniNum)
            .single();

           if (data) {
              meta.updateCell(row.original._id, 'id_turno', String(data.id_turno));
              meta.updateCell(row.original._id, 'fecha_turno', data.fecha);
              meta.updateCell(row.original._id, 'fecha_convocatoria', data.fecha);
              meta.updateCell(row.original._id, 'tipo_turno', data.tipo_turno);
           }
        }
      };

      return (
        <EditableCell
          value={row.original.data.id_plani}
          onSave={handleSave}
          type="number"
        />
      );
    };

    return [
      { id: 'id_convocatoria', accessorFn: row => row.data.id_convocatoria, header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_convocatoria || '—'}</span>, size: 50 },
      editableColumn<ViewConvocatoria>('dni', 'Agente', 'select', agentesOptions),
      planiCol,
      { id: 'fecha_turno', accessorFn: row => row.data.fecha_turno, header: 'Fecha', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.fecha_turno || '—'}</span> },
      { id: 'tipo_turno', accessorFn: row => row.data.tipo_turno, header: 'Turno', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.tipo_turno || '—'}</span> },
      editableColumn<ViewConvocatoria>('estado', 'Estado', 'select', [
        { value: 'vigente', label: 'Vigente' },
        { value: 'cumplida', label: 'Cumplida' },
        { value: 'cancelada', label: 'Cancelada' },
      ]),
      editableColumn<ViewConvocatoria>('turno_cancelado', 'Cancelado', 'boolean'),
      editableColumn<ViewConvocatoria>('motivo_cambio', 'Motivo'),
    ];
  }, [agentesOptions]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 mb-4">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tighter text-on-surface">Convocatorias</h2>
        </div>
        <div className="flex gap-2">
          <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} className="bg-surface-container-lowest shadow-sm px-3 py-1.5 rounded-lg border border-outline-variant/10 text-xs font-bold text-slate-700 hover:bg-surface-container-low transition-colors outline-none focus:ring-1 focus:ring-primary font-body">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Buscador de Planificaciones con Glassmorphism */}
      <div className="mb-6 mx-2 p-4 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-primary mb-2 font-headline uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">search</span>
            Buscador de ID Planificación
          </label>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number"
              placeholder="Día"
              min={1} max={31}
              value={buscarDia}
              onChange={(e) => setBuscarDia(e.target.value ? Number(e.target.value) : '')}
              className="bg-surface-container-low border-none rounded-md px-3 py-1.5 text-xs text-on-surface-variant w-16 focus:ring-1 focus:ring-primary outline-none text-center font-body"
            />
            <select
              value={buscarMes}
              onChange={(e) => setBuscarMes(Number(e.target.value))}
              className="bg-surface-container-low border-none rounded-md px-3 py-1.5 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none font-body"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Mes {m}</option>
              ))}
            </select>
            <select
              value={buscarTurno}
              onChange={(e) => setBuscarTurno(e.target.value)}
              className="bg-surface-container-low border-none rounded-md px-3 py-1.5 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none w-44 font-body"
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
              className="px-4 py-1.5 text-xs font-bold font-headline uppercase tracking-wide bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
        {planesEncontrados.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-2">
            <span className="text-xs text-primary font-bold uppercase tracking-widest font-headline">Resultados:</span>
            {planesEncontrados.map(p => (
              <button
                key={p.id_plani}
                className="bg-primary/5 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full hover:bg-primary/10 hover:border-primary/30 font-mono font-medium transition-colors active:scale-95"
                title={`ID ${p.id_plani} — ${p.tipo_turno}${p.grupo ? ` (Grupo ${p.grupo})` : ''}`}
                onClick={() => navigator.clipboard.writeText(String(p.id_plani))}
              >
                ID: {p.id_plani} · {p.tipo_turno}{p.grupo ? ` · Grup. ${p.grupo}` : ''}
              </button>
            ))}
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-2">Click para copiar ID</span>
          </div>
        )}
        {planesEncontrados.length === 0 && buscarDia && !buscando && (
          <span className="text-xs text-slate-400 italic mt-2">Sin resultados para ese día/turno.</span>
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
            <div className="flex gap-2 mb-2 lg:mb-0 lg:ml-2">
              <button
                onClick={() => addGrupo('A')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar las 18 filas del Grupo A"
              >
                + GRUPO A ({agentes.filter(a => a.grupo_capacitacion === 'A').length})
              </button>
              <button
                onClick={() => addGrupo('B')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar las 18 filas del Grupo B"
              >
                + GRUPO B ({agentes.filter(a => a.grupo_capacitacion === 'B').length})
              </button>
              <button
                onClick={() => { addGrupo('A'); addGrupo('B'); }}
                className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-surface-dim transition-all border border-outline-variant/20 active:scale-95"
                title="Agregar los 36 residentes (A + B)"
              >
                +36 (TODOS)
              </button>
              <button
                onClick={() => addAgentesPorDiaYGrupo(4, 'manana')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar agentes asignados a Jueves Mañana"
              >
                + JUEVES MAÑANA ({countAgentesPorDiaYGrupo(4, 'manana')})
              </button>
              <button
                onClick={() => addAgentesPorDiaYGrupo(4, 'tarde')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar agentes asignados a Jueves Tarde"
              >
                + JUEVES TARDE ({countAgentesPorDiaYGrupo(4, 'tarde')})
              </button>
              <button
                onClick={() => addAgentesPorDiaYGrupo(5, 'manana')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar agentes asignados a Viernes Mañana"
              >
                + VIERNES MAÑANA ({countAgentesPorDiaYGrupo(5, 'manana')})
              </button>
              <button
                onClick={() => addAgentesPorDiaYGrupo(5, 'tarde')}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
                title="Agregar agentes asignados a Viernes Tarde"
              >
                + VIERNES TARDE ({countAgentesPorDiaYGrupo(5, 'tarde')})
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
