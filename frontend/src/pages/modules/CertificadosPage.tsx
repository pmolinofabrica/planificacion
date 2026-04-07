import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { CertificadoView } from '../../types/database';

type CertificadoDraft = Omit<CertificadoView, 'id_certificado'> & { id_certificado?: number };

const columns: ColumnDef<TrackedRow<CertificadoDraft>>[] = [
  { id: 'id_certificado', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_certificado ?? '—'}</span>, size: 50 },
  editableColumn<CertificadoDraft>('id_inasistencia', 'ID Inasistencia', 'number'),
  editableColumn<CertificadoDraft>('id_agente', 'ID Agente', 'number'),
  { id: 'agente', header: 'Agente', cell: ({ row }) => row.original.data.agente || '—' },
  editableColumn<CertificadoDraft>('fecha_inasistencia_justifica', 'Fecha Justificada', 'date'),
  { id: 'fecha_carga', header: 'Carga', cell: ({ row }) => row.original.data.fecha_carga || '—' },
  editableColumn<CertificadoDraft>('observaciones', 'Observaciones'),
];

const newCertificadoTemplate: CertificadoDraft = {
  id_inasistencia: null,
  id_agente: 0,
  agente: '',
  fecha_carga: new Date().toISOString().split('T')[0],
  fecha_inasistencia_justifica: new Date().toISOString().split('T')[0],
  observaciones: null,
};

export default function CertificadosPage() {
  const [data, setData] = useState<CertificadoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchCertificados = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: rows, error: err } = await supabase
      .from('vista_certificados_completa')
      .select('*')
      .order('fecha_inasistencia_justifica', { ascending: false })
      .limit(200);

    if (err) {
      setError('Error al cargar certificados: ' + err.message);
    } else {
      setData((rows as CertificadoDraft[] | null) ?? []);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCertificados();
  }, [fetchCertificados]);

  const customBatchInsert = async (inserts: CertificadoDraft[]) => {
    const successes: CertificadoDraft[] = [];
    const failures: BatchError[] = [];

    const sanitizedInserts = inserts.map(i => ({
      id_inasistencia: i.id_inasistencia || null,
      id_agente: i.id_agente,
      fecha_carga: new Date().toISOString().split('T')[0],
      fecha_inasistencia_justifica: i.fecha_inasistencia_justifica,
      observaciones: i.observaciones
    }));

    for (let i = 0; i < sanitizedInserts.length; i++) {
      const row = sanitizedInserts[i];
      const { data: inserted, error } = await supabase
        .from('certificados')
        .insert(row)
        .select('id_certificado')
        .single();

      if (error) {
        failures.push({ index: i, row: inserts[i], error: error.message });
      } else {
        successes.push({ ...inserts[i], id_certificado: inserted.id_certificado });
      }
    }

    return { successes, failures };
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Certificados</h2>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<CertificadoDraft>
          key={refreshKey}
          tableName="certificados"
          pkField="id_certificado"
          initialData={data}
          columns={columns}
          onRefresh={fetchCertificados}
          buildNewRow={() => ({ ...newCertificadoTemplate })}
          onBatchInsert={customBatchInsert}
        />
      )}
    </div>
  );
}
