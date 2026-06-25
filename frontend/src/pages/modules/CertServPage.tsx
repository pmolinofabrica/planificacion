import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow, BatchError } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Row, Table } from '@tanstack/react-table';
import type { CertificadoServicioView } from '../../types/database';

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const NUM_WORDS: Record<number, string> = {
  0: 'cero', 1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
  6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
  11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
  16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
  21: 'veintiún', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
};

function numberToWords(n: number): string {
  return NUM_WORDS[n] ?? String(n);
}

type CertServDraft = Omit<CertificadoServicioView, 'id_cert_serv'> & { id_cert_serv?: number };

function buildCertText(row: CertServDraft, totalHorasDescontar: number, dia: number, mes: number, anio: number): string {
  const mesNum = row.mes_informado ?? new Date().getMonth() + 1;
  const mesName = MONTHS[mesNum - 1] ?? '';
  const horas = totalHorasDescontar;
  return `CERTIFICACIÓN DE SERVICIOS

Por la presente, CERTIFICO que ${row.agente}, DNI: ${row.dni} ha cumplido con sus obligaciones laborales en El Molino Fábrica Cultural, en el marco de Residencias Culturales ${anio} - Ministerio de Cultura - durante el mes de ${mesName}/${anio}, según Resoluciones Nº 731/25, Nº 074/26, Res. Nº001/26 (SIC), Nº 129/26 y N° 0165/26.

A su vez se aclara que se debe proceder al descuento de ${horas} (${numberToWords(horas)}) horas debido a inasistencia sin justificar en el mes de ${mesName}.-

Para ser entregado al Departamento Tesorería - Ministerio de Cultura, a fin de realizar el pago correspondiente, se extiende la presente certificación el día ${dia} de ${MONTHS[mes - 1]} del ${anio} en la Ciudad de Santa Fe.`;
}

const ESTADO_COLORS: Record<string, string> = {
  informado: 'bg-green-100 text-green-800',
  pendiente: 'bg-amber-100 text-amber-800',
  cancelado: 'bg-red-100 text-red-800',
};

const ESTADO_OPTIONS = [
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'informado', label: 'Informado' },
];

function mesBg(mes: number | null): string {
  if (mes == null) return '';
  const hue = Math.round(240 - (mes - 1) * (240 / 11));
  return `hsl(${hue}, 55%, 82%)`;
}

function EstadoCell({ row, table }: { row: Row<TrackedRow<CertServDraft>>; table: Table<TrackedRow<CertServDraft>> }) {
  const [editing, setEditing] = useState(false);
  const meta = table.options.meta as { updateCell: (id: string, field: keyof CertServDraft, val: string) => void };
  const value = row.original.data.estado;

  if (editing) {
    return (
      <select
        autoFocus
        value={value ?? ''}
        onChange={e => { meta.updateCell(row.original._id, 'estado', e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="border rounded px-1 py-0.5 text-xs w-full"
      >
        <option value="">—</option>
        {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${ESTADO_COLORS[value ?? ''] ?? ''}`}
      title="Click para editar"
    >
      {value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'}
    </span>
  );
}

function MesCell({ row, table }: { row: Row<TrackedRow<CertServDraft>>; table: Table<TrackedRow<CertServDraft>> }) {
  const [editing, setEditing] = useState(false);
  const meta = table.options.meta as { updateCell: (id: string, field: keyof CertServDraft, val: string) => void };
  const value = row.original.data.mes_informado;

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        max={12}
        value={value ?? ''}
        onChange={e => { setEditing(false); meta.updateCell(row.original._id, 'mes_informado', e.target.value); }}
        onBlur={() => setEditing(false)}
        className="border rounded px-1 py-0.5 text-xs w-16 text-center"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block px-1 py-0.5 text-xs text-center cursor-pointer rounded"
      style={{ backgroundColor: mesBg(value) }}
      title="Click para editar"
    >
      {value ? MONTHS[value - 1] ?? value : '—'}
    </span>
  );
}

function HorasCell({ row, table, isDup }: { row: Row<TrackedRow<CertServDraft>>; table: Table<TrackedRow<CertServDraft>>; isDup: boolean }) {
  const [editing, setEditing] = useState(false);
  const meta = table.options.meta as { updateCell: (id: string, field: keyof CertServDraft, val: string) => void };
  const value = row.original.data.horas_descontar;

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={value ?? ''}
        onChange={e => { meta.updateCell(row.original._id, 'horas_descontar', e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="border rounded px-1 py-0.5 text-xs w-16 text-center"
      />
    );
  }

  return (
    <span onClick={() => setEditing(true)} className={`block px-1 py-0.5 text-xs font-mono text-center cursor-pointer rounded ${isDup ? 'font-bold ring-2 ring-inset ring-indigo-400 bg-indigo-50' : ''}`} title="Click para editar">
      {value ?? '—'}
    </span>
  );
}

export default function CertServPage() {
  const [data, setData] = useState<CertServDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [agentesOptions, setAgentesOptions] = useState<{ value: number; label: string }[]>([]);
  const [agentesFull, setAgentesFull] = useState<{ id_agente: number; apellido: string; nombre: string; dni: string }[]>([]);
  const [inasistenciasOptions, setInasistenciasOptions] = useState<{ value: number; label: string; id_agente: number }[]>([]);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [liveRowMap, setLiveRowMap] = useState<Map<string, CertServDraft>>(() => new Map());
  const [diaNotif, setDiaNotif] = useState(new Date().getDate());
  const [mesNotif, setMesNotif] = useState(new Date().getMonth() + 1);
  const [anioNotif, setAnioNotif] = useState(new Date().getFullYear());
  const [editingText, setEditingText] = useState(false);
  const [editingFecha, setEditingFecha] = useState(false);
  const [customText, setCustomText] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const [certRes, agentesRes, inasRes] = await Promise.all([
      supabase.from('vista_certificaciones_servicio').select('*').order('created_at', { ascending: false }),
      supabase.from('datos_personales').select('id_agente, nombre, apellido, dni').eq('activo', true).order('apellido'),
      supabase.from('inasistencias').select('id_inasistencia, id_agente, fecha_inasistencia, motivo').eq('genera_descuento', true).gte('fecha_inasistencia', `${year}-01-01`).lte('fecha_inasistencia', `${year}-12-31`).order('fecha_inasistencia', { ascending: false }),
    ]);

    if (agentesRes.data) {
      const agents = agentesRes.data as Array<{ id_agente: number; nombre: string; apellido: string; dni: string }>;
      setAgentesFull(agents);
      setAgentesOptions(agents.map(a => ({ value: a.id_agente, label: `${a.apellido}, ${a.nombre}` })));
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

  const openPopup = useCallback((id: string) => {
    setEditingText(false);
    setEditingFecha(false);
    setPopupId(id);
  }, []);

  const closePopup = useCallback(() => setPopupId(null), []);

  const popupRow = popupId ? liveRowMap.get(popupId) ?? null : null;

  const totalHoras = useMemo(() => {
    if (!popupRow) return 0;
    let total = 0;
    for (const row of liveRowMap.values()) {
      if (row.id_agente === popupRow.id_agente && row.mes_informado != null && row.mes_informado === popupRow.mes_informado) {
        total += row.horas_descontar ?? 0;
      }
    }
    return total;
  }, [popupRow, liveRowMap]);

  const duplicateGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of liveRowMap.values()) {
      if (row.mes_informado == null) continue;
      const key = `${row.id_agente}_${row.mes_informado}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const dupKeys = new Set<string>();
    for (const [key, count] of counts) {
      if (count > 1) dupKeys.add(key);
    }
    return dupKeys;
  }, [liveRowMap]);

  const getRowClassName = useCallback((tracked: TrackedRow<CertServDraft>) => {
    const d = tracked.data;
    const classes: string[] = [];
    if (d.estado === 'informado') classes.push('bg-green-50');
    else if (d.estado === 'cancelado') classes.push('bg-red-50');
    else if (d.estado === 'pendiente') classes.push('bg-amber-50');
    return classes.join(' ') || undefined;
  }, [duplicateGroups]);

  const copyText = useCallback(async () => {
    if (!popupId) return;
    const row = liveRowMap.get(popupId);
    if (!row) return;
    let total = 0;
    for (const r of liveRowMap.values()) {
      if (r.id_agente === row.id_agente && r.mes_informado != null && r.mes_informado === row.mes_informado) {
        total += r.horas_descontar ?? 0;
      }
    }
    const txt = customText || buildCertText(row, total, diaNotif, mesNotif, anioNotif);
    try { await navigator.clipboard.writeText(txt); } catch { /* ignore */ }
  }, [popupId, customText, diaNotif, mesNotif, anioNotif, liveRowMap]);

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
        .from('certificaciones_servicio')
        .insert({
          id_agente: row.id_agente,
          id_inasistencia: row.id_inasistencia,
          horas_descontar: row.horas_descontar,
          mes_informado: row.mes_informado,
          estado: row.estado,
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
    {
      id: 'cert',
      header: '',
      cell: ({ row }) => {
        setLiveRowMap(prev => {
          if (prev.get(row.original._id) === row.original.data) return prev;
          const next = new Map(prev);
          next.set(row.original._id, row.original.data);
          return next;
        });
        return (
          <button
            onClick={() => openPopup(row.original._id)}
            className="text-blue-600 hover:text-blue-800 leading-none px-1"
            title="Ver certificación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        );
      },
      size: 36,
    },
    { id: 'id_cert_serv', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_cert_serv ?? '—'}</span>, size: 50 },
    {
      id: 'id_agente',
      accessorFn: row => row.data.id_agente,
      header: 'Agente',
      cell: ({ row, table }) => {
        const meta = table.options.meta as { updateCell: (id: string, field: keyof CertServDraft, val: string) => void };
        const value = row.original.data.id_agente;
        return (
          <select
            value={value ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const agent = agentesFull.find(a => a.id_agente === id);
              meta.updateCell(row.original._id, 'id_agente', String(id));
              if (agent) {
                meta.updateCell(row.original._id, 'agente', `${agent.apellido}, ${agent.nombre}`);
                meta.updateCell(row.original._id, 'dni', agent.dni);
              }
            }}
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full pr-6"
          >
            <option value="">—</option>
            {agentesOptions.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        );
      },
      size: 180,
    },
    { id: 'agente', header: 'Nombre', cell: ({ row }) => {
      const d = row.original.data;
      const isDup = d.mes_informado != null && duplicateGroups.has(`${d.id_agente}_${d.mes_informado}`);
      return <span className={`text-xs ${isDup ? 'font-bold' : 'font-medium'}`}>{d.agente || '—'}</span>;
    } },
    { id: 'dni', accessorFn: row => row.data.dni, header: 'DNI', cell: ({ row }) => <span className="text-xs font-mono">{row.original.data.dni || '—'}</span> },
    editableColumn<CertServDraft>('id_inasistencia', 'Inasistencia', 'select', idInasistenciaOptions),
    { id: 'fecha_inasistencia', accessorFn: row => row.data.fecha_inasistencia, header: 'Fecha Inas.', cell: ({ row }) => <span className="text-gray-600 text-xs">{row.original.data.fecha_inasistencia || '—'}</span> },
    { id: 'horas_convocatoria', header: 'Hs. Conv.', cell: ({ row }) => <span className="font-mono text-xs">{row.original.data.horas_convocatoria ?? '—'}</span> },
    { id: 'horas_descontar', header: 'Hs. Descontar', cell: ({ row, table }) => {
      const d = row.original.data;
      const isDup = d.mes_informado != null && duplicateGroups.has(`${d.id_agente}_${d.mes_informado}`);
      return <HorasCell row={row} table={table} isDup={isDup} />;
    } },
    { id: 'mes_informado', header: 'Mes', cell: ({ row, table }) => <MesCell row={row} table={table} /> },
    { id: 'estado', header: 'Estado', cell: ({ row, table }) => <EstadoCell row={row} table={table} /> },
    { id: 'created_at', accessorFn: row => row.data.created_at, header: 'Creado', cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.data.created_at || '—'}</span> },
    { id: 'motivo_inasistencia', accessorFn: row => row.data.motivo_inasistencia, header: 'Motivo', cell: ({ row }) => <span className="text-xs">{row.original.data.motivo_inasistencia || '—'}</span> },
  ], [agentesOptions, agentesFull, idInasistenciaOptions, openPopup, duplicateGroups]);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-gray-800">Certificaciones de Servicio</h2></div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando certificados...</div>
      ) : (
        <DataTable<CertServDraft>
          key={refreshKey}
          tableName="certificaciones_servicio"
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
            mes_informado: null,
            estado: null,
            created_at: null,
            updated_at: null,
            horas_convocatoria: 0,
          })}
          onBatchInsert={customBatchInsert}
          getRowClassName={getRowClassName}
        />
      )}

      {popupRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closePopup}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Certificación de Servicios</h3>
                <button onClick={closePopup} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
              </div>

              <div className="flex gap-2">
                <button onClick={copyText} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded">Copiar</button>
                <button onClick={() => { setEditingText(!editingText); setEditingFecha(false); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded">{editingText ? 'Cerrar edición' : 'Editar texto'}</button>
                <button onClick={() => { setEditingFecha(!editingFecha); setEditingText(false); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded">{editingFecha ? 'Cerrar fecha' : 'Editar fecha'}</button>
              </div>

              {editingFecha && (
                <div className="flex gap-3 items-end bg-gray-50 p-3 rounded border">
                  <label className="flex flex-col text-xs text-gray-600">Día
                    <input type="number" min={1} max={31} value={diaNotif} onChange={e => setDiaNotif(Number(e.target.value))} className="border rounded px-2 py-1 w-16 text-sm" />
                  </label>
                  <label className="flex flex-col text-xs text-gray-600">Mes
                    <select value={mesNotif} onChange={e => setMesNotif(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                      {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col text-xs text-gray-600">Año
                    <input type="number" value={anioNotif} onChange={e => setAnioNotif(Number(e.target.value))} className="border rounded px-2 py-1 w-20 text-sm" />
                  </label>
                </div>
              )}

              {editingText ? (
                <textarea
                  ref={textRef}
                  className="w-full border rounded p-3 text-sm font-mono whitespace-pre-wrap"
                  rows={16}
                  value={customText || buildCertText(popupRow, totalHoras, diaNotif, mesNotif, anioNotif)}
                  onChange={e => setCustomText(e.target.value)}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded border">
                  {customText || buildCertText(popupRow, totalHoras, diaNotif, mesNotif, anioNotif)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
