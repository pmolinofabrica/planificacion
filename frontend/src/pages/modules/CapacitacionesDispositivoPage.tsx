import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import EditableCell from '../../components/table/EditableCell';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { VistaCapacitacionesDispositivos } from '../../types/database';

export interface ViewCapDispo extends VistaCapacitacionesDispositivos {
  id_pseudo: string;
}

const newRowTemplate: ViewCapDispo = {
  id_pseudo: '',
  id_cap: 0,
  fecha: '',
  tipo_turno: '',
  grupo_capacitacion: 'A',
  tema: '',
  id_dispositivo: 0,
  nombre_dispositivo: '',
  tiempo_minutos: 60,
};

export default function CapacitacionesDispositivoPage() {
  const [data, setData] = useState<ViewCapDispo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [limit, setLimit] = useState(100);

  const [capOptions, setCapOptions] = useState<{value: number, label: string}[]>([]);
  const [dispoOptions, setDispoOptions] = useState<{value: number, label: string}[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');

    // Fetch dropdown options in parallel and the new view
    const [capsRes, disposRes, rowsRes] = await Promise.all([
      // Fetching joined data to get date and group for autofill
      supabase.from('capacitaciones').select(`
        id_cap,
        tema,
        grupo,
        dias ( fecha )
      `).order('id_cap', { ascending: false }).limit(200),
      supabase.from('dispositivos').select('id_dispositivo, nombre_dispositivo').order('nombre_dispositivo'),
      supabase.from('vista_capacitaciones_dispositivos').select('*').limit(limit)
    ]);

    if (capsRes.data) {
      setCapOptions(capsRes.data.map(c => {
        // Safe access to joined dia object depending on how Supabase returns it (array or object)
        const diaArray = Array.isArray(c.dias) ? c.dias : [c.dias];
        const fecha = diaArray[0]?.fecha || '';
        return {
          value: c.id_cap,
          label: `[${c.id_cap}] ${c.tema} ${fecha ? `(${fecha})` : ''}`,
          meta: { fecha, grupo: c.grupo }
        };
      }));
    }
    if (disposRes.data) {
      setDispoOptions(disposRes.data.map(d => ({ value: d.id_dispositivo, label: d.nombre_dispositivo })));
    }

    if (rowsRes.error) {
      setError('Error: ' + rowsRes.error.message);
    } else {
      const mapped = (rowsRes.data as VistaCapacitacionesDispositivos[]).map(r => ({
        ...r,
        id_pseudo: `${r.id_cap}_${r.id_dispositivo || 'nuevo'}_${Math.random()}` // synthetic PK
      }));
      setData(mapped);
      setRefreshKey(Date.now());
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const customBatchInsert = async (inserts: ViewCapDispo[]) => {
    const successes: ViewCapDispo[] = [];
    const failures: BatchError[] = [];

    const realInserts = inserts.map(i => ({
      id_cap: i.id_cap,
      id_dispositivo: i.id_dispositivo,
      tiempo_minutos: i.tiempo_minutos
    }));

    for (let i = 0; i < realInserts.length; i++) {
        const row = realInserts[i];

        // RLS in Supabase might block simple inserts depending on policies (e.g., auth.uid() check on specific roles).
        // Using upsert or ensuring we don't insert invalid IDs
        if (!row.id_cap || !row.id_dispositivo) {
             failures.push({ index: i, row: inserts[i], error: 'Capacitación o Dispositivo no seleccionados.' });
             continue;
        }

        const { error } = await supabase
            .from('capacitaciones_dispositivos')
            .upsert(row, { onConflict: 'id_cap,id_dispositivo' });

        if (error) {
            failures.push({ index: i, row: inserts[i], error: error.message });
        } else {
            successes.push({ ...inserts[i] });
        }
    }
    return { successes, failures };
  };

  const columns = useMemo<ColumnDef<TrackedRow<ViewCapDispo>>[]>(() => {
    // Custom wrapper around editableColumn to autofill related fields when id_cap changes
    const capCol = editableColumn<ViewCapDispo>('id_cap', 'Capacitación (Editar)', 'select', capOptions);

    capCol.cell = (props) => {
      const { row, table } = props;

      const handleSave = (val: string) => {
        const meta = table.options.meta as any;
        meta.updateCell(row.original._id, 'id_cap', val);

        // Find metadata (fecha, grupo) from selected option and autofill it in frontend
        const selectedOpt = (capOptions as any[]).find(o => String(o.value) === String(val));
        if (selectedOpt && selectedOpt.meta) {
           meta.updateCell(row.original._id, 'fecha', selectedOpt.meta.fecha);
           meta.updateCell(row.original._id, 'grupo_capacitacion', selectedOpt.meta.grupo);
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
      editableColumn<ViewCapDispo>('id_dispositivo', 'Dispositivo (Editar)', 'select', dispoOptions),
      editableColumn<ViewCapDispo>('tiempo_minutos', 'Minutos Uso', 'number'),
    ];
  }, [capOptions, dispoOptions]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row justify-between md:items-end gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Capacitaciones → Dispositivo</h2>
        </div>
        <select 
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1 bg-white text-sm"
        >
          <option value={100}>Últimos 100</option>
          <option value={500}>Últimos 500</option>
        </select>
      </div>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<ViewCapDispo>
          key={refreshKey}
          tableName="capacitaciones_dispositivos"
          pkField="id_pseudo"
          initialData={data}
          columns={columns}
          onRefresh={fetchRecords}
          buildNewRow={() => ({ ...newRowTemplate, id_pseudo: `new_${Math.random()}` })}
          onBatchInsert={customBatchInsert}
          enableClone={true}
        />
      )}
    </div>
  );
}
