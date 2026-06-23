import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { InasistenciaView } from '../../types/database';

type InasistenciaDraft = Omit<InasistenciaView, 'id_inasistencia'> & { id_inasistencia?: number };

type AgentOption = { id_agente: number; apellido: string; nombre: string; dni: string };

type DayCardRow = {
  id_agente: number;
  motivo: string;
  genera_descuento: boolean | null;
  "6ta_tardanza": boolean | null;
  observaciones: string | null;
  datos_personales: { apellido: string; nombre: string } | null;
};

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

const todayIso = () => new Date().toISOString().split('T')[0];

export default function InasistenciasPage() {
  const [data, setData] = useState<InasistenciaDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);

  const [cardDate, setCardDate] = useState(todayIso());
  const [cardJustificadas, setCardJustificadas] = useState(0);
  const [cardInjustificadas, setCardInjustificadas] = useState(0);
  const [card6ta, setCard6ta] = useState(0);
  const [cardLoading, setCardLoading] = useState(false);

  const [cardPopupOpen, setCardPopupOpen] = useState(false);
  const [cardPopupTitle, setCardPopupTitle] = useState('');
  const [cardPopupRows, setCardPopupRows] = useState<DayCardRow[]>([]);
  const [cardPopupLoading, setCardPopupLoading] = useState(false);

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

  const fetchCardData = useCallback(async () => {
    setCardLoading(true);
    const { data: raw, error: err } = await supabase
      .from('inasistencias')
      .select(`
        id_agente,
        motivo,
        genera_descuento,
        "6ta_tardanza",
        fecha_inasistencia,
        datos_personales!inner(id_agente, apellido, nombre)
      `)
      .eq('fecha_inasistencia', cardDate);

    if (err) return;

    let just = 0, injust = 0, seis = 0;
    for (const r of (raw ?? []) as any[]) {
      if (r.genera_descuento) injust++; else just++;
      if (r["6ta_tardanza"]) seis++;
    }
    setCardJustificadas(just);
    setCardInjustificadas(injust);
    setCard6ta(seis);
    setCardLoading(false);
  }, [cardDate]);

  useEffect(() => { fetchCardData(); }, [fetchCardData]);

  const openCardPopup = async (title: string) => {
    setCardPopupTitle(title);
    setCardPopupOpen(true);
    setCardPopupLoading(true);
    setCardPopupRows([]);

    const { data } = await supabase
      .from('inasistencias')
      .select(`
        id_agente,
        motivo,
        genera_descuento,
        "6ta_tardanza",
        observaciones,
        datos_personales!inner(id_agente, apellido, nombre)
      `)
      .eq('fecha_inasistencia', cardDate)
      .order('datos_personales!inner(apellido)');

    if (data) setCardPopupRows(data as DayCardRow[]);
    setCardPopupLoading(false);
  };

  const closeCardPopup = () => {
    setCardPopupOpen(false);
    setCardPopupRows([]);
  };

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
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider flex items-center gap-2">
            Resumen diario
            {cardLoading && <span className="text-[10px] text-slate-400 italic font-normal">cargando…</span>}
          </div>
          <input
            type="date"
            value={cardDate}
            onChange={(e) => setCardDate(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-[11px] font-mono"
          />
        </div>

        <div className="flex gap-3 mb-3">
          <div
            onClick={() => openCardPopup('Justificadas')}
            className="flex-1 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center cursor-pointer hover:bg-emerald-100 transition-colors active:scale-[0.98]"
          >
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Justificadas</div>
            <div className="text-lg font-black text-emerald-800">{cardJustificadas}</div>
          </div>
          <div
            onClick={() => openCardPopup('Injustificadas (G. Descuento)')}
            className="flex-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-center cursor-pointer hover:bg-red-100 transition-colors active:scale-[0.98]"
          >
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Injustificadas (G. Descuento)</div>
            <div className="text-lg font-black text-red-800">{cardInjustificadas}</div>
          </div>
          <div
            onClick={() => openCardPopup('6ta Tardanza')}
            className="flex-1 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-center cursor-pointer hover:bg-orange-100 transition-colors active:scale-[0.98]"
          >
            <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">6ta Tardanza</div>
            <div className="text-lg font-black text-orange-800">{card6ta}</div>
          </div>
        </div>
      </div>

      {cardPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 backdrop-blur-sm"
          onClick={closeCardPopup}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-headline uppercase tracking-wider text-xs font-bold text-primary">
                {cardPopupTitle} — {cardDate}
              </h3>
              <button onClick={closeCardPopup} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {cardPopupLoading ? (
                <div className="text-xs text-slate-400 italic py-4 text-center">Cargando…</div>
              ) : cardPopupRows.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-4 text-center">Sin registros.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="py-1.5 px-2 font-semibold text-gray-600">Residente</th>
                      <th className="py-1.5 px-2 font-semibold text-gray-600">Motivo</th>
                      <th className="py-1.5 px-2 font-semibold text-gray-600 text-center">6ta</th>
                      <th className="py-1.5 px-2 font-semibold text-gray-600 text-center">Desc.</th>
                      <th className="py-1.5 px-2 font-semibold text-gray-600">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardPopupRows.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-1.5 px-2 font-medium">{d.datos_personales?.apellido}, {d.datos_personales?.nombre}</td>
                        <td className="py-1.5 px-2">
                          <span className="inline-block px-1.5 py-0.5 rounded text-gray-700 bg-gray-50">{d.motivo}</span>
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono">{d["6ta_tardanza"] ? '✓' : '—'}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{d.genera_descuento ? '✓' : '—'}</td>
                        <td className="py-1.5 px-2 text-gray-600 truncate max-w-[120px]" title={d.observaciones ?? ''}>{d.observaciones ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

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
