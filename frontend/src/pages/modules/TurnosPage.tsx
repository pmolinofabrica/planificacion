import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';

interface Turno {
  id_turno: number;
  tipo_turno: string;
  descripcion: string | null;
  cant_horas: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  solo_semana: boolean | null;
  activo: boolean | null;
}

const columns: ColumnDef<TrackedRow<Turno>>[] = [
  { id: 'id_turno', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_turno || '—'}</span>, size: 50 },
  editableColumn<Turno>('tipo_turno', 'Tipo de turno'),
  editableColumn<Turno>('descripcion', 'Descripción'),
  editableColumn<Turno>('cant_horas', 'Horas', 'number'),
  editableColumn<Turno>('hora_inicio', 'Inicio', 'time'),
  editableColumn<Turno>('hora_fin', 'Fin', 'time'),
  editableColumn<Turno>('solo_semana', 'Solo semana', 'boolean'),
  editableColumn<Turno>('activo', 'Activo', 'boolean'),
];

const newTurnoTemplate: Turno = {
  id_turno: 0,
  tipo_turno: '',
  descripcion: null,
  cant_horas: null,
  hora_inicio: null,
  hora_fin: null,
  solo_semana: null,
  activo: true,
};

export default function TurnosPage() {
  const [data, setData] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('turnos')
      .select('*')
      .order('id_turno');

    if (err) {
      setError('Error al cargar turnos: ' + err.message);
    } else {
      setData(rows ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Cargando turnos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Administrar Turnos</h2>
      </div>
      <DataTable<Turno>
        key={refreshKey}
        tableName="turnos"
        pkField="id_turno"
        initialData={data}
        columns={columns}
        onRefresh={fetchTurnos}
        buildNewRow={() => ({ ...newTurnoTemplate })}
      />
    </div>
  );
}
