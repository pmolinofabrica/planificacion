import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DisponibilidadModalProps {
  open: boolean;
  onClose: () => void;
  agentes: Array<{ id_agente: number; nombre: string; apellido: string }>;
  agentesGruposDias: Array<{ id_agente: number; dia_semana: number; grupo: string }>;
}

interface EventualRow {
  id: number;
  fecha: string;
  dia_semana: number;
  tipo_dia: string | null;
  id_agente: number | null;
  agente: string;
  grupo: string | null;
  observaciones: string | null;
}

const DIA_NOMBRES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

type Tab = 'fija' | 'eventual';

interface MatrixCell {
  id: string;
  label: string;
  sublabel?: string;
}

function MatrixTable<R, C>({
  rowHeader,
  rows,
  rowKey,
  rowLabel,
  cols,
  colKey,
  colLabel,
  getCells,
}: {
  rowHeader: string;
  rows: R[];
  rowKey: (row: R) => string;
  rowLabel: (row: R) => string;
  cols: C[];
  colKey: (col: C) => string;
  colLabel: (col: C) => string;
  getCells: (row: R, col: C) => MatrixCell[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-outline-variant/20">
            <th className="py-2 px-3 font-semibold text-on-surface-variant sticky left-0 bg-white z-10">{rowHeader}</th>
            {cols.map(c => (
              <th key={colKey(c)} className="py-2 px-3 font-semibold text-on-surface-variant text-center whitespace-nowrap">{colLabel(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-outline-variant/10 align-top">
              <td className="py-2 px-3 font-semibold whitespace-nowrap sticky left-0 bg-white z-10">{rowLabel(row)}</td>
              {cols.map(col => {
                const cells = getCells(row, col);
                return (
                  <td key={colKey(col)} className="py-2 px-1 min-w-[140px]">
                    <div className="flex flex-col gap-1">
                      {cells.map(cell => (
                        <div
                          key={cell.id}
                          title={cell.sublabel}
                          className="bg-white border border-outline-variant/20 rounded-md px-2 py-1 text-[11px] shadow-sm leading-tight"
                        >
                          {cell.label}
                          {cell.sublabel && <div className="text-[9px] text-on-surface-variant/70 mt-0.5">{cell.sublabel}</div>}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-4 text-xs text-gray-400 text-center italic">Sin datos para mostrar.</div>
      )}
    </div>
  );
}

export default function DisponibilidadModal({ open, onClose, agentes, agentesGruposDias }: DisponibilidadModalProps) {
  const [tab, setTab] = useState<Tab>('fija');
  const [eventualData, setEventualData] = useState<EventualRow[] | null>(null);
  const [loadingEventual, setLoadingEventual] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setTab('fija');
      return;
    }
    if (tab !== 'eventual' || eventualData !== null) return;
    setLoadingEventual(true);
    setError('');
    (async () => {
      const res = await supabase
        .from('vista_disponibilidad_eventual')
        .select('*')
        .order('fecha')
        .order('agente');
      if (res.error) {
        setError(res.error.message);
      } else {
        setEventualData(res.data as EventualRow[]);
      }
      setLoadingEventual(false);
    })();
  }, [open, tab, eventualData]);

  if (!open) return null;

  const fijaRows = agentesGruposDias
    .map(r => ({ ...r, agente: agentes.find(a => a.id_agente === r.id_agente) }))
    .filter(r => r.agente);

  const diasFija = [...new Set(fijaRows.map(r => r.dia_semana))].sort((a, b) => a - b);
  const gruposFija = [...new Set(fijaRows.map(r => r.grupo))].sort();

  const gruposEventual = eventualData ? [...new Set(eventualData.map(r => r.grupo).filter(Boolean) as string[])].sort() : [];
  const fechasEventual = eventualData ? [...new Set(eventualData.map(r => r.fecha))].sort() : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl p-6 max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline text-lg font-bold text-gray-800">Disponibilidad</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('fija')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold font-headline uppercase tracking-wider transition-all ${
              tab === 'fija' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Grupos por día
          </button>
          <button
            onClick={() => setTab('eventual')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold font-headline uppercase tracking-wider transition-all ${
              tab === 'eventual' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Disponibilidad eventual
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-xs">{error}</div>}

        {tab === 'fija' && (
          <MatrixTable
            rowHeader="Grupo"
            rows={gruposFija}
            rowKey={g => g}
            rowLabel={g => g}
            cols={diasFija}
            colKey={d => String(d)}
            colLabel={d => DIA_NOMBRES[d] ?? String(d)}
            getCells={(grupo, dia) =>
              fijaRows
                .filter(r => r.dia_semana === dia && r.grupo === grupo)
                .map(r => ({ id: String(r.id_agente), label: `${r.agente!.apellido}, ${r.agente!.nombre}` }))
            }
          />
        )}

        {tab === 'eventual' && (
          <>
            {loadingEventual && !eventualData && (
              <div className="py-8 text-center text-xs text-gray-500">Cargando disponibilidad eventual...</div>
            )}
            {eventualData && (
              <MatrixTable
                rowHeader="Grupo"
                rows={gruposEventual}
                rowKey={g => g}
                rowLabel={g => g}
                cols={fechasEventual}
                colKey={f => f}
                colLabel={f => f}
                getCells={(grupo, fecha) =>
                  eventualData
                    .filter(r => r.fecha === fecha && r.grupo === grupo)
                    .map(r => ({ id: String(r.id), label: r.agente, sublabel: r.observaciones ?? undefined }))
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
