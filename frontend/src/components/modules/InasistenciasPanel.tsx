import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

type InasistenciaRaw = {
  id_agente: number;
  motivo: string;
  genera_descuento: boolean | null;
  "6ta_tardanza": boolean | null;
  fecha_inasistencia: string;
  datos_personales: { apellido: string; nombre: string };
};

type ResidentRow = {
  id_agente: number;
  nombre: string;
  motivos: Record<string, number>;
  justificadas: number;
  injustificadas: number;
  sixth_tardanza: number;
  lastImprevistoMes: number | null;
};

type InasistenciaPopup = {
  fecha_inasistencia: string;
  motivo: string;
  estado: string | null;
  genera_descuento: boolean | null;
  "6ta_tardanza": boolean | null;
  requiere_certificado: boolean | null;
  observaciones: string | null;
};

const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const MOTIVO_COLORS: Record<string, string> = {
  ENFERMEDAD: 'text-blue-700 bg-blue-50',
  MEDICO: 'text-cyan-700 bg-cyan-50',
  ESTUDIO: 'text-purple-700 bg-purple-50',
  IMPREVISTO: 'text-amber-700 bg-amber-50',
  TARDANZA: 'text-orange-700 bg-orange-50',
};

const getMotivoClass = (motivo: string) =>
  MOTIVO_COLORS[motivo.toUpperCase()] ?? 'text-gray-700 bg-gray-50';

const MOTIVO_ORDER = ['IMPREVISTO', 'ESTUDIO'];

export default function InasistenciasPanel() {
  const [rows, setRows] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allMotivos, setAllMotivos] = useState<string[]>([]);
  const [globalJustificadas, setGlobalJustificadas] = useState(0);
  const [globalInjustificadas, setGlobalInjustificadas] = useState(0);
  const [global6ta, setGlobal6ta] = useState(0);

  const todayIso = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [cardJustificadas, setCardJustificadas] = useState(0);
  const [cardInjustificadas, setCardInjustificadas] = useState(0);
  const [card6ta, setCard6ta] = useState(0);
  const [cardLoading, setCardLoading] = useState(false);

  const [popupAgent, setPopupAgent] = useState<{ id_agente: number; nombre: string } | null>(null);
  const [popupRows, setPopupRows] = useState<InasistenciaPopup[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);

  const [cardPopupOpen, setCardPopupOpen] = useState(false);
  const [cardPopupTitle, setCardPopupTitle] = useState('');
  const [cardPopupRows, setCardPopupRows] = useState<InasistenciaPopup[]>([]);
  const [cardPopupLoading, setCardPopupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const since = `${year}-01-01`;
    const until = `${year}-12-31`;

    const { data, error: err } = await supabase
      .from('inasistencias')
      .select(`
        id_agente,
        motivo,
        genera_descuento,
        "6ta_tardanza",
        fecha_inasistencia,
        datos_personales!inner(id_agente, apellido, nombre)
      `)
      .gte('fecha_inasistencia', since)
      .lte('fecha_inasistencia', until);

    if (err) {
      setError('Error al cargar inasistencias: ' + err.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const raw = (data ?? []) as InasistenciaRaw[];
    const motivosSet = new Set<string>();
    const agentMap = new Map<number, ResidentRow>();
    let justificadas = 0;
    let injustificadas = 0;
    let cuenta6ta = 0;

    for (const r of raw) {
      const key = r.motivo?.toUpperCase() ?? 'OTRO';
      if (key !== 'INJUSTIFICADA') motivosSet.add(key);

      let row = agentMap.get(r.id_agente);
      if (!row) {
        row = {
          id_agente: r.id_agente,
          nombre: `${r.datos_personales.apellido}, ${r.datos_personales.nombre}`,
          motivos: {},
          justificadas: 0,
          injustificadas: 0,
          sixth_tardanza: 0,
          lastImprevistoMes: null,
        };
        agentMap.set(r.id_agente, row);
      }

      if (key !== 'INJUSTIFICADA') {
        row.motivos[key] = (row.motivos[key] ?? 0) + 1;
      }
      if (r.genera_descuento) {
        row.injustificadas += 1;
        injustificadas += 1;
      } else {
        row.justificadas += 1;
        justificadas += 1;
      }

      if (r["6ta_tardanza"]) {
        row.sixth_tardanza += 1;
        cuenta6ta += 1;
      }

      if (key === 'IMPREVISTO') {
        const mes = new Date(r.fecha_inasistencia + 'T00:00:00').getMonth() + 1;
        row.lastImprevistoMes = mes;
      }
    }

    const sortedRest = [...motivosSet]
      .filter(m => !MOTIVO_ORDER.includes(m))
      .sort();

    setAllMotivos([...MOTIVO_ORDER, ...sortedRest]);

    setRows(
      [...agentMap.values()].sort((a, b) => (b.justificadas + b.injustificadas) - (a.justificadas + a.injustificadas))
    );
    setGlobalJustificadas(justificadas);
    setGlobalInjustificadas(injustificadas);
    setGlobal6ta(cuenta6ta);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCardData = useCallback(async () => {
    setCardLoading(true);
    const { data: raw } = await supabase
      .from('inasistencias')
      .select('genera_descuento, "6ta_tardanza"')
      .eq('fecha_inasistencia', selectedDate);

    let just = 0, injust = 0, seis = 0;
    for (const r of (raw ?? []) as any[]) {
      if (r.genera_descuento) injust++; else just++;
      if (r["6ta_tardanza"]) seis++;
    }
    setCardJustificadas(just);
    setCardInjustificadas(injust);
    setCard6ta(seis);
    setCardLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchCardData(); }, [fetchCardData]);

  const openPopup = async (ag: ResidentRow) => {
    setPopupAgent({ id_agente: ag.id_agente, nombre: ag.nombre });
    setPopupLoading(true);
    setPopupRows([]);

    const year = new Date().getFullYear();
    const { data, error: err } = await supabase
      .from('inasistencias')
      .select('fecha_inasistencia, motivo, estado, genera_descuento, "6ta_tardanza", requiere_certificado, observaciones')
      .eq('id_agente', ag.id_agente)
      .gte('fecha_inasistencia', `${year}-01-01`)
      .lte('fecha_inasistencia', `${year}-12-31`)
      .order('fecha_inasistencia', { ascending: false });

    if (err) {
      setError('Error al cargar detalle: ' + err.message);
    } else {
      setPopupRows((data ?? []) as InasistenciaPopup[]);
    }
    setPopupLoading(false);
  };

  const closePopup = () => {
    setPopupAgent(null);
    setPopupRows([]);
  };

  const openCardPopup = async (title: string) => {
    setCardPopupTitle(title);
    setCardPopupOpen(true);
    setCardPopupLoading(true);
    setCardPopupRows([]);

    let query = supabase
      .from('inasistencias')
      .select(`
        fecha_inasistencia,
        motivo,
        estado,
        genera_descuento,
        "6ta_tardanza",
        requiere_certificado,
        observaciones,
        datos_personales!inner(id_agente, apellido, nombre)
      `)
      .eq('fecha_inasistencia', selectedDate);

    if (title === '6ta Tardanza') {
      query = query.eq('"6ta_tardanza"', true);
    } else if (title === 'Injustificadas (G. Descuento)') {
      query = query.eq('genera_descuento', true);
    } else {
      query = query.eq('genera_descuento', false);
    }

    const { data } = await query.order('fecha_inasistencia', { ascending: false });

    if (data) setCardPopupRows(data as any[]);
    setCardPopupLoading(false);
  };

  const closeCardPopup = () => {
    setCardPopupOpen(false);
    setCardPopupRows([]);
  };

  const getImprevistoColor = (count: number) => {
    if (count >= 4) return 'text-red-700 bg-red-50';
    if (count === 3) return 'text-orange-700 bg-orange-50';
    return 'text-amber-700 bg-amber-50';
  };

  return (
    <div className="p-3 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider flex items-center gap-2">
          Inasistencias {new Date().getFullYear()} ({rows.length} residentes)
          {loading && <span className="text-[10px] text-slate-400 italic font-normal">cargando…</span>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-outline-variant/30 rounded-lg px-2 py-1.5 text-[11px] font-mono"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="text-[10px] font-semibold text-on-surface-variant mb-2">Resumen diario {cardLoading && <span className="italic font-normal">cargando…</span>}</div>
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-xs">{error}</div>}

      {!loading && rows.length === 0 && !error && (
        <div className="text-xs text-slate-400 italic py-2">No hay inasistencias registradas este año.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
              <tr className="border-b border-outline-variant/20">
                <th className="py-2 px-2 font-semibold text-on-surface-variant min-w-[160px]">Residente</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center min-w-[72px]">Justificadas</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center min-w-[72px]">Injustificadas</th>
                {allMotivos.flatMap((m) => {
                  const cols = [<th key={m} className="py-2 px-2 font-semibold text-on-surface-variant text-center min-w-[72px]">{m}</th>];
                  if (m === 'IMPREVISTO') {
                    cols.push(
                      <th key="mes-imp" className="py-2 px-2 font-semibold text-on-surface-variant text-center min-w-[60px]">Mes Imp</th>
                    );
                  }
                  return cols;
                })}
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center min-w-[60px]">6ta T.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id_agente}
                  onClick={() => openPopup(r)}
                  className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <td className="py-1.5 px-2 font-medium truncate">{r.nombre}</td>
                  <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-600">{r.justificadas > 0 ? r.justificadas : '—'}</td>
                  <td className="py-1.5 px-2 text-center font-mono font-bold text-red-600">{r.injustificadas > 0 ? r.injustificadas : '—'}</td>
                  {allMotivos.flatMap(m => {
                    const count = r.motivos[m] ?? 0;
                    const cols = [
                      <td key={m} className="py-1.5 px-2 text-center font-mono">
                        {count > 0 ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded ${m === 'IMPREVISTO' ? getImprevistoColor(count) : getMotivoClass(m)}`}>
                            {count}
                          </span>
                        ) : '—'}
                      </td>
                    ];
                    if (m === 'IMPREVISTO') {
                      cols.push(
                        <td key="mes-imp" className="py-1.5 px-2 text-center font-mono text-gray-500">
                          {r.lastImprevistoMes ? MONTH_NAMES[r.lastImprevistoMes] : '—'}
                        </td>
                      );
                    }
                    return cols;
                  })}
                  <td className="py-1.5 px-2 text-center font-mono font-bold">
                    <span className={r.sixth_tardanza > 0 ? 'text-orange-600' : 'text-gray-400'}>
                      {r.sixth_tardanza > 0 ? r.sixth_tardanza : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {popupAgent && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 backdrop-blur-sm"
          onClick={closePopup}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-outline-variant/20 w-full max-w-lg mx-4 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
              <h3 className="font-headline uppercase tracking-wider text-xs font-bold text-primary">
                Inasistencias — {popupAgent.nombre}
              </h3>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {popupLoading ? (
                <div className="text-xs text-slate-400 italic py-4 text-center">Cargando…</div>
              ) : popupRows.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-4 text-center">Sin inasistencias registradas.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-outline-variant/20">
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Fecha</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Motivo</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant text-center">6ta</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant text-center">Desc.</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popupRows.map((d, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                        <td className="py-1.5 px-2 font-mono whitespace-nowrap">{d.fecha_inasistencia}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded ${getMotivoClass(d.motivo)}`}>
                            {d.motivo}
                          </span>
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

      {cardPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 backdrop-blur-sm"
          onClick={closeCardPopup}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-outline-variant/20 w-full max-w-lg mx-4 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
              <h3 className="font-headline uppercase tracking-wider text-xs font-bold text-primary">
                {cardPopupTitle} — {selectedDate}
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
                    <tr className="border-b border-outline-variant/20">
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Residente</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Fecha</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Motivo</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant text-center">6ta</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant text-center">Desc.</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardPopupRows.map((d, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                        <td className="py-1.5 px-2 font-medium">{d.datos_personales?.apellido}, {d.datos_personales?.nombre}</td>
                        <td className="py-1.5 px-2 font-mono whitespace-nowrap">{d.fecha_inasistencia}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded ${getMotivoClass(d.motivo)}`}>{d.motivo}</span>
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
    </div>
  );
}
