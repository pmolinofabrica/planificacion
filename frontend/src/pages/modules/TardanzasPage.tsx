import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';

const ACCIONES = [
  { value: 'genera descuento', label: 'Genera Descuento' },
  { value: 'genera imprevisto', label: 'Genera Imprevisto' },
] as const;

type Tardanza = {
  id_tardanza: number;
  id_agente: number;
  fecha: string;
  accion_aplicada: string | null;
  observaciones: string | null;
  created_at: string | null;
};

type TardanzaDraft = Omit<Tardanza, 'id_tardanza'> & { id_tardanza?: number };

const newTardanzaTemplate: TardanzaDraft = {
  id_agente: 0,
  fecha: new Date().toISOString().split('T')[0],
  accion_aplicada: null,
  observaciones: null,
  created_at: null,
};

export default function TardanzasPage() {
  const [data, setData] = useState<TardanzaDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [agentesOptions, setAgentesOptions] = useState<{value: number, label: string}[]>([]);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [latestDate, setLatestDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [agentesRes, tardanzasRes] = await Promise.all([
      supabase.from('datos_personales').select('id_agente, nombre, apellido, dni').eq('activo', true).order('apellido'),
      supabase
        .from('tardanzas')
        .select('*')
        .gte('fecha', `${filtroAnio}-01-01`)
        .lte('fecha', `${filtroAnio}-12-31`)
        .order('fecha', { ascending: false }),
    ]);

    if (agentesRes.data) {
      setAgentesOptions(
        (agentesRes.data as Array<{ id_agente: number; nombre: string; apellido: string; dni: string }>)
          .map((a) => ({ value: a.id_agente, label: `${a.apellido}, ${a.nombre} (${a.dni})` }))
      );
    }

    if (tardanzasRes.error) {
      setError('Error al cargar tardanzas: ' + tardanzasRes.error.message);
      setData([]);
    } else {
      const raw = (tardanzasRes.data as TardanzaDraft[] || []).map(r => ({
        ...r,
        fecha: r.fecha ? r.fecha.toString().split('T')[0] : '',
        created_at: r.created_at ? r.created_at.toString().split('T')[0] : null,
      }));

      raw.sort((a, b) => {
        const da = a.created_at ?? '';
        const db = b.created_at ?? '';
        return db.localeCompare(da);
      });

      setLatestDate(raw.length > 0 ? (raw[0].created_at ?? null) : null);
      setData(raw);
    }

    setRefreshVersion((v) => v + 1);
    setLoading(false);
  }, [filtroAnio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo<ColumnDef<TrackedRow<TardanzaDraft>>[]>(() => [
    { id: 'id_tardanza', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_tardanza ?? '—'}</span>, size: 50 },
    editableColumn<TardanzaDraft>('id_agente', 'Agente', 'select', agentesOptions),
    editableColumn<TardanzaDraft>('fecha', 'Fecha', 'date'),
    editableColumn<TardanzaDraft>('accion_aplicada', 'Acción', 'select', [...ACCIONES]),
    editableColumn<TardanzaDraft>('observaciones', 'Observaciones'),
    { id: 'created_at', header: 'Fecha de Carga', cell: ({ row }) => {
      const date = row.original.data.created_at;
      const isLatest = date && date === latestDate;
      return <span className={`text-xs ${isLatest ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>{date ?? '—'}</span>;
    }, size: 100 },
  ], [agentesOptions]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-gray-800">Registro de Tardanzas</h2></div>
        <div className="flex gap-2 items-center">
          <label className="text-xs font-semibold text-gray-500">Año</label>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-teal-400"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros…</div>
      ) : (
        <DataTable<TardanzaDraft>
          key={refreshVersion}
          tableName="tardanzas"
          pkField="id_tardanza"
          deleteMode="immediate"
          initialData={data}
          columns={columns}
          onRefresh={fetchData}
          buildNewRow={() => ({ ...newTardanzaTemplate, fecha: new Date().toISOString().split('T')[0] })}
        />
      )}
    </div>
  );
}
