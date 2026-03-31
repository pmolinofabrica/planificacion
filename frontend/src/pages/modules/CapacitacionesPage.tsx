import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Capacitacion } from '../../types/database';

const columns: ColumnDef<TrackedRow<Capacitacion>>[] = [
  { id: 'id_cap', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_cap || '—'}</span>, size: 50 },
  editableColumn<Capacitacion>('id_dia', 'ID Día', 'number'),
  editableColumn<Capacitacion>('id_turno', 'ID Turno', 'number'),
  editableColumn<Capacitacion>('coordinador_cap', 'Coord. (ID Agente)', 'number'),
  editableColumn<Capacitacion>('tema', 'Tema'),
  editableColumn<Capacitacion>('grupo', 'Grupo'),
  editableColumn<Capacitacion>('observaciones', 'Observaciones'),
];

const newCapacitacionTemplate: Capacitacion = {
  id_cap: 0,
  id_dia: 0,
  id_turno: null,
  coordinador_cap: 0,
  tema: '',
  grupo: null,
  observaciones: null,
};

export default function CapacitacionesPage() {
  const [data, setData] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [limit, setLimit] = useState(100);

  const fetchCaps = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('capacitaciones')
      .select('*')
      .order('id_cap', { ascending: false })
      .limit(limit);

    if (err) {
      setError('Error al cargar capacitaciones: ' + err.message);
    } else {
      setData(rows as Capacitacion[] ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchCaps();
  }, [fetchCaps]);

  return (
    <div>
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Capacitaciones</h2>
          <p className="text-sm text-gray-500">Catálogo general de capacitaciones.</p>
        </div>
        <select 
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1 bg-white"
        >
          <option value={100}>Últimas 100</option>
          <option value={500}>Últimas 500</option>
        </select>
      </div>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<Capacitacion>
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
