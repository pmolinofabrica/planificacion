import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { InasistenciaView } from '../../types/database';
import InasistenciasPanel from '../../components/modules/InasistenciasPanel';

type InasistenciaDraft = Omit<InasistenciaView, 'id_inasistencia'> & { id_inasistencia?: number };

type AgentOption = { id_agente: number; apellido: string; nombre: string; dni: string };

const MOTIVO_OPTIONS = [
  { value: 'MEDICO', label: 'Medico' },
  { value: 'ESTUDIO', label: 'Estudio' },
  { value: 'IMPREVISTO', label: 'Imprevisto' },
  { value: 'OTRO_JUSTIFICADA', label: 'Otro Justificada' },
  { value: 'INJUSTIFICADA', label: 'Injustificada' },
];

const newInasistenciaTemplate: InasistenciaDraft = {
  id_agente: 0,
  agente: '',
  dni: '',
  fecha_inasistencia: new Date().toISOString().split('T')[0],
  anio: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  motivo: '',
  estado: 'Pendiente',
  requiere_certificado: true,
  "6ta_tardanza": false,
  observaciones: null,
  fecha_aviso: new Date().toISOString(),
};

export default function InasistenciasPage() {
  const [data, setData] = useState<InasistenciaDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [filtroMes, setFiltroMes] = useState(currentDate.getMonth() + 1);

  useEffect(() => {
    supabase
      .from('datos_personales')
      .select('id_agente, apellido, nombre, dni')
      .eq('activo', true)
      .eq('cohorte', currentYear)
      .order('apellido')
      .then(({ data: agents }) => {
        setAgentOptions((agents ?? []) as AgentOption[]);
      });
  }, []);

  const columns: ColumnDef<TrackedRow<InasistenciaDraft>>[] = useMemo(() => [
    { id: 'id_inasistencia', accessorFn: row => row.data.id_inasistencia, header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_inasistencia ?? '—'}</span>, size: 50 },
    {
      id: 'id_agente',
      accessorFn: row => row.data.id_agente,
      header: 'Agente',
      cell: ({ row, table }) => {
        const meta = table.options.meta as { updateCell: (id: string, field: keyof InasistenciaDraft, val: string) => void };
        const value = row.original.data.id_agente;
        return (
          <select
            value={value ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const agent = agentOptions.find(a => a.id_agente === id);
              meta.updateCell(row.original._id, 'id_agente', String(id));
              if (agent) {
                meta.updateCell(row.original._id, 'agente', `${agent.apellido}, ${agent.nombre}`);
                meta.updateCell(row.original._id, 'dni', agent.dni);
              }
            }}
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full pr-6"
          >
            <option value="">—</option>
            {agentOptions.map(a => (
              <option key={a.id_agente} value={a.id_agente}>
                {a.apellido}, {a.nombre}
              </option>
            ))}
          </select>
        );
      },
      size: 180,
    },
    { id: 'agente', accessorFn: row => row.data.agente, header: 'Nombre', cell: ({ row }) => row.original.data.agente || '—' },
    { id: 'dni', accessorFn: row => row.data.dni, header: 'DNI', cell: ({ row }) => row.original.data.dni || '—' },
    editableColumn<InasistenciaDraft>('fecha_inasistencia', 'Fecha'),
    editableColumn<InasistenciaDraft>('motivo', 'Motivo', 'select', MOTIVO_OPTIONS),
    editableColumn<InasistenciaDraft>('estado', 'Estado'),
    editableColumn<InasistenciaDraft>('requiere_certificado', 'Req. Cert.', 'boolean'),
    editableColumn<InasistenciaDraft>('6ta_tardanza', '6ta T.', 'boolean'),
    editableColumn<InasistenciaDraft>('observaciones', 'Obs.'),
  ], [agentOptions]);

  const fetchInasistencias = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('vista_inasistencias_completa')
      .select('*')
      .eq('anio', currentYear)
      .eq('mes', filtroMes)
      .order('fecha_inasistencia', { ascending: false });

    if (err) {
      setError('Error al cargar inasistencias: ' + err.message);
    } else {
      setData((rows as InasistenciaDraft[] | null) ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, [filtroMes]);

  useEffect(() => { fetchInasistencias(); }, [fetchInasistencias]);

  const customBatchInsert = async (inserts: InasistenciaDraft[]) => {
    const successes: InasistenciaDraft[] = [];
    const failures: BatchError[] = [];

    const sanitizedInserts = inserts.map(i => ({
      id_agente: i.id_agente,
      fecha_inasistencia: i.fecha_inasistencia,
      fecha_aviso: i.fecha_aviso || null,
      motivo: i.motivo,
      estado: i.estado,
      requiere_certificado: i.requiere_certificado,
      "6ta_tardanza": i["6ta_tardanza"],
      observaciones: i.observaciones
    }));

    for (let i = 0; i < sanitizedInserts.length; i++) {
      const row = sanitizedInserts[i];
      const { data: inserted, error } = await supabase
        .from('inasistencias')
        .insert(row)
        .select('id_inasistencia')
        .single();

      if (error) {
        failures.push({ index: i, row: inserts[i], error: error.message });
      } else {
        successes.push({ ...inserts[i], id_inasistencia: inserted.id_inasistencia });
      }
    }

    return { successes, failures };
  };

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-gray-800">Inasistencias</h2></div>
        <div className="flex gap-2">
          <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Mes {m}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="mb-6">
        <InasistenciasPanel />
      </div>

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<InasistenciaDraft>
          key={refreshKey}
          tableName="inasistencias"
          pkField="id_inasistencia"
          initialData={data}
          columns={columns}
          onRefresh={fetchInasistencias}
          buildNewRow={() => ({ ...newInasistenciaTemplate })}
          onBatchInsert={customBatchInsert}
        />
      )}
    </div>
  );
}
