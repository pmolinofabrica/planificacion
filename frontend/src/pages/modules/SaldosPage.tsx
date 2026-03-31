import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { SaldoDashboardView } from '../../types/database';

export default function SaldosPage() {
  const currentDate = new Date();
  const [anio, setAnio] = useState(currentDate.getFullYear());
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [data, setData] = useState<SaldoDashboardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const fetchSaldos = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // Filtro por mes y año
    const { data: rows, error: err } = await supabase
      .from('vista_dashboard_saldos')
      .select('*')
      .eq('anio', anio)
      .eq('mes', mes)
      .order('residente');

    if (err) {
      setError('Error al cargar saldos: ' + err.message);
    } else {
      setData(rows as SaldoDashboardView[] ?? []);
    }
    setLoading(false);
  }, [anio, mes]);

  useEffect(() => {
    fetchSaldos();
  }, [fetchSaldos]);

  const handleRecalcular = async () => {
    setCalculating(true);
    setError('');
    try {
      const { error: err } = await supabase.rpc('rpc_calcular_saldos_mes', {
        p_anio: anio,
        p_mes: mes
      });
      if (err) throw err;
      await fetchSaldos();
    } catch (err: any) {
      setError('Error al calcular saldos: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Saldos Consolidados</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={mes} 
            onChange={(e) => setMes(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
          <select 
            value={anio} 
            onChange={(e) => setAnio(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          <button
            onClick={handleRecalcular}
            disabled={calculating}
            className={`ml-2 px-4 py-1.5 rounded font-medium text-sm transition-colors text-white ${
              calculating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow'
            }`}
          >
            {calculating ? 'Calculando...' : `⚡ Recalcular (${mes}/${anio})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando tablero...</div>
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
                <th className="px-4 py-3 font-semibold border-b text-center">Mañana</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Tarde</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Finde</th>
                <th className="px-4 py-3 font-semibold border-b text-center">Otros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map(row => (
                <tr key={row.id_agente} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{row.residente} <span className="text-gray-400 font-normal">({row.dni})</span></td>
                  <td className="px-4 py-2 text-center text-gray-600 font-medium">{row.total_horas_convocadas}</td>
                  
                  <td className="px-4 py-2 text-center font-bold bg-blue-50 text-blue-700">{Math.round(row.objetivo_mensual_48 || 0)}</td>
                  <td className={`px-4 py-2 text-center font-bold ${row.diferencia_saldo_48 < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {row.diferencia_saldo_48 > 0 ? '+' : ''}{Math.round(row.diferencia_saldo_48 || 0)}
                  </td>
                  
                  <td className="px-4 py-2 text-center font-bold bg-purple-50 text-purple-700">{Math.round(row.objetivo_mensual_12w || 0)}</td>
                  <td className={`px-4 py-2 text-center font-bold ${row.diferencia_saldo_12w < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {row.diferencia_saldo_12w > 0 ? '+' : ''}{Math.round(row.diferencia_saldo_12w || 0)}
                  </td>
                  
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_manana}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_tarde}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_finde}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{row.horas_otros}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 italic">No hay saldos calculados para este mes. Presiona Recalcular.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
