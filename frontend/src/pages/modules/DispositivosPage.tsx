import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Dispositivo } from '../../types/database';

const columns: ColumnDef<TrackedRow<Dispositivo>>[] = [
  { id: 'id_dispositivo', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_dispositivo || '—'}</span>, size: 50 },
  editableColumn<Dispositivo>('nombre_dispositivo', 'Nombre'),
  editableColumn<Dispositivo>('piso_dispositivo', 'Piso', 'number'),
  editableColumn<Dispositivo>('activo', 'Activo', 'boolean'),
  editableColumn<Dispositivo>('es_critico', 'Crítico', 'boolean'),
  editableColumn<Dispositivo>('cupo_minimo', 'Cupo Mínimo', 'number'),
  editableColumn<Dispositivo>('cupo_optimo', 'Cupo Óptimo', 'number'),
];

const newDispoTemplate: Dispositivo = {
  id_dispositivo: 0,
  nombre_dispositivo: '',
  piso_dispositivo: 1,
  activo: true,
  es_critico: false,
  cupo_minimo: 1,
  cupo_optimo: 2,
};

export default function DispositivosPage() {
  const [data, setData] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchDispositivos = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('dispositivos')
      .select('*')
      .order('id_dispositivo');

    if (err) {
      setError('Error al cargar dispositivos: ' + err.message);
    } else {
      setData(rows as Dispositivo[] ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDispositivos();
  }, [fetchDispositivos]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Dispositivos Físicos</h2>
      </div>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<Dispositivo>
          key={refreshKey}
          tableName="dispositivos"
          pkField="id_dispositivo"
          initialData={data}
          columns={columns}
          onRefresh={fetchDispositivos}
          buildNewRow={() => ({ ...newDispoTemplate })}
        />
      )}
    </div>
  );
}
