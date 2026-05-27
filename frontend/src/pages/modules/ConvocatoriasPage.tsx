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

type PlaniSelectOption = { value: number; label: string; meta: { fecha_turno: string; tipo_turno: string; id_turno: number }; }
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

const ENTRY_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-purple-100 text-purple-800',
];

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

  const [agentesGruposDias, setAgentesGruposDias] = useState<AgenteGrupoDia[]>([]);
  const [planiOptions, setPlaniOptions] = useState<PlaniSelectOption[]>([]);
  const [bulkPlaniId, setBulkPlaniId] = useState<number | null>(null);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [showCompletar, setShowCompletar] = useState(false);
  const [completarFecha, setCompletarFecha] = useState('');
  const [completarPlani, setCompletarPlani] = useState<number | null>(null);

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

    const [agentesRes, convRes, agdRes, planisRes] = await Promise.all([
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
        .from('agentes_grupos_dias')
        .select('id_agente, dia_semana, grupo'),
      supabase
        .from('vista_planificacion_anio')
        .select('id_plani, fecha, tipo_turno, id_turno')
        .eq('anio', currentYear)
        .eq('mes', filtroMes)
        .order('fecha'),
    ]);

    if (agentesRes.data) setAgentes(agentesRes.data as Agente[]);
    if (agdRes.data) setAgentesGruposDias(agdRes.data as AgenteGrupoDia[]);
    if (planisRes.data) {
      const plans = planisRes.data as Array<{ id_plani: number; fecha: string; tipo_turno: string; id_turno: number }>;
      setPlaniOptions(plans.map(p => ({
        value: p.id_plani,
        label: `[${p.id_plani}] ${p.fecha} - ${p.tipo_turno}`,
        meta: { fecha_turno: p.fecha, tipo_turno: p.tipo_turno, id_turno: p.id_turno },
      })));
    }
    if (convRes.error) {
      setError('Error al cargar convocatorias: ' + convRes.error.message);
    } else {
      setData(convRes.data as ViewConvocatoria[] ?? []);
    }
    setRefreshKey(Date.now());
    setLoading(false);
  }, [filtroMes]);

  useEffect(() => { fetchConvocatorias(); }, [fetchConvocatorias]);

  // Batch update con resolución automática de conflictos por convocatoria_unicidad.
  // Si se cambia id_plani y el (nuevo id_plani, id_agente) ya existe en otra fila,
  // se elimina la fila existente antes de aplicar el update.
  const handleBatchUpdate = async (
    updates: { id: unknown; changes: Partial<ViewConvocatoria> }[],
    rowsById: Map<string, TrackedRow<ViewConvocatoria>>
  ) => {
    const successes: { id: unknown }[] = [];
    const failures: BatchError[] = [];

    for (let i = 0; i < updates.length; i++) {
      const { id, changes } = updates[i];

      if (changes.id_plani !== undefined) {
        const row = rowsById.get(String(id));
        const idAgente = row?.data.id_agente;
        if (idAgente) {
          const { data: conflictRows } = await supabase
            .from('convocatoria')
            .select('id_convocatoria')
            .eq('id_plani', changes.id_plani)
            .eq('id_agente', idAgente)
            .neq('id_convocatoria', id);

          if (conflictRows && conflictRows.length > 0) {
            await supabase
              .from('convocatoria')
              .delete()
              .in('id_convocatoria', (conflictRows as Array<{ id_convocatoria: number }>).map(r => r.id_convocatoria));
          }
        }
      }

      const { error } = await supabase
        .from('convocatoria')
        .update(changes)
        .eq('id_convocatoria', id);

      if (error) {
        failures.push({ index: i, row: { id, changes }, error: error.message });
      } else {
        successes.push({ id });
      }
    }

    return { successes, failures };
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

  const planiMetaForBulk = useMemo(() =>
    planiOptions.find(o => o.value === bulkPlaniId)?.meta ?? null,
    [bulkPlaniId, planiOptions]
  );

  const planiDashboard = useMemo(() => {
    const counts = new Map<number, number>();
    for (const conv of data) {
      counts.set(conv.id_plani, (counts.get(conv.id_plani) ?? 0) + 1);
    }
    return planiOptions.map(p => ({
      id_plani: p.value,
      dayNum: p.meta.fecha_turno ? String(new Date(p.meta.fecha_turno + 'T00:00:00').getDate()) : '--',
      turnoAbbr: p.meta.tipo_turno.split(' ').map(w => w[0]).join('').toUpperCase(),
      turnoFull: p.meta.tipo_turno,
      count: counts.get(p.value) ?? 0,
    }));
  }, [data, planiOptions]);

  const turnoAbbrs = useMemo(() => {
    return [...new Set(planiDashboard.map(r => r.turnoAbbr))].sort();
  }, [planiDashboard]);

  const uniqueDays = useMemo(() => {
    return [...new Set(planiDashboard.map(r => r.dayNum))].sort((a, b) => Number(a) - Number(b));
  }, [planiDashboard]);

  const planiByKey = useMemo(() => {
    const grouped = new Map<string, { id_plani: number; count: number }[]>();
    for (const row of planiDashboard) {
      const key = `${row.dayNum}|${row.turnoAbbr}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ id_plani: row.id_plani, count: row.count });
    }
    return grouped;
  }, [planiDashboard]);

  const visibleDays = useMemo(() => {
    if (selectedTurnos.length === 0) return [];
    return uniqueDays.filter(dayNum =>
      selectedTurnos.some(t => {
        const entries = planiByKey.get(`${dayNum}|${t}`);
        return entries && entries.some(e => e.count > 0);
      })
    );
  }, [uniqueDays, selectedTurnos, planiByKey]);

  const fechasDisponibles = useMemo(() => {
    return [...new Set(planiOptions.map(p => p.meta.fecha_turno))].sort();
  }, [planiOptions]);

  const planesDelDia = useMemo(() => {
    return planiOptions.filter(p => p.meta.fecha_turno === completarFecha);
  }, [planiOptions, completarFecha]);

  const agentesAsignadosEnFecha = useMemo(() => {
    if (!completarFecha) return new Set<number>();
    return new Set(data.filter(c => c.fecha_turno === completarFecha).map(c => c.id_agente));
  }, [data, completarFecha]);

  const asignadosList = useMemo(() => {
    if (!completarFecha) return [];
    return data
      .filter(c => c.fecha_turno === completarFecha)
      .map(c => {
        const [apellido, nombre] = c.agente.split(', ');
        return { id_agente: c.id_agente, agente: `${apellido}, ${nombre?.[0] ?? '?'}.`, turno: c.tipo_turno };
      });
  }, [data, completarFecha]);

  const sinAsignarList = useMemo(() => {
    if (!completarFecha) return [];
    return agentes.filter(a => !agentesAsignadosEnFecha.has(a.id_agente));
  }, [agentes, agentesAsignadosEnFecha, completarFecha]);

  const toggleTurno = (t: string) => {
    setSelectedTurnos(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const agregarCompletar = () => {
    if (!completarPlani || sinAsignarList.length === 0) return;
    const planiMeta = planiOptions.find(o => o.value === completarPlani)?.meta;
    const newRows = sinAsignarList.map(a => makeTemplate({
      dni: a.dni,
      id_agente: a.id_agente,
      agente: `${a.apellido}, ${a.nombre}`,
      id_plani: completarPlani,
      id_turno: planiMeta?.id_turno ?? 0,
      fecha_turno: planiMeta?.fecha_turno ?? '',
      tipo_turno: planiMeta?.tipo_turno ?? '',
    }));
    setBulkPendingRows(prev => [...newRows, ...prev]);
    setShowCompletar(false);
    setCompletarFecha('');
    setCompletarPlani(null);
  };

  // Agregar filas de un grupo completo (A o B)
  const addGrupo = (grupo: 'A' | 'B') => {
    const grupoAgentes = agentes.filter(a => a.grupo_capacitacion === grupo);
    const newRows = grupoAgentes.map(a => makeTemplate({
      dni: a.dni,
      id_agente: a.id_agente,
      agente: `${a.apellido}, ${a.nombre}`,
      id_plani: bulkPlaniId ?? 0,
      id_turno: planiMetaForBulk?.id_turno ?? 0,
      fecha_turno: planiMetaForBulk?.fecha_turno ?? '',
      tipo_turno: planiMetaForBulk?.tipo_turno ?? '',
    }));
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
      .map(a => makeTemplate({
        dni: a.dni,
        id_agente: a.id_agente,
        agente: `${a.apellido}, ${a.nombre}`,
        id_plani: bulkPlaniId ?? 0,
        id_turno: planiMetaForBulk?.id_turno ?? 0,
        fecha_turno: planiMetaForBulk?.fecha_turno ?? '',
        tipo_turno: planiMetaForBulk?.tipo_turno ?? '',
      }));

    setBulkPendingRows(prev => [...newRows, ...prev]);
  };

  const countAgentesPorDiaYGrupo = (diaSemana: number, grupo: 'manana' | 'tarde') =>
    agentesGruposDias.filter(a => a.dia_semana === diaSemana && a.grupo === grupo).length;

  const [bulkPendingRows, setBulkPendingRows] = useState<ViewConvocatoria[]>([]);

  const columns = useMemo<ColumnDef<TrackedRow<ViewConvocatoria>>[]>(() => {
    const planiCol = editableColumn<ViewConvocatoria>('id_plani', 'Planificación', 'select', planiOptions);

    planiCol.cell = (props) => {
      const { row, table } = props;

      const handleSave = (val: string) => {
        const meta = table.options.meta as { updateCell: (id: string, field: keyof ViewConvocatoria, val: string) => void; silentUpdateCell: (id: string, field: keyof ViewConvocatoria, val: string) => void };
        const idPlaniNum = Number(val);
        meta.updateCell(row.original._id, 'id_plani', idPlaniNum ? String(idPlaniNum) : '');

        if (idPlaniNum) {
          const selectedOpt = planiOptions.find(o => o.value === idPlaniNum);
          if (selectedOpt?.meta) {
            meta.updateCell(row.original._id, 'id_turno', String(selectedOpt.meta.id_turno));
            meta.silentUpdateCell(row.original._id, 'fecha_turno', selectedOpt.meta.fecha_turno);
            meta.silentUpdateCell(row.original._id, 'tipo_turno', selectedOpt.meta.tipo_turno);
          }
        }
      };

      return (
        <EditableCell
          value={row.original.data.id_plani}
          onSave={handleSave}
          type="select"
          options={planiOptions}
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
  }, [agentesOptions, planiOptions]);

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
          <button
            onClick={() => setShowCompletar(true)}
            className="bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-xs font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95 whitespace-nowrap"
          >
            Completar Convocatoria
          </button>
        </div>
      </div>

      <div className="mb-6 mx-2 p-4 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="text-xs font-bold text-primary mb-3 font-headline uppercase tracking-wider">Dashboard Planificaciones</div>
        <div className="flex gap-3 flex-wrap mb-3">
          {turnoAbbrs.map(t => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors">
              <input
                type="checkbox"
                checked={selectedTurnos.includes(t)}
                onChange={() => toggleTurno(t)}
                className="accent-primary rounded"
              />
              {t}
            </label>
          ))}
        </div>
        {selectedTurnos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="py-2 px-3 font-semibold text-on-surface-variant">Turno</th>
                  {visibleDays.map(d => (
                    <th key={d} className="py-2 px-3 font-semibold text-on-surface-variant text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedTurnos.map(t => (
                  <tr key={t} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="py-1.5 px-3 font-semibold">{t}</td>
                    {visibleDays.map(d => {
                      const entries = planiByKey.get(`${d}|${t}`) ?? [];
                      return (
                        <td key={d} className="py-1.5 px-2 text-center font-mono text-[15px]">
                          {entries.length === 1 ? (
                            <span className="font-semibold">{entries[0].count}</span>
                          ) : (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {entries.map((e, i) => (
                                <span key={e.id_plani} className={`px-1 rounded text-[13px] font-bold leading-tight ${ENTRY_COLORS[i % ENTRY_COLORS.length]}`}>
                                  {e.count}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold">
                  <td className="py-1.5 px-3 text-primary">Total</td>
                  {visibleDays.map(d => {
                    const total = selectedTurnos.reduce((sum, t) => {
                      const entries = planiByKey.get(`${d}|${t}`) ?? [];
                      return sum + entries.reduce((s, e) => s + e.count, 0);
                    }, 0);
                    return (
                      <td key={d} className="py-1.5 px-3 text-center font-mono text-primary text-[15px]">{total}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-2">Seleccione uno o mas turnos para visualizar.</div>
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
          onBatchUpdate={handleBatchUpdate}
          enableClone={true}
          bulkRows={bulkPendingRows}
          onBulkRowsConsumed={() => setBulkPendingRows([])}
          extraToolbar={
            <div className="flex flex-wrap gap-2 mb-2 lg:mb-0 lg:ml-2 items-center">
              <select
                value={bulkPlaniId ?? ''}
                onChange={(e) => setBulkPlaniId(e.target.value ? Number(e.target.value) : null)}
                className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-1.5 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none font-body min-w-[200px]"
              >
                <option value="">Planificación para precargar...</option>
                {planiOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">+</span>
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
      {showCompletar && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 backdrop-blur-sm" onClick={() => setShowCompletar(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-lg font-bold text-gray-800">Completar Convocatoria</h3>
              <button onClick={() => setShowCompletar(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
              <select
                value={completarFecha}
                onChange={(e) => { setCompletarFecha(e.target.value); setCompletarPlani(null); }}
                className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-1.5 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none font-body w-full"
              >
                <option value="">Seleccionar fecha...</option>
                {fechasDisponibles.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            {completarFecha && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asignados ({asignadosList.length})</h4>
                  <div className="max-h-64 overflow-y-auto border border-outline-variant/20 rounded-lg divide-y divide-outline-variant/10">
                    {asignadosList.map(a => (
                      <div key={a.id_agente} className="py-1.5 px-3 text-sm text-gray-700">{a.agente} <span className="text-xs text-gray-400">- {a.turno}</span></div>
                    ))}
                    {asignadosList.length === 0 && <div className="py-4 text-xs text-gray-400 text-center italic">Sin convocatorias en esta fecha.</div>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sin Asignar ({sinAsignarList.length})</h4>
                  <select
                    value={completarPlani ?? ''}
                    onChange={(e) => setCompletarPlani(e.target.value ? Number(e.target.value) : null)}
                    className="bg-surface-container-low border border-outline-variant/30 rounded-md px-3 py-1.5 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none font-body w-full mb-2"
                  >
                    <option value="">Seleccionar planificacion...</option>
                    {planesDelDia.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <div className="max-h-48 overflow-y-auto border border-outline-variant/20 rounded-lg divide-y divide-outline-variant/10 mb-3">
                    {sinAsignarList.map(a => (
                      <div key={a.id_agente} className="py-1.5 px-3 text-sm text-gray-700">{a.apellido}, {a.nombre[0]}.</div>
                    ))}
                    {sinAsignarList.length === 0 && <div className="py-4 text-xs text-gray-400 text-center italic">Todos los agentes ya estan asignados.</div>}
                  </div>
                  <button
                    onClick={agregarCompletar}
                    disabled={!completarPlani || sinAsignarList.length === 0}
                    className="w-full bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Agregar {sinAsignarList.length} agente(s)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
