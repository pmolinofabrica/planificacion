import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { InasistenciaView } from '../../types/database';

const columns: ColumnDef<TrackedRow<InasistenciaView>>[] = [
  { id: 'id_inasistencia', accessorFn: row => row.data.id_inasistencia, header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_inasistencia || '—'}</span>, size: 50 },
  editableColumn<InasistenciaView>('id_agente', 'ID Agente (Creación)', 'number'),
  { id: 'agente', accessorFn: row => row.data.agente, header: 'Agente', cell: ({ row }) => row.original.data.agente || '—' },
  { id: 'dni', accessorFn: row => row.data.dni, header: 'DNI', cell: ({ row }) => row.original.data.dni || '—' },
  editableColumn<InasistenciaView>('fecha_inasistencia', 'Fecha Inasistencia'),
  editableColumn<InasistenciaView>('motivo', 'Motivo'),
  editableColumn<InasistenciaView>('estado', 'Estado'),
  editableColumn<InasistenciaView>('requiere_certificado', 'Req. Certificado', 'boolean'),
  editableColumn<InasistenciaView>('observaciones', 'Observaciones'),
];

const newInasistenciaTemplate: InasistenciaView = {
  id_inasistencia: 0,
  id_agente: 0,
  agente: '',
  dni: '',
  fecha_inasistencia: new Date().toISOString().split('T')[0],
  anio: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  motivo: 'ENFERMEDAD',
  estado: 'PENDIENTE',
  requiere_certificado: true,
  observaciones: null,
  fecha_aviso: new Date().toISOString(),
};

export default function InasistenciasPage() {
  const [data, setData] = useState<InasistenciaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [filtroMes, setFiltroMes] = useState(currentDate.getMonth() + 1);

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
      setData(rows as InasistenciaView[] ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, [filtroMes]);

  useEffect(() => {
    fetchInasistencias();
  }, [fetchInasistencias]);

  const customBatchInsert = async (inserts: InasistenciaView[]) => {
    const successes: InasistenciaView[] = [];
    const failures: BatchError[] = [];

    // Map to actual DB table fields to avoid relationship/view column errors
    const sanitizedInserts = inserts.map(i => ({
      id_agente: i.id_agente,
      fecha_inasistencia: i.fecha_inasistencia,
      fecha_aviso: i.fecha_aviso || null,
      motivo: i.motivo,
      estado: i.estado,
      requiere_certificado: i.requiere_certificado,
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
        <div>
          <h2 className="text-xl font-bold text-gray-800">Inasistencias</h2>
        </div>
        <div className="flex gap-2">
          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
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
          Cargando registros...
        </div>
      ) : (
        <DataTable<InasistenciaView>
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
