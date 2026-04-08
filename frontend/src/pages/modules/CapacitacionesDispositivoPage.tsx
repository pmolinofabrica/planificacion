import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import EditableCell from '../../components/table/EditableCell';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { VistaCapacitacionesDispositivos } from '../../types/database';

export interface ViewCapDispo extends VistaCapacitacionesDispositivos {
  id_cap_dispo: number;
}

type CapOption = { value: number; label: string; meta?: { fecha: string; grupo: string | null } };

type CapDispoDraft = Omit<ViewCapDispo, 'id_cap_dispo' | 'id_cap' | 'id_dispositivo' | 'tiempo_minutos'> & {
  id_cap_dispo?: number;
  id_cap?: number;
  id_dispositivo?: number;
  tiempo_minutos?: number | null;
};

const newRowTemplate: CapDispoDraft = {
  id_cap: undefined,
  fecha: '',
  tipo_turno: '',
  grupo_capacitacion: 'A',
  tema: '',
  id_dispositivo: undefined,
  nombre_dispositivo: '',
  tiempo_minutos: 60,
};

export default function CapacitacionesDispositivoPage() {
  const [data, setData] = useState<CapDispoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [limit, setLimit] = useState(100);

  const [capOptions, setCapOptions] = useState<CapOption[]>([]);
  const [dispoOptions, setDispoOptions] = useState<{ value: number; label: string }[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');

    const [capsRes, diasRes, disposRes, rowsRes] = await Promise.all([
      supabase.from('capacitaciones').select('id_cap, tema, grupo, id_dia').order('id_cap', { ascending: false }).limit(200),
      supabase.from('dias').select('id_dia, fecha').order('fecha', { ascending: false }).limit(365),
      supabase.from('dispositivos').select('id_dispositivo, nombre_dispositivo').order('nombre_dispositivo'),
      supabase.from('capacitaciones_dispositivos').select('id_cap_dispo, id_cap, id_dispositivo, tiempo_minutos').order('id_cap_dispo', { ascending: false }).limit(limit),
    ]);

    if (capsRes.error) {
      setError('Error al cargar capacitaciones: ' + capsRes.error.message);
    }
    if (disposRes.error) {
      setError(prev => prev || ('Error al cargar dispositivos: ' + disposRes.error!.message));
    }

    const capMap = new Map<number, CapOption>();

    if (capsRes.data && diasRes.data) {
      const diasMap = new Map<number, string>();
      for (const d of diasRes.data as Array<{ id_dia: number; fecha: string }>) diasMap.set(d.id_dia, d.fecha);

      const nextCapOptions = (capsRes.data as Array<{ id_cap: number; tema: string | null; grupo: string | null; id_dia: number | null }>).map((c) => ({
        value: c.id_cap,
        label: `[${c.id_cap}] ${c.tema ?? ''}${c.id_dia ? ` (${diasMap.get(c.id_dia) || ''})` : ''}`,
        meta: { fecha: c.id_dia ? (diasMap.get(c.id_dia) || '') : '', grupo: c.grupo },
      }));
      setCapOptions(nextCapOptions);
      for (const opt of nextCapOptions) capMap.set(opt.value, opt);
    }

    if (disposRes.data) {
      setDispoOptions((disposRes.data as Array<{ id_dispositivo: number; nombre_dispositivo: string }>).map((d) => ({
        value: d.id_dispositivo,
        label: d.nombre_dispositivo,
      })));
    }

    if (rowsRes.error) {
      setError('Error al cargar registros: ' + rowsRes.error.message);
    } else {
      const dispoMap = new Map<number, string>();
      for (const opt of (disposRes.data ?? []) as Array<{ id_dispositivo: number; nombre_dispositivo: string }>) {
        dispoMap.set(opt.id_dispositivo, opt.nombre_dispositivo);
      }

      const mapped = (rowsRes.data ?? [] as Array<{ id_cap: number; id_dispositivo: number | null; id_cap_dispo: number; tiempo_minutos: number | null }>) .map((r) => {
        const cap = capMap.get(r.id_cap);
        return {
          ...r,
          fecha: cap?.meta?.fecha ?? '',
          grupo_capacitacion: cap?.meta?.grupo ?? null,
          tema: cap?.label ? cap.label.replace(/^\[\d+\]\s*/, '').split(' (')[0] : null,
          nombre_dispositivo: dispoMap.get(r.id_dispositivo ?? -1) ?? null,
        } as CapDispoDraft;
      });
      setData(mapped);
      setRefreshKey(Date.now());
    }

    setLoading(false);
  }, [limit]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const customBatchInsert = async (inserts: CapDispoDraft[]) => {
    const successes: CapDispoDraft[] = [];
    const failures: BatchError[] = [];

    const realInserts = inserts.map(i => ({
      id_cap: i.id_cap,
      id_dispositivo: i.id_dispositivo,
      tiempo_minutos: i.tiempo_minutos,
    }));

    for (let i = 0; i < realInserts.length; i++) {
      const row = realInserts[i];
      if (!row.id_cap || !row.id_dispositivo) {
        failures.push({ index: i, row: inserts[i], error: 'Capacitacion o Dispositivo no seleccionados.' });
        continue;
      }

      const { error } = await supabase
        .from('capacitaciones_dispositivos')
        .upsert(row, { onConflict: 'id_cap,id_dispositivo' });

      if (error) failures.push({ index: i, row: inserts[i], error: error.message });
      else successes.push({ ...inserts[i] });
    }

    return { successes, failures };
  };

  const columns = useMemo<ColumnDef<TrackedRow<CapDispoDraft>>[]>(() => {
    const capCol = editableColumn<CapDispoDraft>('id_cap', 'Capacitacion', 'select', capOptions);

    capCol.cell = (props) => {
      const { row, table } = props;
      const handleSave = (val: string) => {
        const meta = table.options.meta as { updateCell: (id: string, field: keyof CapDispoDraft, val: string) => void };
        meta.updateCell(row.original._id, 'id_cap', val);

        const selectedOpt = capOptions.find(o => String(o.value) === String(val));
        if (selectedOpt?.meta) {
          meta.updateCell(row.original._id, 'fecha', selectedOpt.meta.fecha);
          meta.updateCell(row.original._id, 'grupo_capacitacion', selectedOpt.meta.grupo ?? '');
        }
      };

      return (
        <EditableCell
          value={row.original.data.id_cap}
          onSave={handleSave}
          type="select"
          options={capOptions}
        />
      );
    };

    return [
      { id: 'fecha', header: 'Fecha Real', cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.data.fecha || '—'}</span> },
      { id: 'grupo_capacitacion', header: 'Grupo', cell: ({ row }) => <span className="font-bold text-xs">{row.original.data.grupo_capacitacion || '—'}</span> },
      capCol,
      editableColumn<CapDispoDraft>('id_dispositivo', 'Dispositivo', 'select', dispoOptions),
      editableColumn<CapDispoDraft>('tiempo_minutos', 'Minutos Uso', 'number'),
    ];
  }, [capOptions, dispoOptions]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div><h2 className="text-xl font-bold text-gray-800">Capacitaciones - Dispositivo</h2></div>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-1 bg-white text-sm">
          <option value={100}>Ultimos 100</option>
          <option value={500}>Ultimos 500</option>
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<CapDispoDraft>
          key={refreshKey}
          tableName="capacitaciones_dispositivos"
          pkField="id_cap_dispo"
          initialData={data}
          columns={columns}
          onRefresh={fetchRecords}
          buildNewRow={() => ({ ...newRowTemplate })}
          onBatchInsert={customBatchInsert}
          enableClone={true}
        />
      )}
    </div>
  );
}
