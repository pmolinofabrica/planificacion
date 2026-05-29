import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DataTable, { editableColumn } from '../../components/table/DataTable';
import type { TrackedRow } from '../../types/table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Descanso } from '../../types/database';
import { batchUpdate } from '../../utils/batch';

type DescansoDraft = Omit<Descanso, 'id_desc'> & { id_desc?: number };
type ConvocatoriaPlani = {
  id_plani: number;
  id_turno: number;
  fecha: string;
  tipo_turno: string;
};

const newDescansoTemplate: DescansoDraft = {
  id_agente: 0,
  dia_solicitado: new Date().toISOString().split('T')[0],
  mes_solicitado: new Date().getMonth() + 1,
  estado: 'pendiente',
  fecha_solicitud: new Date().toISOString().split('T')[0],
  observaciones: null,
};

const normalizeDate = (value: string | null | undefined) => {
  if (!value) return '';
  return value.toString().split('T')[0];
};

export default function DescansosPage() {
  const [data, setData] = useState<DescansoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [agentesOptions, setAgentesOptions] = useState<{value: number, label: string}[]>([]);
  const [asignando, setAsignando] = useState(false);
  const [dashDescanso, setDashDescanso] = useState<{ dayNum: string; fullDate: string; descCount: number; convCount: number }[]>([]);
  const [saldosMap, setSaldosMap] = useState<Record<number, number>>({});
  const [gridAgentes, setGridAgentes] = useState<{id_agente: number; nombre: string; apellido: string; descCount: number; convCount: number}[]>([]);
  const [gridCells, setGridCells] = useState<Record<string, Record<string, {inConvocatoria: boolean; hasDescanso: boolean; hasCargaManual: boolean; idDesc: number | null}>>>({});
  const [pendingAdds, setPendingAdds] = useState<string[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<string[]>([]);
  const [savingGrid, setSavingGrid] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const year = new Date().getFullYear();
    const startDate = new Date(year, filtroMes - 1, 1).toISOString();
    const endDate = new Date(year, filtroMes, 0, 23, 59, 59, 999).toISOString();

    const nextMes = filtroMes === 12 ? 1 : filtroMes + 1;
    const nextYear = filtroMes === 12 ? year + 1 : year;

    const [agentesRes, descRes, planisDescRes, descNextRes, convDescRes, saldosRes] = await Promise.all([
      supabase.from('datos_personales').select('id_agente, nombre, apellido, dni, cohorte').eq('activo', true).order('apellido'),
      supabase.from('descansos').select('*').gte('fecha_solicitud', startDate).lte('fecha_solicitud', endDate).order('fecha_solicitud', { ascending: false }),
      supabase
        .from('vista_planificacion_anio')
        .select('fecha')
        .eq('mes', nextMes)
        .eq('anio', nextYear)
        .ilike('tipo_turno', '%descanso%')
        .order('fecha'),
      supabase
        .from('descansos')
        .select('id_desc, dia_solicitado, id_agente, observaciones, estado')
        .eq('mes_solicitado', nextMes),
      supabase
        .from('vista_convocatoria_completa')
        .select('fecha_turno, id_agente')
        .eq('mes', nextMes)
        .eq('anio', nextYear)
        .ilike('tipo_turno', '%descanso%'),
      supabase
        .from('vista_dashboard_saldos')
        .select('id_agente, diferencia_saldo_48')
        .eq('anio', nextYear)
        .eq('mes', nextMes),
    ]);

    if (agentesRes.data) {
      setAgentesOptions((agentesRes.data as Array<{ id_agente: number; nombre: string; apellido: string; dni: string }>).map((a) => ({ value: a.id_agente, label: `${a.apellido}, ${a.nombre} (${a.dni})` })));
    }

    if (descRes.error) {
      setError('Error al cargar descansos: ' + descRes.error.message);
    } else {
      const formattedData = (descRes.data as DescansoDraft[] || []).map(r => ({
        ...r,
        fecha_solicitud: r.fecha_solicitud ? r.fecha_solicitud.toString().split('T')[0] : null,
        dia_solicitado: r.dia_solicitado ? r.dia_solicitado.toString().split('T')[0] : ''
      }));
      setData(formattedData as DescansoDraft[]);
    }

    if (planisDescRes.data && descNextRes.data && convDescRes.data) {
      const planiDates = new Set((planisDescRes.data as Array<{ fecha: string }>).map(p => p.fecha));
      const descCounts = new Map<string, number>();
      for (const d of (descNextRes.data as Array<{ dia_solicitado: string | null; estado: string | null }>)) {
        if (d.estado !== 'asignado') continue;
        const dateStr = d.dia_solicitado ? d.dia_solicitado.toString().split('T')[0] : '';
        if (planiDates.has(dateStr)) {
          descCounts.set(dateStr, (descCounts.get(dateStr) ?? 0) + 1);
        }
      }
      const convCounts = new Map<string, number>();
      for (const c of (convDescRes.data as Array<{ fecha_turno: string }>)) {
        const dateStr = c.fecha_turno;
        if (planiDates.has(dateStr)) {
          convCounts.set(dateStr, (convCounts.get(dateStr) ?? 0) + 1);
        }
      }
      setDashDescanso(
        [...planiDates].sort().map(fecha => ({
          dayNum: String(new Date(fecha + 'T00:00:00').getDate()),
          fullDate: fecha,
          descCount: descCounts.get(fecha) ?? 0,
          convCount: convCounts.get(fecha) ?? 0,
        }))
      );

      const currentYear = new Date().getFullYear();
      const cohortAgentes = (agentesRes.data as Array<{ id_agente: number; nombre: string; apellido: string; cohorte: number }>)
        .filter(a => a.cohorte === currentYear);

      const planiDatesArr = [...planiDates].sort();

      const descByAgentDate = new Map<string, { id_desc: number; hasCargaManual: boolean }>();
      for (const d of (descNextRes.data as Array<{ dia_solicitado: string | null; id_agente: number; id_desc: number; observaciones: string | null; estado: string | null }>)) {
        const dateStr = d.dia_solicitado ? d.dia_solicitado.toString().split('T')[0] : '';
        if (dateStr && planiDates.has(dateStr)) {
          descByAgentDate.set(`${d.id_agente}|${dateStr}`, { id_desc: d.id_desc, hasCargaManual: d.observaciones?.toLowerCase().includes('carga manual') ?? false });
        }
      }

      const convByAgentDate = new Set<string>();
      for (const c of (convDescRes.data as Array<{ fecha_turno: string; id_agente: number }>)) {
        if (planiDates.has(c.fecha_turno)) {
          convByAgentDate.add(`${c.id_agente}|${c.fecha_turno}`);
        }
      }

      const cells: Record<string, Record<string, { inConvocatoria: boolean; hasDescanso: boolean; hasCargaManual: boolean; idDesc: number | null }>> = {};
      const agentSummaries: { id_agente: number; nombre: string; apellido: string; descCount: number; convCount: number }[] = [];

      for (const ag of cohortAgentes) {
        let descCount = 0;
        let convCount = 0;
        const agentCells: Record<string, { inConvocatoria: boolean; hasDescanso: boolean; hasCargaManual: boolean; idDesc: number | null }> = {};

        for (const fecha of planiDatesArr) {
          const key = `${ag.id_agente}|${fecha}`;
          const inConvocatoria = convByAgentDate.has(key);
          const descInfo = descByAgentDate.get(key);
          const hasDescanso = !!descInfo;

          agentCells[fecha] = {
            inConvocatoria,
            hasDescanso,
            hasCargaManual: descInfo?.hasCargaManual ?? false,
            idDesc: descInfo?.id_desc ?? null,
          };

          if (hasDescanso) descCount++;
          if (inConvocatoria) convCount++;
        }

        cells[ag.id_agente] = agentCells;
        agentSummaries.push({ id_agente: ag.id_agente, nombre: ag.nombre, apellido: ag.apellido, descCount, convCount });
      }

      setGridCells(cells);
      setGridAgentes(agentSummaries);
      setPendingAdds([]);
      setPendingRemoves([]);

      if (saldosRes.data) {
        const map: Record<number, number> = {};
        for (const s of (saldosRes.data as Array<{ id_agente: number; diferencia_saldo_48: number | null }>)) {
          map[s.id_agente] = Number((s.diferencia_saldo_48 ?? 0).toFixed(1));
        }
        setSaldosMap(map);
      } else {
        setSaldosMap({});
      }
    }

    setRefreshVersion((v) => v + 1);
    setLoading(false);
  }, [filtroMes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const asignarSeleccionados = async (selected: DescansoDraft[]) => {
    if (selected.length === 0) return;
    setAsignando(true);
    setError('');

    const skipped = selected.filter(
      (d) => typeof d.id_desc !== 'number' || typeof d.id_agente !== 'number' || d.id_agente <= 0
    );
    const toUpdate = selected
      .filter(
        (d): d is DescansoDraft & { id_desc: number } =>
          typeof d.id_desc === 'number' && typeof d.id_agente === 'number' && d.id_agente > 0 && d.estado !== 'asignado'
      )
      .map((d) => ({ id: d.id_desc, changes: { estado: 'asignado' as const } }));

    if (toUpdate.length === 0) {
      setAsignando(false);
      if (skipped.length > 0) {
        setError('No se pudieron asignar filas sin ID de descanso.');
      }
      return;
    }

    try {
      const result = await batchUpdate<DescansoDraft>('descansos', 'id_desc', toUpdate);
      if (result.failures.length > 0) {
        throw new Error(result.failures[0]?.error || 'Algunas filas no pudieron actualizarse');
      }

      const updatedIds = new Set(toUpdate.map((u) => String(u.id)));
      setData((prev) =>
        prev.map((row) =>
          row.id_desc !== undefined && updatedIds.has(String(row.id_desc))
            ? { ...row, estado: 'asignado' }
            : row
        )
      );

      const descansosAsignados = selected.filter(
        (d): d is DescansoDraft & { id_desc: number } =>
          typeof d.id_desc === 'number' && typeof d.id_agente === 'number' && d.id_agente > 0 && d.estado !== 'asignado'
      );

      const convocatoriaWarnings: string[] = [];

      for (const descanso of descansosAsignados) {
        const diaSolicitado = normalizeDate(descanso.dia_solicitado);

        if (!descanso.id_agente || !diaSolicitado) {
          convocatoriaWarnings.push(`ID ${descanso.id_desc}: faltan datos para crear convocatoria.`);
          continue;
        }

        const { data: planificacion, error: planError } = await supabase
          .from('vista_planificacion_anio')
          .select('id_plani, id_turno, fecha, tipo_turno')
          .eq('fecha', diaSolicitado)
          .in('tipo_turno', ['descanso', 'Descanso'])
          .order('id_plani', { ascending: true });

        if (planError) {
          convocatoriaWarnings.push(`ID ${descanso.id_desc}: error buscando planificación (${planError.message}).`);
          continue;
        }

        const planMatch = (planificacion ?? [])[0] as ConvocatoriaPlani | undefined;
        if (!planMatch) {
          convocatoriaWarnings.push(`ID ${descanso.id_desc}: no existe planificación de descanso para ${diaSolicitado}.`);
          continue;
        }

        const { data: existingConvocatoria, error: existingError } = await supabase
          .from('convocatoria')
          .select('id_convocatoria')
          .eq('id_plani', planMatch.id_plani)
          .eq('id_agente', descanso.id_agente)
          .maybeSingle();

        if (existingError) {
          convocatoriaWarnings.push(`ID ${descanso.id_desc}: no se pudo verificar si ya existía convocatoria (${existingError.message}).`);
          continue;
        }

        if (existingConvocatoria) {
          continue;
        }

        const { error: insertError } = await supabase.from('convocatoria').insert({
          id_plani: planMatch.id_plani,
          id_agente: descanso.id_agente,
          id_turno: planMatch.id_turno,
          fecha_convocatoria: diaSolicitado,
          estado: 'vigente',
        });

        if (insertError) {
          convocatoriaWarnings.push(`ID ${descanso.id_desc}: no se pudo crear la convocatoria (${insertError.message}).`);
        }
      }

      await fetchData();

      if (convocatoriaWarnings.length > 0) {
        setError(`Asignación completada con observaciones: ${convocatoriaWarnings.join(' ')}`);
      }
    } catch (e: any) {
      const suffix = skipped.length > 0 ? ' Algunas filas no tenían ID de descanso.' : '';
      setError('Error al asignar masivamente: ' + e.message + suffix);
    } finally {
      setAsignando(false);
    }
  };

  const handleGridToggle = (agentId: number, dateStr: string) => {
    const key = `${agentId}|${dateStr}`;
    const cell = gridCells[agentId]?.[dateStr];
    if (!cell) return;

    if (cell.hasDescanso || pendingAdds.includes(key)) {
      setPendingRemoves(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
      setPendingAdds(prev => prev.filter(k => k !== key));
    } else {
      setPendingAdds(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
      setPendingRemoves(prev => prev.filter(k => k !== key));
    }
  };

  const handleGridSave = async () => {
    setSavingGrid(true);
    setError('');
    const nextMes = filtroMes === 12 ? 1 : filtroMes + 1;
    const errors: string[] = [];

    for (const key of pendingRemoves) {
      const parts = key.split('|');
      const agentId = Number(parts[0]);
      const dateStr = parts[1];
      const cell = gridCells[agentId]?.[dateStr];
      if (cell?.idDesc) {
        const { error: delErr } = await supabase.from('descansos').delete().eq('id_desc', cell.idDesc);
        if (delErr) errors.push(`Error al eliminar descanso: ${delErr.message}`);
      }
    }

    if (pendingAdds.length > 0) {
      const inserts: DescansoDraft[] = pendingAdds.map(key => {
        const parts = key.split('|');
        return {
          id_agente: Number(parts[0]),
          dia_solicitado: parts[1],
          mes_solicitado: nextMes,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          observaciones: 'carga manual',
        };
      });
      const { error: insErr } = await supabase.from('descansos').insert(inserts);
      if (insErr) errors.push(`Error al insertar descansos: ${insErr.message}`);
    }

    setPendingAdds([]);
    setPendingRemoves([]);
    setSavingGrid(false);

    if (errors.length > 0) {
      setError(errors.join(' | '));
    } else {
      await fetchData();
    }
  };

  const columns = useMemo<ColumnDef<TrackedRow<DescansoDraft>>[]>(() => [
    { id: 'id_desc', header: 'ID', cell: ({ row }) => <span className="text-gray-400 text-xs">{row.original.data.id_desc ?? '—'}</span>, size: 50 },
    editableColumn<DescansoDraft>('id_agente', 'Agente', 'select', agentesOptions),
    editableColumn<DescansoDraft>('fecha_solicitud', 'Fecha de Carga', 'date'),
    editableColumn<DescansoDraft>('dia_solicitado', 'Dia a Tomar', 'date'),
    editableColumn<DescansoDraft>('mes_solicitado', 'Mes', 'number'),
    editableColumn<DescansoDraft>('estado', 'Estado', 'select', [
      { value: 'pendiente', label: 'Pendiente' },
      { value: 'asignado', label: 'Asignado' },
      { value: 'cancelado', label: 'Cancelado' }
    ]),
    editableColumn<DescansoDraft>('observaciones', 'Observaciones'),
  ], [agentesOptions]);

  const massActions = [
    {
      label: asignando ? 'Asignando...' : `Asignar Descanso`,
      onClick: asignarSeleccionados,
      className: 'bg-teal-600 hover:bg-teal-700 disabled:opacity-50 font-semibold'
    }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-gray-800">Registro de Descansos Compensatorios</h2></div>
        <div className="flex gap-2">
          <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-teal-400">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Mes {m}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="mb-6 mx-0 p-4 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="text-xs font-bold text-primary mb-3 font-headline uppercase tracking-wider">
          Proximos Descansos (Mes {filtroMes === 12 ? 1 : filtroMes + 1})
        </div>
        {dashDescanso.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="py-2 px-3 font-semibold text-on-surface-variant">Turno</th>
                  {dashDescanso.map(r => (
                    <th key={r.dayNum} className="py-2 px-3 font-semibold text-on-surface-variant text-center">{r.dayNum}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                  <td className="py-1.5 px-3 font-semibold">Desc</td>
                  {dashDescanso.map(r => (
                    <td key={r.dayNum} className="py-1.5 px-2 text-center font-mono">
                      <div className="flex gap-0.5 justify-center">
                        <span className="px-1 rounded text-[13px] font-bold leading-tight bg-blue-100 text-blue-800">{r.descCount}</span>
                        <span className="px-1 rounded text-[13px] font-bold leading-tight bg-amber-100 text-amber-800">{r.convCount}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-2">No hay planificaciones de descanso para el mes proximo.</div>
        )}
      </div>

      <div className="mb-6 mx-0 p-4 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider">
            Carga de Descansos (Mes {filtroMes === 12 ? 1 : filtroMes + 1})
          </div>
          {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
            <button
              onClick={handleGridSave}
              disabled={savingGrid}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {savingGrid ? 'Guardando...' : `Guardar (${pendingAdds.length} altas, ${pendingRemoves.length} bajas)`}
            </button>
          )}
        </div>
        {dashDescanso.length > 0 && gridAgentes.length > 0 ? (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
                <tr className="border-b border-outline-variant/20">
                  <th className="py-2 px-1 font-semibold text-on-surface-variant w-[40px]">Agente</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-right w-14">Saldo</th>
                  <th className="py-2 px-2 font-semibold text-on-surface-variant text-center w-12" title="Descansos / Convocatorias">D/C</th>
                  {dashDescanso.map(r => (
                    <th key={r.dayNum} className="py-2 px-1 font-semibold text-on-surface-variant text-center min-w-[26px] w-[26px]">{r.dayNum}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridAgentes.map(ag => {
                  const agentCells = gridCells[ag.id_agente] ?? {};
                  return (
                    <tr key={ag.id_agente} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                      <td className="py-1 px-1 font-medium truncate max-w-[40px]">{ag.apellido}, {ag.nombre.charAt(0)}.</td>
                      <td className="py-1 px-2 text-right font-mono text-[12px] font-semibold">
                        {saldosMap[ag.id_agente] !== undefined ? (
                          <span className={saldosMap[ag.id_agente] < 0 ? 'text-red-600' : saldosMap[ag.id_agente] > 0 ? 'text-emerald-600' : 'text-gray-500'}>
                            {saldosMap[ag.id_agente].toFixed(1)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-1 px-1 text-center font-mono">
                        <div className="flex gap-0.5 justify-center">
                          <span className="px-1 rounded text-[12px] font-bold bg-blue-100 text-blue-800">{ag.descCount}</span>
                          <span className="px-1 rounded text-[12px] font-bold bg-amber-100 text-amber-800">{ag.convCount}</span>
                        </div>
                      </td>
                      {dashDescanso.map(r => {
                        const cell = agentCells[r.fullDate];
                        if (!cell) return <td key={r.dayNum} className="py-1 px-1" />;
                        const key = `${ag.id_agente}|${r.fullDate}`;
                        const isPendingAdd = pendingAdds.includes(key);
                        const isPendingRemove = pendingRemoves.includes(key);
                        const bgClass = isPendingRemove
                          ? 'bg-red-100'
                          : isPendingAdd
                            ? 'bg-teal-100'
                            : cell.hasDescanso && !cell.hasCargaManual
                              ? 'bg-sky-100'
                              : 'bg-white';
                        return (
                          <td key={r.dayNum} className="py-1 px-1 text-center">
                            <div
                              onClick={() => handleGridToggle(ag.id_agente, r.fullDate)}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer border transition-colors ${bgClass} border-outline-variant/30 hover:border-teal-500 active:scale-95`}
                              title={`${ag.apellido} - ${r.fullDate}${cell.inConvocatoria ? ' (convocado)' : ''}`}
                            >
                              {cell.inConvocatoria && (
                                <svg className="w-3 h-3 text-teal-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {isPendingRemove && (
                                <svg className="w-3 h-3 text-red-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-2">No hay datos de agentes para el mes proximo.</div>
        )}
      </div>

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando registros...</div>
      ) : (
        <DataTable<DescansoDraft>
          key={refreshVersion}
          tableName="descansos"
          pkField="id_desc"
          deleteMode="immediate"
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
