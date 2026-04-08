import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Agente } from '../../types/database';

type AgenteDraft = Omit<Agente, 'id_agente'> & { id_agente?: number };

const columns: ColumnDef<TrackedRow<AgenteDraft>>[] = [
  { id: 'id_agente', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_agente ?? '—'}</span>, size: 50 },
  editableColumn<AgenteDraft>('nombre', 'Nombre'),
  editableColumn<AgenteDraft>('apellido', 'Apellido'),
  editableColumn<AgenteDraft>('dni', 'DNI'),
  editableColumn<AgenteDraft>('hs_semana_actual', 'Hs/Semana', 'number'),
  editableColumn<AgenteDraft>('anio_residencia', 'Anio Res.'),
  editableColumn<AgenteDraft>('hospital_referencia', 'Hosp. Ref.'),
  editableColumn<AgenteDraft>('cohorte', 'Cohorte', 'number'),
  editableColumn<AgenteDraft>('grupo_capacitacion', 'Grupo', 'select', [
    { value: 'A', label: 'Grupo A' },
    { value: 'B', label: 'Grupo B' },
  ]),
];

const newAgenteTemplate: AgenteDraft = {
  nombre: '',
  apellido: '',
  dni: '',
  hs_semana_actual: 48,
  anio_residencia: '1',
  hospital_referencia: '',
  cohorte: new Date().getFullYear(),
  grupo_capacitacion: null,
};

export default function AgentesPage() {
  const [data, setData] = useState<AgenteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchAgentes = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('datos_personales')
      .select('*')
      .eq('cohorte', new Date().getFullYear())
      .order('nombre');

    if (err) {
      setError('Error al cargar agentes: ' + err.message);
    } else {
      setData((rows as AgenteDraft[] | null) ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgentes();
  }, [fetchAgentes]);

  if (loading && data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400">Cargando agentes...</div>;
  }

  return (
    <div>
      <div className="mb-4"><h2 className="text-xl font-bold text-gray-800">Agentes</h2></div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <DataTable<AgenteDraft>
        key={refreshKey}
        tableName="datos_personales"
        pkField="id_agente"
        initialData={data}
        columns={columns}
        onRefresh={fetchAgentes}
        buildNewRow={() => ({ ...newAgenteTemplate })}
      />
    </div>
  );
}
