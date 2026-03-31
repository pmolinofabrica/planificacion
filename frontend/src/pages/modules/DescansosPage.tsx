import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Descanso } from '../../types/database';

const newDescansoTemplate: Descanso = {
  id_desc: 0,
  id_agente: 0,
  dia_solicitado: new Date().toISOString().split('T')[0],
  mes_solicitado: new Date().getMonth() + 1,
  estado: 'pendiente',
  fecha_solicitud: new Date().toISOString().split('T')[0],
  observaciones: null,
};

export default function DescansosPage() {
  const [data, setData] = useState<Descanso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [agentesOptions, setAgentesOptions] = useState<{value: number, label: string}[]>([]);
  const [asignando, setAsignando] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const startDate = new Date(year, filtroMes - 1, 1).toISOString();
    const endDate = new Date(year, filtroMes, 0, 23, 59, 59, 999).toISOString();

    const [agentesRes, descRes] = await Promise.all([
      supabase
        .from('datos_personales')
        .select('id_agente, nombre, apellido, dni')
        .eq('activo', true)
        .order('apellido'),
      supabase
        .from('descansos')
        .select('*')
        .gte('fecha_solicitud', startDate)
        .lte('fecha_solicitud', endDate)
        .order('fecha_solicitud', { ascending: false }),
    ]);

    if (agentesRes.data) {
      setAgentesOptions(agentesRes.data.map(a => ({
        value: a.id_agente,
        label: `${a.apellido}, ${a.nombre} (${a.dni})`
      })));
    }

    if (descRes.error) {
      setError('Error al cargar descansos: ' + descRes.error.message);
    } else {
      // Limpiamos los timestamps de supabase para que el `<input type="date">` de HTML5
      // no colapse ni quede en blanco por recibir horas.
      const formattedData = (descRes.data as Descanso[] || []).map(r => ({
        ...r,
        fecha_solicitud: r.fecha_solicitud ? r.fecha_solicitud.toString().split('T')[0] : null,
        dia_solicitado: r.dia_solicitado ? r.dia_solicitado.toString().split('T')[0] : ''
      }));
      setData(formattedData as Descanso[]);
    }
    setRefreshKey(Date.now());
    setLoading(false);
  }, [filtroMes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const asignarSeleccionados = async (selected: Descanso[]) => {
    if (selected.length === 0) return;
    setAsignando(true);
    setError('');
    
    // Filtramos solo los que no están asignados aún por precaución
    const toUpdate = selected.filter(d => d.estado !== 'asignado').map(d => ({
      id_desc: d.id_desc,
      estado: 'asignado'
      // No modificamos nada más. PostgreSQL disparará 'func_asignar_descanso_aprobado'
    }));

    if (toUpdate.length === 0) {
      setAsignando(false);
      return;
    }

    try {
      // Upsert batch en supabase directamente
      const { error: err } = await supabase
        .from('descansos')
        .upsert(toUpdate, { onConflict: 'id_desc' });
      
      if (err) throw err;
      
      // Refrescamos luego del procesamiento en batch
      await fetchData();
    } catch (e: any) {
      setError('Error al asignar masivamente: ' + e.message);
    } finally {
      setAsignando(false);
    }
  };

  const columns = useMemo<ColumnDef<TrackedRow<Descanso>>[]>(() => [
    { id: 'id_desc', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_desc || '—'}</span>, size: 50 },
    editableColumn<Descanso>('id_agente', 'Agente', 'select', agentesOptions),
    editableColumn<Descanso>('fecha_solicitud', 'Fecha de Carga', 'date'),
    editableColumn<Descanso>('dia_solicitado', 'Día a Tomar', 'date'),
    editableColumn<Descanso>('mes_solicitado', 'Mes', 'number'),
    editableColumn<Descanso>('estado', 'Estado', 'select', [
      { value: 'pendiente', label: 'Pendiente' },
      { value: 'asignado', label: 'Asignado' },
      { value: 'cancelado', label: 'Cancelado' }
    ]),
    editableColumn<Descanso>('observaciones', 'Observaciones'),
  ], [agentesOptions]);

  const massActions = [
    {
      label: asignando ? 'Asignando...' : `✅ Asignar Descanso`,
      onClick: asignarSeleccionados,
      className: 'bg-teal-600 hover:bg-teal-700 disabled:opacity-50 font-semibold'
    }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Registro de Descansos Compensatorios</h2>
        </div>
        <div className="flex gap-2">
          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-teal-400"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
        </div>
      </div>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-3 text-teal-600" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"></path>
          </svg>
          Cargando registros...
        </div>
      ) : (
        <DataTable<Descanso>
          key={refreshKey}
          tableName="descansos"
          pkField="id_desc"
          initialData={data}
          columns={columns}
          onRefresh={fetchData}
          buildNewRow={() => ({ ...newDescansoTemplate })}
          customMassActions={massActions}
        />
      )}
    </div>
  );
}
