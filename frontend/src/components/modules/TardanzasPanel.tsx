import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

type TardanzaResumen = {
  id_agente: number;
  apellido: string;
  nombre: string;
  total_tardanzas: number;
  total_6ta_tardanza: number;
  lastImprevistoMes: number | null;
};

type TardanzaDetalle = {
  id_tardanza: number;
  fecha: string;
  accion_aplicada: string | null;
  created_at: string | null;
  observaciones: string | null;
};

type ConvocadoRow = {
  id_convocatoria: number;
  id_agente: number;
  agente: string;
  total_tardanzas: number;
  total_6ta_tardanza: number;
  checked: boolean;
  saving: boolean;
  error: string | null;
};

type TurnoOption = {
  id_turno: number;
  tipo_turno: string;
};

const MONTH_NAMES_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const todayIso = () => new Date().toISOString().split('T')[0];
const currentYear = new Date().getFullYear();

const errorMessage = (e: unknown): string => {
  if (e && typeof e === 'object') {
    if ('message' in e && typeof (e as { message: unknown }).message === 'string') return (e as { message: string }).message;
    if ('error' in e) {
      const err = (e as { error: unknown }).error;
      if (typeof err === 'string') return err;
    }
    if ('details' in e && typeof (e as { details: unknown }).details === 'string') return (e as { details: string }).details;
    try { return JSON.stringify(e); } catch { return 'Error desconocido (objeto no serializable)'; }
  }
  if (e instanceof Error) return e.message;
  return String(e ?? 'Error desconocido');
};

export default function TardanzasPanel() {
  const [rows, setRows] = useState<TardanzaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [popupAgent, setPopupAgent] = useState<{ nombre: string; id_agente: number } | null>(null);
  const [popupRows, setPopupRows] = useState<TardanzaDetalle[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupInas6ta, setPopupInas6ta] = useState<Array<{ fecha_inasistencia: string; motivo: string }>>([]);

  const [turnoOptions, setTurnoOptions] = useState<TurnoOption[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedTurnoId, setSelectedTurnoId] = useState<number | null>(null);
  const [convocados, setConvocados] = useState<ConvocadoRow[]>([]);
  const [loadingConvocados, setLoadingConvocados] = useState(false);
  const [convocadosError, setConvocadosError] = useState('');
  const [savingTardanzas, setSavingTardanzas] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{ ok: number; fail: number } | null>(null);
  const [tardanzaIdMap, setTardanzaIdMap] = useState<Map<number, number>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const since = `${year}-01-01`;
    const until = `${year}-12-31`;

    const [latestRes, tardRes, inas6taRes, inasImpRes] = await Promise.all([
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
      supabase
        .from('inasistencias')
        .select('id_agente')
        .gte('fecha_inasistencia', since)
        .lte('fecha_inasistencia', until)
        .eq('6ta_tardanza', true),
      supabase
        .from('inasistencias')
        .select('id_agente, fecha_inasistencia')
        .gte('fecha_inasistencia', since)
        .lte('fecha_inasistencia', until)
        .eq('motivo', 'IMPREVISTO'),
    ]);

    if (tardRes.error) {
      setError('Error al cargar tardanzas: ' + tardRes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setLatestDate(latestRes?.data?.created_at ? latestRes.data.created_at.toString().split('T')[0] : null);

    const raw = (tardRes.data ?? []) as Array<{
      id_agente: number;
      datos_personales: { apellido: string; nombre: string; dni: string };
    }>;

    const count6ta = new Map<number, number>();
    for (const r of (inas6taRes.data ?? []) as Array<{ id_agente: number }>) {
      count6ta.set(r.id_agente, (count6ta.get(r.id_agente) ?? 0) + 1);
    }

    const lastImprevisto = new Map<number, { mes: number; fecha: string }>();
    for (const r of (inasImpRes.data ?? []) as Array<{ id_agente: number; fecha_inasistencia: string }>) {
      const prev = lastImprevisto.get(r.id_agente);
      if (!prev || r.fecha_inasistencia > prev.fecha) {
        const mes = new Date(r.fecha_inasistencia + 'T00:00:00').getMonth() + 1;
        lastImprevisto.set(r.id_agente, { mes, fecha: r.fecha_inasistencia });
      }
    }

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
          total_6ta_tardanza: count6ta.get(r.id_agente) ?? 0,
          lastImprevistoMes: lastImprevisto.get(r.id_agente)?.mes ?? null,
        });
      }
    }

    const missingIds = [...count6ta.keys()].filter(id => !map.has(id));
    if (missingIds.length > 0) {
      const { data: dps } = await supabase
        .from('datos_personales')
        .select('id_agente, apellido, nombre')
        .in('id_agente', missingIds);
      for (const dp of (dps ?? [])) {
        map.set(dp.id_agente, {
          id_agente: dp.id_agente,
          apellido: dp.apellido,
          nombre: dp.nombre,
          total_tardanzas: 0,
          total_6ta_tardanza: count6ta.get(dp.id_agente) ?? 0,
          lastImprevistoMes: lastImprevisto.get(dp.id_agente)?.mes ?? null,
        });
      }
    }
    for (const [idAgente, count] of count6ta) {
      const existing = map.get(idAgente);
      if (existing) {
        existing.total_6ta_tardanza = count;
        existing.lastImprevistoMes = lastImprevisto.get(idAgente)?.mes ?? existing.lastImprevistoMes;
      }
    }
    for (const [idAgente, imp] of lastImprevisto) {
      const existing = map.get(idAgente);
      if (existing && !count6ta.has(idAgente)) existing.lastImprevistoMes = imp.mes;
    }

    setRows(
      [...map.values()].sort((a, b) => b.total_tardanzas - a.total_tardanzas)
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    supabase
      .from('turnos')
      .select('id_turno, tipo_turno')
      .eq('activo', true)
      .order('tipo_turno')
      .then((result: { data: TurnoOption[] | null; error: unknown }) => {
        if (!result.error && result.data) {
          setTurnoOptions(result.data);
          if (result.data.length > 0) {
            setSelectedTurnoId(result.data[0].id_turno);
          }
        }
      });
  }, []);

  const fetchConvocados = useCallback(async () => {
    if (!selectedDate || !selectedTurnoId) return;

    setLoadingConvocados(true);
    setConvocadosError('');
    setSaveSummary(null);

    const { data: convData, error: convErr } = await supabase
      .from('vista_convocatoria_completa')
      .select('id_convocatoria, id_agente, agente, fecha_turno, id_turno, tipo_turno')
      .eq('fecha_turno', selectedDate)
      .eq('id_turno', selectedTurnoId)
      .eq('turno_cancelado', false)
      .eq('estado', 'vigente');

    if (convErr) {
      setConvocadosError('Error al cargar convocados: ' + convErr.message);
      setConvocados([]);
      setLoadingConvocados(false);
      return;
    }

    const rawConvocados = (convData ?? []) as Array<{
      id_convocatoria: number;
      id_agente: number;
      agente: string;
    }>;

    if (rawConvocados.length === 0) {
      setConvocados([]);
      setTardanzaIdMap(new Map());
      setLoadingConvocados(false);
      return;
    }

    const agentIds = rawConvocados.map(c => c.id_agente);

    const [{ data: tardanzasData }, { data: inas6taData }] = await Promise.all([
      supabase
        .from('tardanzas')
        .select('id_tardanza, id_agente, fecha')
        .gte('fecha', `${currentYear}-01-01`)
        .lte('fecha', `${currentYear}-12-31`)
        .in('id_agente', agentIds),
      supabase
        .from('inasistencias')
        .select('id_agente')
        .gte('fecha_inasistencia', `${currentYear}-01-01`)
        .lte('fecha_inasistencia', `${currentYear}-12-31`)
        .eq('6ta_tardanza', true)
        .in('id_agente', agentIds),
    ]);

    const normDate = (d: unknown): string => {
      if (!d) return '';
      if (typeof d === 'string') return d.split('T')[0];
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
    };

    const tardPorAgente = new Map<number, number>();
    const tardFechaMap = new Map<number, number>();
    for (const t of (tardanzasData ?? []) as Array<{ id_tardanza: number; id_agente: number; fecha: unknown }>) {
      tardPorAgente.set(t.id_agente, (tardPorAgente.get(t.id_agente) ?? 0) + 1);
      if (normDate(t.fecha) === selectedDate) {
        tardFechaMap.set(t.id_agente, t.id_tardanza);
      }
    }

    const inas6taPorAgente = new Map<number, number>();
    for (const r of (inas6taData ?? []) as Array<{ id_agente: number }>) {
      inas6taPorAgente.set(r.id_agente, (inas6taPorAgente.get(r.id_agente) ?? 0) + 1);
    }

    setTardanzaIdMap(tardFechaMap);

    setConvocados(
      rawConvocados.map(c => ({
        id_convocatoria: c.id_convocatoria,
        id_agente: c.id_agente,
        agente: c.agente,
        total_tardanzas: tardPorAgente.get(c.id_agente) ?? 0,
        total_6ta_tardanza: inas6taPorAgente.get(c.id_agente) ?? 0,
        checked: tardFechaMap.has(c.id_agente),
        saving: false,
        error: null,
      }))
    );
    setLoadingConvocados(false);
  }, [selectedDate, selectedTurnoId]);

  useEffect(() => {
    if (selectedDate && selectedTurnoId) {
      fetchConvocados();
    }
  }, [fetchConvocados]);

  const handleToggle = (idAgente: number, checked: boolean) => {
    setConvocados(prev => prev.map(c =>
      c.id_agente === idAgente ? { ...c, checked, error: null } : c
    ));
  };

  const handleSaveTardanzas = async () => {
    const toInsert: Array<{ id_agente: number }> = [];
    const toDelete: number[] = [];

    for (const c of convocados) {
      const existingId = tardanzaIdMap.get(c.id_agente);
      if (c.checked && !existingId) {
        toInsert.push({ id_agente: c.id_agente });
      } else if (!c.checked && existingId) {
        toDelete.push(existingId);
      }
    }

    if (toInsert.length === 0 && toDelete.length === 0) return;

    setSavingTardanzas(true);
    setSaveSummary(null);

    let ok = 0;
    let fail = 0;

    for (const ins of toInsert) {
      const idx = convocados.findIndex(c => c.id_agente === ins.id_agente);
      if (idx >= 0) {
        setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: true, error: null } : c));
      }

      try {
        const { data: inserted, error: insErr } = await supabase
          .from('tardanzas')
          .insert({ id_agente: ins.id_agente, fecha: selectedDate, accion_aplicada: null, observaciones: null })
          .select('id_tardanza')
          .maybeSingle();

        if (insErr) throw insErr;
        if (!inserted) throw new Error('No se pudo crear la tardanza (posiblemente ya existe para esta fecha).');

        setTardanzaIdMap(prev => new Map(prev).set(ins.id_agente, inserted.id_tardanza));
        if (idx >= 0) {
          setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: false } : c));
        }
        ok += 1;
      } catch (e) {
        console.error('Error al guardar tardanza:', e);
        if (idx >= 0) {
          setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: false, error: errorMessage(e) } : c));
        }
        fail += 1;
      }
    }

    for (const delId of toDelete) {
      const agentEntry = [...tardanzaIdMap.entries()].find(([, v]) => v === delId);
      const idAgente = agentEntry?.[0];
      const idx = idAgente ? convocados.findIndex(c => c.id_agente === idAgente) : -1;
      if (idx >= 0) {
        setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: true, error: null } : c));
      }

      try {
        const { data: deleted, error: delErr } = await supabase
          .from('tardanzas')
          .delete()
          .select('id_tardanza')
          .eq('id_tardanza', delId);

        if (delErr) throw delErr;
        if (!deleted || deleted.length === 0) throw new Error('No se encontró la tardanza para eliminar.');

        if (idAgente) {
          setTardanzaIdMap(prev => { const m = new Map(prev); m.delete(idAgente); return m; });
        }
        if (idx >= 0) {
          setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: false } : c));
        }
        ok += 1;
      } catch (e) {
        if (idx >= 0) {
          setConvocados(prev => prev.map((c, i) => i === idx ? { ...c, saving: false, error: errorMessage(e) } : c));
        }
        fail += 1;
      }
    }

    setSaveSummary({ ok, fail });
    setSavingTardanzas(false);

    if (ok > 0) {
      fetchData();
      fetchConvocados();
    }
  };

  const openPopup = async (ag: TardanzaResumen) => {
    setPopupAgent({ nombre: `${ag.apellido}, ${ag.nombre}`, id_agente: ag.id_agente });
    setPopupLoading(true);
    setPopupRows([]);
    setPopupInas6ta([]);

    const year = new Date().getFullYear();
    const [tardRes, inasRes] = await Promise.all([
      supabase
        .from('tardanzas')
        .select('id_tardanza, fecha, accion_aplicada, created_at, observaciones')
        .eq('id_agente', ag.id_agente)
        .gte('fecha', `${year}-01-01`)
        .lte('fecha', `${year}-12-31`)
        .order('fecha', { ascending: false }),
      supabase
        .from('inasistencias')
        .select('fecha_inasistencia, motivo')
        .eq('id_agente', ag.id_agente)
        .gte('fecha_inasistencia', `${year}-01-01`)
        .lte('fecha_inasistencia', `${year}-12-31`)
        .eq('6ta_tardanza', true)
        .order('fecha_inasistencia', { ascending: false }),
    ]);

    if (tardRes.error) {
      setError('Error al cargar detalle: ' + tardRes.error.message);
    } else {
      setPopupRows((tardRes.data ?? []) as TardanzaDetalle[]);
    }
    setPopupInas6ta((inasRes.data ?? []) as Array<{ fecha_inasistencia: string; motivo: string }>);
    setPopupLoading(false);
  };

  const closePopup = () => {
    setPopupAgent(null);
    setPopupRows([]);
  };

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const c of convocados) {
      const existing = tardanzaIdMap.has(c.id_agente);
      if (c.checked !== existing) count += 1;
    }
    return count;
  }, [convocados, tardanzaIdMap]);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider">
            Registrar Tardanzas por Convocatoria
          </div>
          <button
            onClick={fetchConvocados}
            disabled={loadingConvocados}
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar con la base de datos"
          >
            {loadingConvocados ? '…' : 'Sincronizar'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSaveSummary(null); }}
              className="w-full border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs font-mono bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Tipo de Turno</label>
            <select
              value={selectedTurnoId ?? ''}
              onChange={(e) => { setSelectedTurnoId(e.target.value ? Number(e.target.value) : null); setSaveSummary(null); }}
              className="w-full border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
            >
              {turnoOptions.map(t => (
                <option key={t.id_turno} value={t.id_turno}>{t.tipo_turno}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingConvocados && (
          <div className="text-xs text-slate-400 italic py-4 text-center">Cargando convocados…</div>
        )}

        {convocadosError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-xs">{convocadosError}</div>
        )}

        {!loadingConvocados && convocados.length === 0 && !convocadosError && selectedDate && selectedTurnoId && (
          <div className="text-xs text-slate-400 italic py-2">No hay convocados para esta fecha y turno.</div>
        )}

        {saveSummary && (
          <div className={`mb-3 px-3 py-2 rounded text-xs ${saveSummary.fail === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {saveSummary.fail === 0
              ? `${saveSummary.ok} tardanza(s) guardada(s) correctamente.`
              : `${saveSummary.ok} guardada(s), ${saveSummary.fail} con error. Revisá las filas marcadas.`}
          </div>
        )}

        {convocados.length > 0 && (
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
                <tr className="border-b border-outline-variant/20">
                  <th className="py-2 px-2 font-semibold text-on-surface-variant">Residente</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">Tardanzas (año)</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">Inasist. 6ta</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">Marca</th>
                </tr>
              </thead>
              <tbody>
                {convocados.map(c => (
                  <tr
                    key={c.id_convocatoria}
                    className={`border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low ${c.error ? 'border-l-2 border-l-red-500' : ''}`}
                  >
                    <td className="py-1.5 px-2 font-medium truncate" title={c.agente}>{c.agente}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold">
                      <span className={c.total_tardanzas > 5 ? 'text-red-600' : c.total_tardanzas > 2 ? 'text-amber-600' : 'text-gray-700'}>
                        {c.total_tardanzas}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold">
                      <span className={c.total_6ta_tardanza > 0 ? 'text-red-600' : 'text-gray-400'}>
                        {c.total_6ta_tardanza}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={c.checked}
                        disabled={c.saving || savingTardanzas}
                        onChange={(e) => handleToggle(c.id_agente, e.target.checked)}
                        className="accent-primary w-4 h-4 cursor-pointer disabled:opacity-50"
                        aria-label={`Marcar tardanza para ${c.agente}`}
                      />
                      {c.error && <div className="text-red-600 text-[10px] mt-1 leading-tight">{c.error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {convocados.length > 0 && (
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={handleSaveTardanzas}
              disabled={savingTardanzas || dirtyCount === 0}
              className="bg-primary text-white px-4 py-2 rounded-lg text-[11px] font-bold font-headline uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingTardanzas ? 'Guardando…' : `Guardar (${dirtyCount})`}
            </button>
          </div>
        )}
      </div>

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
                <col style={{ width: '40%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
                <tr className="border-b border-outline-variant/20">
                  <th className="py-2 px-2 font-semibold text-on-surface-variant">Residente</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-right">Tardanzas</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-right">Inasist. 6ta</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">Mes Imp</th>
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
                    <td className="py-1.5 px-2 text-right font-mono font-bold">
                      <span className={r.total_6ta_tardanza > 0 ? 'text-red-600' : 'text-gray-400'}>
                        {r.total_6ta_tardanza}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono">
                      {r.lastImprevistoMes ? (
                        <span className={r.lastImprevistoMes === new Date().getMonth() + 1 ? 'text-amber-600 font-bold' : 'text-gray-500'}>
                          {MONTH_NAMES_SHORT[r.lastImprevistoMes]}
                        </span>
                      ) : '—'}
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
                ) : popupRows.length === 0 && popupInas6ta.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-4 text-center">Sin tardanzas registradas.</div>
                ) : (
                  <>
                    {popupRows.length > 0 && (
                      <>
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tardanzas</h4>
                        <table className="w-full text-left text-xs mb-4">
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
                      </>
                    )}
                    {popupInas6ta.length > 0 && (
                      <>
                        <h4 className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">Inasistencias 6ta Tardanza</h4>
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-outline-variant/20">
                              <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Fecha</th>
                              <th className="py-1.5 px-2 font-semibold text-on-surface-variant">Motivo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {popupInas6ta.map((d, i) => (
                              <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                                <td className="py-1.5 px-2 font-mono whitespace-nowrap">{d.fecha_inasistencia}</td>
                                <td className="py-1.5 px-2">{d.motivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
