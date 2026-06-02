import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { CertificadoServicioView } from '../../types/database';

type CertServDraft = Omit<CertificadoServicioView, 'id_cert_serv'> & { id_cert_serv?: number };

export default function CertServPage() {
  const [data, setData] = useState<CertServDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [agentesOptions, setAgentesOptions] = useState<{ value: number; label: string }[]>([]);
  const [inasistenciasOptions, setInasistenciasOptions] = useState<{ value: number; label: string; id_agente: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const [certRes, agentesRes, inasRes] = await Promise.all([
      supabase.from('vista_cert_servicio').select('*').order('created_at', { ascending: false }),
      supabase.from('datos_personales').select('id_agente, nombre, apellido, dni').eq('activo', true).order('apellido'),
      supabase.from('inasistencias').select('id_inasistencia, id_agente, fecha_inasistencia, motivo').eq('genera_descuento', true).gte('fecha_inasistencia', `${year}-01-01`).lte('fecha_inasistencia', `${year}-12-31`).order('fecha_inasistencia', { ascending: false }),
    ]);

    if (agentesRes.data) {
      setAgentesOptions((agentesRes.data as Array<{ id_agente: number; nombre: string; apellido: string }>).map(a => ({ value: a.id_agente, label: `${a.apellido}, ${a.nombre}` })));
    }

    if (inasRes.data) {
      setInasistenciasOptions((inasRes.data as Array<{ id_inasistencia: number; id_agente: number; fecha_inasistencia: string; motivo: string }>).map(i => ({
        value: i.id_inasistencia,
        label: `${i.fecha_inasistencia} - ${i.motivo}`,
        id_agente: i.id_agente,
      })));
    }

    if (certRes.error) {
      setError('Error al cargar certificados: ' + certRes.error.message);
    } else {
      setData((certRes.data as CertServDraft[] ?? []).map(r => ({
        ...r,
        created_at: r.created_at ? r.created_at.toString().split('T')[0] : null,
      })));
    }
    setRefreshKey(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const customBatchInsert = async (inserts: CertServDraft[]) => {
    const successes: CertServDraft[] = [];
    const failures: BatchError[] = [];

    for (let i = 0; i < inserts.length; i++) {
      const row = inserts[i];
      if (!row.id_agente || !row.id_inasistencia) {
        failures.push({ index: i, row, error: 'Falta Agente o Inasistencia' });
        continue;
      }
      const { data: inserted, error: err } = await supabase
        .from('certificado_servicio')
        .insert({
          id_agente: row.id_agente,
          id_inasistencia: row.id_inasistencia,
          horas_descontar: row.horas_descontar,
          cuerpo_texto: row.cuerpo_texto,
        })
        .select('id_cert_serv')
        .single();

      if (err) {
        failures.push({ index: i, row, error: err.message });
      } else {
        successes.push({ ...row, id_cert_serv: inserted.id_cert_serv });
      }
    }
    return { successes, failures };
  };

  const idInasistenciaOptions = useMemo(() => {
    return inasistenciasOptions.map(i => ({ value: i.value, label: i.label }));
  }, [inasistenciasOptions]);

  const columns = useMemo<ColumnDef<TrackedRow<CertServDraft>>[]>(() => [
    { id: 'id_cert_serv', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_cert_serv ?? '—'}</span>, size: 50 },
    editableColumn<CertServDraft>('id_agente', 'Agente', 'select', agentesOptions),
    editableColumn<CertServDraft>('id_inasistencia', 'Inasistencia', 'select', idInasistenciaOptions),
    { id: 'fecha_inasistencia', accessorFn: row => row.data.fecha_inasistencia, header: 'Fecha Inas.', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.fecha_inasistencia || '—'}</span> },
    { id: 'motivo_inasistencia', accessorFn: row => row.data.motivo_inasistencia, header: 'Motivo', cell: ({ row }) => <span className="text-xs">{row.original.data.motivo_inasistencia || '—'}</span> },
    { id: 'horas_convocatoria', header: 'Hs. Conv.', cell: ({ row }) => <span className="font-mono text-xs">{row.original.data.horas_convocatoria ?? '—'}</span> },
    editableColumn<CertServDraft>('horas_descontar', 'Hs. Descontar', 'number'),
    editableColumn<CertServDraft>('cuerpo_texto', 'Cuerpo'),
  ], [agentesOptions, idInasistenciaOptions]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-gray-800">Certificados de Servicio</h2></div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando certificados...</div>
      ) : (
        <DataTable<CertServDraft>
          key={refreshKey}
          tableName="certificado_servicio"
          pkField="id_cert_serv"
          initialData={data}
          columns={columns}
          onRefresh={fetchData}
          buildNewRow={() => ({
            id_agente: 0,
            agente: '',
            dni: '',
            id_inasistencia: 0,
            fecha_inasistencia: '',
            motivo_inasistencia: '',
            horas_descontar: 0,
            cuerpo_texto: null,
            created_at: null,
            horas_convocatoria: 0,
          })}
          onBatchInsert={customBatchInsert}
        />
      )}
    </div>
  );
}
