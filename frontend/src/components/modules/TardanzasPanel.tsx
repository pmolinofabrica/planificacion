import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

type TardanzaResumen = {
  id_agente: number;
  apellido: string;
  nombre: string;
  total_tardanzas: number;
};

type TardanzaDetalle = {
  id_tardanza: number;
  fecha: string;
  accion_aplicada: string | null;
  created_at: string | null;
  observaciones: string | null;
};

export default function TardanzasPanel() {
  const [rows, setRows] = useState<TardanzaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [popupAgent, setPopupAgent] = useState<{ nombre: string; id_agente: number } | null>(null);
  const [popupRows, setPopupRows] = useState<TardanzaDetalle[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const since = `${year}-01-01`;
    const until = `${year}-12-31`;

    const [latestRes, { data, error: err }] = await Promise.all([
      supabase
        .from('tardanzas')
        .select('created_at')
        .gte('fecha', since)
        .lte('fecha', until)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('tardanzas')
        .select(`
          id_agente,
          datos_personales!inner(id_agente, apellido, nombre, dni)
        `)
        .gte('fecha', since)
        .lte('fecha', until),
    ]);

    if (err) {
      setError('Error al cargar tardanzas: ' + err.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setLatestDate(latestRes?.data?.created_at ? latestRes.data.created_at.toString().split('T')[0] : null);

    const raw = (data ?? []) as Array<{
      id_agente: number;
      datos_personales: { apellido: string; nombre: string; dni: string };
    }>;

    const map = new Map<number, TardanzaResumen>();
    for (const r of raw) {
      const existing = map.get(r.id_agente);
      if (existing) {
        existing.total_tardanzas += 1;
      } else {
        map.set(r.id_agente, {
          id_agente: r.id_agente,
          apellido: r.datos_personales.apellido,
          nombre: r.datos_personales.nombre,
          total_tardanzas: 1,
        });
      }
    }

    setRows(
      [...map.values()].sort((a, b) => b.total_tardanzas - a.total_tardanzas)
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openPopup = async (ag: TardanzaResumen) => {
    setPopupAgent({ nombre: `${ag.apellido}, ${ag.nombre}`, id_agente: ag.id_agente });
    setPopupLoading(true);
    setPopupRows([]);

    const year = new Date().getFullYear();
    const { data, error: err } = await supabase
      .from('tardanzas')
      .select('id_tardanza, fecha, accion_aplicada, created_at, observaciones')
      .eq('id_agente', ag.id_agente)
      .gte('fecha', `${year}-01-01`)
      .lte('fecha', `${year}-12-31`)
      .order('fecha', { ascending: false });

    if (err) {
      setError('Error al cargar detalle: ' + err.message);
    } else {
      setPopupRows((data ?? []) as TardanzaDetalle[]);
    }
    setPopupLoading(false);
  };

  const closePopup = () => {
    setPopupAgent(null);
    setPopupRows([]);
  };

  return (
    <div className="p-3 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider flex items-center gap-2">
          Tardanzas {new Date().getFullYear()} ({rows.length} residentes)
          {latestDate && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-bold tracking-normal">
              {latestDate}
            </span>
          )}
          {loading && <span className="text-[10px] text-slate-400 italic font-normal">cargando…</span>}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          Refrescar
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-xs">{error}</div>}

      {!loading && rows.length === 0 && !error && (
        <div className="text-xs text-slate-400 italic py-2">No hay tardanzas registradas este año.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <colgroup>
              <col style={{ width: '60%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
              <tr className="border-b border-outline-variant/20">
                <th className="py-2 px-2 font-semibold text-on-surface-variant">Residente</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-right">Tardanzas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id_agente}
                  onClick={() => openPopup(r)}
                  className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <td className="py-1.5 px-2 font-medium truncate">{r.apellido}, {r.nombre}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold">
                    <span className={r.total_tardanzas > 5 ? 'text-red-600' : r.total_tardanzas > 2 ? 'text-amber-600' : 'text-gray-700'}>
                      {r.total_tardanzas}
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
                Tardanzas — {popupAgent.nombre}
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
                <div className="text-xs text-slate-400 italic py-4 text-center">Sin tardanzas registradas.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-outline-variant/20">
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Fecha</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Acción</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Fecha Carga</th>
                      <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popupRows.map(d => (
                      <tr key={d.id_tardanza} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                        <td className="py-1.5 px-2 font-mono whitespace-nowrap">{d.fecha}</td>
                        <td className="py-1.5 px-2">{d.accion_aplicada ?? '—'}</td>
                        <td className="py-1.5 px-2 font-mono text-gray-500">{d.created_at ? d.created_at.toString().split('T')[0] : '—'}</td>
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
