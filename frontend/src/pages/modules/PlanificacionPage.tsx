import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import { batchInsert } from '../../utils/batch';
import type { BatchError } from '../../types/table';

export interface Planificacion {
  id_plani?: number;
  id_dia: number;
  id_turno: number;
  cant_residentes_plan: number | null;
  cant_visit: number | null;
  grupo: string | null;
  plani_notas: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export default function PlanificacionPage() {
  const [data, setData] = useState<Planificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [filtroMes, setFiltroMes] = useState(currentMonth);

  // Catálogos para los selectores
  const [diasOptions, setDiasOptions] = useState<{value: number, label: string}[]>([]);
  const [turnosOptions, setTurnosOptions] = useState<{value: number, label: string}[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Cargar Días del mes seleccionado
      const { data: diasRes, error: errDias } = await supabase
        .from('dias')
        .select('id_dia, fecha, es_feriado')
        .eq('anio', currentYear)
        .eq('mes', filtroMes)
        .order('fecha');
      if (errDias) throw errDias;

      const dOpts = (diasRes || []).map(d => ({
        value: d.id_dia,
        label: `${d.fecha}${d.es_feriado ? ' (Feriado)' : ''}`
      }));
      setDiasOptions(dOpts);

      // 2. Cargar Turnos Activos
      const { data: turnosRes, error: errTurnos } = await supabase
        .from('turnos')
        .select('id_turno, tipo_turno')
        .eq('activo', true)
        .order('id_turno');
      if (errTurnos) throw errTurnos;

      const tOpts = (turnosRes || []).map(t => ({
        value: t.id_turno,
        label: t.tipo_turno
      }));
      setTurnosOptions(tOpts);

      // Si no hay días cargados (ej. mes vacío en db), evitamos la query in(_) y dejamos data en []
      if (dOpts.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // 3. Cargar Planificaciones de los días de ese mes
      const idDias = (diasRes || []).map(d => d.id_dia);
      const { data: planiRes, error: errPlani } = await supabase
        .from('planificacion')
        .select('*')
        .in('id_dia', idDias)
        .order('id_dia')
        .order('id_turno');
      if (errPlani) throw errPlani;

      setData((planiRes || []) as Planificacion[]);
      setRefreshKey(Date.now());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      setError('Error al cargar datos: ' + message);
    } finally {
      setLoading(false);
    }
  }, [filtroMes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = useMemo<ColumnDef<TrackedRow<Planificacion>>[]>(() => [
    { id: 'id_plani', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_plani || '—'}</span>, size: 50 },
    editableColumn<Planificacion>('id_dia', 'Día', 'select', diasOptions),
    editableColumn<Planificacion>('id_turno', 'Turno', 'select', turnosOptions),
    editableColumn<Planificacion>('cant_residentes_plan', 'Cupo Plani', 'number'),
    editableColumn<Planificacion>('grupo', 'Grupo (A/B)', 'select', [
      { value: 'A', label: 'Grupo A' },
      { value: 'B', label: 'Grupo B' },
      // Dejamos un valor extra o null implícito si lo borran, EditableCell soporta esto o requiere tipado riguroso, pero 'text' también sirve.
      // Si el usuario quiere borrar el grupo, el Select lo dejará en string vacío.
    ]),
    editableColumn<Planificacion>('cant_visit', 'Cupo Visitas', 'number'),
    editableColumn<Planificacion>('hora_inicio', 'H. Inicio', 'time'),
    editableColumn<Planificacion>('hora_fin', 'H. Fin', 'time'),
    editableColumn<Planificacion>('plani_notas', 'Notas'),
  ], [diasOptions, turnosOptions]);

  // Modificamos el template para que tome por defecto el primer día del mes y el primer turno si existen
  const buildCurrentTemplate = () => ({
    id_dia: diasOptions.length > 0 ? diasOptions[0].value : 0,
    id_turno: turnosOptions.length > 0 ? turnosOptions[0].value : 0,
    cant_residentes_plan: 0,
    cant_visit: 0,
    grupo: null,
    plani_notas: null,
    hora_inicio: null,
    hora_fin: null,
  });

  const insertPlanificacionRows = async (rows: Planificacion[]): Promise<{ successes: Planificacion[]; failures: BatchError[] }> => {
    // Dejar que Supabase asigne id_plani al crear nuevas filas.
    const sanitizedRows = rows.map((row) => {
      const sanitized = { ...row } as Omit<Planificacion, 'id_plani'> & Partial<Pick<Planificacion, 'id_plani'>>;
      delete sanitized.id_plani;
      return sanitized;
    });
    return batchInsert<Omit<Planificacion, 'id_plani'>>('planificacion', sanitizedRows) as Promise<{ successes: Planificacion[]; failures: BatchError[] }>;
  };

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Planificación Base</h2>
        </div>
        <div className="flex gap-2 items-center">
          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-400"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path>
          </svg>
          Cargando matriz del mes...
        </div>
      ) : (
        <DataTable<Planificacion>
          key={refreshKey}
          tableName="planificacion"
          pkField="id_plani"
          initialData={data}
          columns={columns}
          onRefresh={fetchData}
          buildNewRow={buildCurrentTemplate}
          onBatchInsert={insertPlanificacionRows}
          enableClone={true}
        />
      )}
    </div>
  );
}
