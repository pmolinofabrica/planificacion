import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { SaldoDashboardView } from '../../types/database';

type ViewMode = 'mensual' | 'historico';

interface HistorialMes {
  mes: number;
  horasCumplidas: number;
  horasCumplidasAcumuladas: number;
  horasObjetivoMes: number;
  horasObjetivoAcumuladas: number;
  saldoMensual: number;
  saldoAcumulado: number;
}

interface HistorialRow {
  id_agente: number;
  agente: string;
  dni: string;
  meses: Array<HistorialMes | null>;
  totalCumplido: number;
  totalObjetivo: number;
  saldoFinal: number;
}

interface CohortAgentMeta {
  id_agente: number;
  dni: string;
  agente: string;
  fecha_alta: string | null;
  fecha_baja: string | null;
}

interface CohortConfig {
  fecha_inicio: string;
  fecha_fin: string | null;
}

interface MonthlyAdjustedRow extends SaldoDashboardView {
  objetivo_mensual_48_ajustado: number;
  objetivo_mensual_12w_ajustado: number;
  diferencia_saldo_48_ajustada: number;
  diferencia_saldo_12w_ajustada: number;
}

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatHours = (value: number | null | undefined) => {
  const safeValue = Number(value ?? 0);
  return Number.isInteger(safeValue) ? String(safeValue) : safeValue.toFixed(1);
};

const getSaldoClasses = (saldo: number) => {
  if (saldo < 0) return 'border-red-200 bg-red-50 text-red-700';
  if (saldo > 0) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const startOfDay = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`);

const getProratedObjective = (
  year: number,
  month: number,
  baseObjective: number,
  cohortConfig: CohortConfig | null,
  resident: CohortAgentMeta
) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const monthDays = monthEnd.getDate();

  const cohortStart = cohortConfig?.fecha_inicio ? startOfDay(cohortConfig.fecha_inicio) : null;
  const cohortEnd = cohortConfig?.fecha_fin ? startOfDay(cohortConfig.fecha_fin) : null;
  const residentStart = resident.fecha_alta ? startOfDay(resident.fecha_alta) : null;
  const residentEnd = resident.fecha_baja ? startOfDay(resident.fecha_baja) : null;

  const effectiveStartCandidates = [monthStart];
  if (cohortStart) effectiveStartCandidates.push(cohortStart);
  if (residentStart) effectiveStartCandidates.push(residentStart);

  const effectiveEndCandidates = [monthEnd];
  if (cohortEnd) effectiveEndCandidates.push(cohortEnd);
  if (residentEnd) effectiveEndCandidates.push(residentEnd);

  const effectiveStart = new Date(Math.max(...effectiveStartCandidates.map((date) => date.getTime())));
  const effectiveEnd = new Date(Math.min(...effectiveEndCandidates.map((date) => date.getTime())));

  if (effectiveStart > effectiveEnd) return 0;

  const activeDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1;
  return Number(((baseObjective * activeDays) / monthDays).toFixed(1));
};

const buildHistorialRows = (
  rows: SaldoDashboardView[],
  residents: CohortAgentMeta[],
  year: number,
  cohortConfig: CohortConfig | null
) => {
  const rowsByAgentAndMonth = new Map<string, SaldoDashboardView>();

  for (const row of rows) {
    rowsByAgentAndMonth.set(`${row.id_agente}-${row.mes}`, row);
  }

  return residents.map((resident) => {
    const meses: Array<HistorialMes | null> = [];
    let cumulativeCompleted = 0;
    let cumulativeObjective = 0;

    for (let month = 1; month <= 12; month += 1) {
      const row = rowsByAgentAndMonth.get(`${resident.id_agente}-${month}`);
      const monthlyCompleted = row?.total_horas_convocadas ?? 0;
      const monthlyObjectiveBase = row?.objetivo_mensual_48 ?? 48;
      const monthlyObjective = getProratedObjective(year, month, monthlyObjectiveBase, cohortConfig, resident);

      cumulativeCompleted += monthlyCompleted;
      cumulativeObjective += monthlyObjective;

      meses.push({
        mes: month,
        horasCumplidas: monthlyCompleted,
        horasCumplidasAcumuladas: Number(cumulativeCompleted.toFixed(1)),
        horasObjetivoMes: monthlyObjective,
        horasObjetivoAcumuladas: Number(cumulativeObjective.toFixed(1)),
        saldoMensual: Number((monthlyCompleted - monthlyObjective).toFixed(1)),
        saldoAcumulado: Number((cumulativeCompleted - cumulativeObjective).toFixed(1)),
      });
    }

    return {
      id_agente: resident.id_agente,
      agente: resident.agente,
      dni: resident.dni,
      meses,
      totalCumplido: Number(cumulativeCompleted.toFixed(1)),
      totalObjetivo: Number(cumulativeObjective.toFixed(1)),
      saldoFinal: Number((cumulativeCompleted - cumulativeObjective).toFixed(1)),
    };
  });
};

const buildMonthlyRows = (
  rows: SaldoDashboardView[],
  residents: CohortAgentMeta[],
  year: number,
  cohortConfig: CohortConfig | null,
  selectedMonth: number
) => {
  const residentById = new Map(residents.map((resident) => [resident.id_agente, resident]));

  return rows
    .filter((row) => row.mes === selectedMonth)
    .map((row) => {
      const resident = residentById.get(row.id_agente);
      if (!resident) {
        return {
          ...row,
          objetivo_mensual_48_ajustado: row.objetivo_mensual_48,
          objetivo_mensual_12w_ajustado: row.objetivo_mensual_12w,
          diferencia_saldo_48_ajustada: row.total_horas_convocadas - row.objetivo_mensual_48,
          diferencia_saldo_12w_ajustada: row.total_horas_convocadas - row.objetivo_mensual_12w,
        } satisfies MonthlyAdjustedRow;
      }

      const objetivo48 = getProratedObjective(year, selectedMonth, row.objetivo_mensual_48, cohortConfig, resident);
      const objetivo12 = getProratedObjective(year, selectedMonth, row.objetivo_mensual_12w, cohortConfig, resident);

      return {
        ...row,
        objetivo_mensual_48_ajustado: objetivo48,
        objetivo_mensual_12w_ajustado: objetivo12,
        diferencia_saldo_48_ajustada: Number((row.total_horas_convocadas - objetivo48).toFixed(1)),
        diferencia_saldo_12w_ajustada: Number((row.total_horas_convocadas - objetivo12).toFixed(1)),
      } satisfies MonthlyAdjustedRow;
    });
};

export default function SaldosPage() {
  const currentDate = new Date();
  const [anio, setAnio] = useState(currentDate.getFullYear());
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>('mensual');
  const [data, setData] = useState<MonthlyAdjustedRow[]>([]);
  const [historicalData, setHistoricalData] = useState<HistorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingMonth, setCalculatingMonth] = useState(false);
  const [calculatingYear, setCalculatingYear] = useState(false);
  const [error, setError] = useState('');

  const fetchSaldos = useCallback(async () => {
    setLoading(true);
    setError('');

    const [
      { data: rows, error: saldosError },
      { data: cohortRows, error: cohortError },
      { data: cohortConfigRows, error: configError },
    ] = await Promise.all([
      supabase
        .from('vista_dashboard_saldos')
        .select('*')
        .eq('anio', anio)
        .order('residente')
        .order('mes'),
      supabase
        .from('datos_personales')
        .select('id_agente, dni, apellido, nombre, fecha_alta, fecha_baja')
        .eq('cohorte', anio)
        .eq('activo', true),
      supabase
        .from('config_cohorte')
        .select('fecha_inicio, fecha_fin')
        .eq('anio', anio)
        .eq('activo', true)
        .limit(1),
    ]);

    if (saldosError || cohortError || configError) {
      setError('Error al cargar saldos: ' + (saldosError?.message ?? cohortError?.message ?? configError?.message ?? 'Error desconocido'));
      setData([]);
      setHistoricalData([]);
      setLoading(false);
      return;
    }

    const residents = ((cohortRows as Array<{
      id_agente: number;
      dni: string | null;
      apellido: string | null;
      nombre: string | null;
      fecha_alta: string | null;
      fecha_baja: string | null;
    }>) ?? []).map((row) => ({
      id_agente: row.id_agente,
      dni: row.dni ?? '',
      agente: `${row.apellido ?? ''}, ${row.nombre ?? ''}`.replace(/^,\s*/, '').trim(),
      fecha_alta: row.fecha_alta,
      fecha_baja: row.fecha_baja,
    }));

    const cohortConfig = (((cohortConfigRows as CohortConfig[]) ?? [])[0]) ?? null;
    const cohortIds = new Set(residents.map((row) => row.id_agente));

    const filteredRows = ((rows as SaldoDashboardView[]) ?? []).filter((row) => cohortIds.has(row.id_agente));

    if (viewMode === 'mensual') {
      setData(buildMonthlyRows(filteredRows, residents, anio, cohortConfig, mes));
      setHistoricalData([]);
    } else {
      setHistoricalData(buildHistorialRows(filteredRows, residents, anio, cohortConfig));
      setData([]);
    }

    setLoading(false);
  }, [anio, mes, viewMode]);

  useEffect(() => {
    fetchSaldos();
  }, [fetchSaldos]);

  const handleRecalcularMes = async () => {
    setCalculatingMonth(true);
    setError('');

    try {
      const { error: err } = await supabase.rpc('rpc_calcular_saldos_mes', {
        p_anio: anio,
        p_mes: mes,
      });
      if (err) throw err;
      await fetchSaldos();
    } catch (err: any) {
      setError('Error al calcular saldos del mes: ' + err.message);
    } finally {
      setCalculatingMonth(false);
    }
  };

  const handleRecalcularAnio = async () => {
    setCalculatingYear(true);
    setError('');

    try {
      for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
        const { error: err } = await supabase.rpc('rpc_calcular_saldos_mes', {
          p_anio: anio,
          p_mes: monthNumber,
        });
        if (err) throw err;
      }
      await fetchSaldos();
    } catch (err: any) {
      setError('Error al recalcular el anio: ' + err.message);
    } finally {
      setCalculatingYear(false);
    }
  };

  const historicalColumnCount = useMemo(() => monthLabels.length + 2, []);

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Saldos Consolidados</h2>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'mensual'
              ? 'Vista mensual con objetivos y diferencias del periodo seleccionado.'
              : 'Vista anual con acumulado, objetivo y saldo por mes para la cohorte seleccionada.'}
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('mensual')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'mensual' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewMode('historico')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'historico' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Historico
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {viewMode === 'mensual' && (
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNumber) => (
                  <option key={monthNumber} value={monthNumber}>
                    Mes {monthNumber}
                  </option>
                ))}
              </select>
            )}

            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
            >
              {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>

            <button
              onClick={handleRecalcularAnio}
              disabled={calculatingYear || calculatingMonth}
              className={`px-4 py-1.5 rounded font-medium text-sm transition-colors text-white ${
                calculatingYear || calculatingMonth ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800 shadow'
              }`}
            >
              {calculatingYear ? `Recalculando ${anio}...` : `Recalcular anio ${anio}`}
            </button>

            {viewMode === 'mensual' && (
              <button
                onClick={handleRecalcularMes}
                disabled={calculatingMonth || calculatingYear}
                className={`px-4 py-1.5 rounded font-medium text-sm transition-colors text-white ${
                  calculatingMonth || calculatingYear ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow'
                }`}
              >
                {calculatingMonth ? 'Calculando...' : `Recalcular mes ${mes}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando tablero...</div>
      ) : viewMode === 'historico' ? (
        <div className="bg-white shadow rounded overflow-hidden overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold border-b sticky left-0 bg-gray-100 z-10 min-w-[240px]">Residente</th>
                {monthLabels.map((label) => (
                  <th key={label} className="px-3 py-3 font-semibold border-b text-center min-w-[176px]">
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold border-b text-center min-w-[140px]">Saldo final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {historicalData.map((row) => (
                <tr key={row.id_agente} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900">{row.agente}</div>
                    <div className="text-xs text-gray-500">{row.dni || 'Sin DNI'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Acum.: {formatHours(row.totalCumplido)} / Obj.: {formatHours(row.totalObjetivo)}
                    </div>
                  </td>
                  {row.meses.map((monthData, index) => (
                    <td key={`${row.id_agente}-${index + 1}`} className="px-3 py-3 text-center">
                      {monthData ? (
                        <div
                          className={`rounded-xl border p-3 text-left shadow-sm ${getSaldoClasses(monthData.saldoAcumulado)}`}
                          title={`Mes ${monthData.mes}: cumplidas ${formatHours(monthData.horasCumplidasAcumuladas)}, objetivo ${formatHours(monthData.horasObjetivoAcumuladas)}, saldo ${formatHours(monthData.saldoAcumulado)}`}
                        >
                          <div className="grid gap-2">
                            <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-sky-800">
                              <div className="text-[10px] uppercase tracking-wider opacity-75">Cumplidas</div>
                              <div className="text-base font-bold">{formatHours(monthData.horasCumplidasAcumuladas)}</div>
                              <div className="text-[11px] opacity-80">Mes: {formatHours(monthData.horasCumplidas)}</div>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-amber-900">
                              <div className="text-[10px] uppercase tracking-wider opacity-75">A cumplir</div>
                              <div className="text-base font-semibold">{formatHours(monthData.horasObjetivoAcumuladas)}</div>
                              <div className="text-[11px] opacity-80">Mes: {formatHours(monthData.horasObjetivoMes)}</div>
                            </div>
                            <div className={`rounded-lg border px-2 py-2 ${getSaldoClasses(monthData.saldoAcumulado)}`}>
                              <div className="text-[10px] uppercase tracking-wider opacity-75">Saldo (dif.)</div>
                              <div className="text-base font-bold">
                                {monthData.saldoAcumulado > 0 ? '+' : ''}
                                {formatHours(monthData.saldoAcumulado)}
                              </div>
                              <div className="text-[11px] opacity-80">
                                Mes: {monthData.saldoMensual > 0 ? '+' : ''}
                                {formatHours(monthData.saldoMensual)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 px-2 py-10 text-gray-300">-</div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex min-w-[96px] justify-center rounded-lg border px-3 py-2 font-bold ${getSaldoClasses(row.saldoFinal)}`}>
                      {row.saldoFinal > 0 ? '+' : ''}
                      {formatHours(row.saldoFinal)}
                    </div>
                  </td>
                </tr>
              ))}
              {historicalData.length === 0 && (
                <tr>
                  <td colSpan={historicalColumnCount} className="px-4 py-8 text-center text-gray-500 italic">
                    No hay saldos historicos para este anio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded overflow-hidden overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold border-b">Residente</th>
                <th className="px-4 py-3 font-semibold border-b text-center" title="Horas por cronograma planificado">Total Hs</th>
                <th className="px-4 py-3 font-semibold border-b text-center text-blue-800 bg-blue-50" title="Objetivo local">Obj. Mensual 48h</th>
                <th className="px-4 py-3 font-semibold border-b text-center text-blue-800 bg-blue-50">Dif. 48h</th>
                <th className="px-4 py-3 font-semibold border-b text-center text-purple-800 bg-purple-50">Obj. Mensual 12</th>
                <th className="px-4 py-3 font-semibold border-b text-center text-purple-800 bg-purple-50">Dif. 12</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Manana</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Tarde</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Apertura</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Finde</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Otros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.id_agente} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {row.residente} <span className="text-gray-400 font-normal">({row.dni})</span>
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600 font-medium">{row.total_horas_convocadas}</td>
                  <td className="px-4 py-2 text-center font-bold bg-blue-50 text-blue-700">{formatHours(row.objetivo_mensual_48_ajustado)}</td>
                  <td className={`px-4 py-2 text-center font-bold ${row.diferencia_saldo_48_ajustada < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {row.diferencia_saldo_48_ajustada > 0 ? '+' : ''}
                    {formatHours(row.diferencia_saldo_48_ajustada)}
                  </td>
                  <td className="px-4 py-2 text-center font-bold bg-purple-50 text-purple-700">{formatHours(row.objetivo_mensual_12w_ajustado)}</td>
                  <td className={`px-4 py-2 text-center font-bold ${row.diferencia_saldo_12w_ajustada < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {row.diferencia_saldo_12w_ajustada > 0 ? '+' : ''}
                    {formatHours(row.diferencia_saldo_12w_ajustada)}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_manana}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_tarde}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_apertura_publico ?? 0}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_finde}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_otros}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 italic">
                    No hay saldos calculados para este mes. Presiona Recalcular.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
