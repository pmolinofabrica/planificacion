import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Capacitacion } from '../../types/database';

type CapacitacionDraft = Omit<Capacitacion, 'id_cap'> & { id_cap?: number };

const newCapacitacionTemplate: CapacitacionDraft = {
  id_dia: 0,
  id_turno: null,
  coordinador_cap: 0,
  tema: '',
  grupo: null,
  observaciones: null,
};

export default function CapacitacionesPage() {
  const [data, setData] = useState<CapacitacionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [limit, setLimit] = useState(100);

  const [diasOptions, setDiasOptions] = useState<{ value: number; label: string }[]>([]);
  const [turnosOptions, setTurnosOptions] = useState<{ value: number; label: string }[]>([]);

  const fetchCaps = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: diasRes } = await supabase
      .from('dias')
      .select('id_dia, fecha')
      .order('fecha', { ascending: false })
      .limit(365);
    if (diasRes) {
      setDiasOptions((diasRes as Array<{ id_dia: number; fecha: string }>).map((d) => ({ value: d.id_dia, label: d.fecha })));
    }

    const { data: turnosRes } = await supabase
      .from('turnos')
      .select('id_turno, tipo_turno')
      .eq('activo', true);
    if (turnosRes) {
      setTurnosOptions((turnosRes as Array<{ id_turno: number; tipo_turno: string }>).map((t) => ({ value: t.id_turno, label: t.tipo_turno })));
    }

    const { data: rows, error: err } = await supabase
      .from('capacitaciones')
      .select('*')
      .order('id_cap', { ascending: false })
      .limit(limit);

    if (err) {
      setError('Error al cargar capacitaciones: ' + err.message);
    } else {
      setData((rows as CapacitacionDraft[] | null) ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchCaps();
  }, [fetchCaps]);

  const columns = useMemo<ColumnDef<TrackedRow<CapacitacionDraft>>[]>(() => [
    {
      id: 'id_cap',
      header: 'ID',
      accessorFn: row => row.data.id_cap,
      cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_cap ?? '—'}</span>,
      size: 50,
    },
    editableColumn<CapacitacionDraft>('id_dia', 'Día', 'select', diasOptions),
    editableColumn<CapacitacionDraft>('id_turno', 'Turno', 'select', turnosOptions),
    editableColumn<CapacitacionDraft>('coordinador_cap', 'Coord. (ID Agente)', 'number'),
    editableColumn<CapacitacionDraft>('tema', 'Tema'),
    editableColumn<CapacitacionDraft>('grupo', 'Grupo'),
    editableColumn<CapacitacionDraft>('observaciones', 'Observaciones'),
  ], [diasOptions, turnosOptions]);

  return (
    <div>
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Capacitaciones</h2>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1 bg-white"
        >
          <option value={100}>Ultimas 100</option>
          <option value={500}>Ultimas 500</option>
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<CapacitacionDraft>
          key={refreshKey}
          tableName="capacitaciones"
          pkField="id_cap"
          initialData={data}
          columns={columns}
          onRefresh={fetchCaps}
          buildNewRow={() => ({ ...newCapacitacionTemplate })}
        />
      )}
    </div>
  );
}
