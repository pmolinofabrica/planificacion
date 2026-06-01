import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { InasistenciaView } from '../../types/database';

type PanelRow = {
  id_inasistencia: number;
  id_agente: number;
  agente: string;
  dni: string;
  fecha_inasistencia: string;
  fecha_inasistencia_justifica: string;
  motivo: string;
  estado: string | null;
  checked: boolean;
  fecha_carga: string | null;
  id_certificado: number | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;
};

const todayIso = () => new Date().toISOString().split('T')[0];
const formatDayMonth = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export const CERTIFICADOS_CHANGED_EVENT = 'certificados:changed';
const emitCertificadosChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CERTIFICADOS_CHANGED_EVENT));
  }
};
const errorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    if ('message' in e) {
      const msg = (e as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    if ('error' in e) {
      const err = (e as { error: unknown }).error;
      if (typeof err === 'string') return err;
    }
    try {
      return JSON.stringify(e);
    } catch {
      return 'Error desconocido (objeto no serializable)';
    }
  }
  return String(e ?? 'Error desconocido');
};

type CertificadosPanelProps = {
  onChange?: () => void;
};

export default function CertificadosPanel({ onChange }: CertificadosPanelProps = {}) {
  const [panelRows, setPanelRows] = useState<PanelRow[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{ ok: number; fail: number } | null>(null);

  const fetchPanel = useCallback(async () => {
    setPanelLoading(true);
    setPanelError('');

    const year = new Date().getFullYear();

    const { data: viewRows, error: viewErr } = await supabase
      .from('vista_inasistencias_completa')
      .select('*')
      .eq('anio', year)
      .eq('requiere_certificado', true);

    if (viewErr) {
      setPanelError('Error al cargar inasistencias pendientes: ' + viewErr.message);
      setPanelRows([]);
      setPanelLoading(false);
      return;
    }

    const inasisView = (viewRows ?? []) as InasistenciaView[];
    const ids = inasisView.map(r => r.id_inasistencia);
    let presentMap = new Map<number, boolean>();
    if (ids.length > 0) {
      const { data: inasisRows, error: inasisErr } = await supabase
        .from('inasistencias')
        .select('id_inasistencia, certificado_presentado')
        .in('id_inasistencia', ids);

      if (inasisErr) {
        setPanelError('Error al verificar certificados previos: ' + inasisErr.message);
        setPanelRows([]);
        setPanelLoading(false);
        return;
      }
      type InasisFlag = { id_inasistencia: number; certificado_presentado: boolean | null };
      presentMap = new Map((inasisRows ?? []).map((r: InasisFlag) => [r.id_inasistencia, r.certificado_presentado ?? false]));
    }

    const rows: PanelRow[] = inasisView
      .filter(r => !presentMap.get(r.id_inasistencia))
      .map(r => ({
        id_inasistencia: r.id_inasistencia,
        id_agente: r.id_agente,
        agente: r.agente,
        dni: r.dni,
        fecha_inasistencia: r.fecha_inasistencia,
        fecha_inasistencia_justifica: r.fecha_inasistencia,
        motivo: r.motivo,
        estado: r.estado,
        checked: false,
        fecha_carga: null,
        id_certificado: null,
        dirty: false,
        saving: false,
        error: null,
      }));

    setPanelRows(rows);
    setPanelLoading(false);
  }, []);

  useEffect(() => {
    fetchPanel();
  }, [fetchPanel]);

  const updateRow = (id: number, patch: Partial<PanelRow>) => {
    setPanelRows(prev => prev.map(r => r.id_inasistencia === id ? { ...r, ...patch } : r));
  };

  const handleToggle = (row: PanelRow, checked: boolean) => {
    if (row.checked === checked) return;

    if (checked) {
      updateRow(row.id_inasistencia, {
        checked: true,
        fecha_carga: todayIso(),
        dirty: true,
        error: null,
      });
    } else {
      if (!row.id_certificado) {
        updateRow(row.id_inasistencia, {
          checked: false,
          fecha_carga: null,
          error: null,
        });
        return;
      }
      updateRow(row.id_inasistencia, {
        checked: false,
        fecha_carga: null,
        dirty: true,
        error: null,
      });
    }
  };

  const handleDateChange = (
    row: PanelRow,
    patch: { fecha_carga?: string | null }
  ) => {
    if (!row.checked) return;
    const fecha_carga = patch.fecha_carga !== undefined ? patch.fecha_carga : row.fecha_carga;
    updateRow(row.id_inasistencia, { fecha_carga, dirty: true, error: null });
  };

  const handleSaveAll = async () => {
    const dirtyRows = panelRows.filter(r => r.dirty);
    if (dirtyRows.length === 0) return;

    setSavingAll(true);
    setSaveSummary(null);

    let ok = 0;
    let fail = 0;

    for (const row of dirtyRows) {
      updateRow(row.id_inasistencia, { saving: true, error: null });

      try {
        if (row.checked && !row.id_certificado) {
          if (!row.fecha_carga) {
            throw new Error('Falta la fecha de carga del certificado.');
          }
          const { data: inserted, error: insErr } = await supabase
            .from('certificados')
            .insert({
              id_inasistencia: row.id_inasistencia,
              id_agente: row.id_agente,
              fecha_carga: row.fecha_carga,
              fecha_inasistencia_justifica: row.fecha_inasistencia_justifica,
            })
            .select('id_certificado')
            .single();

          if (insErr) throw insErr;

          updateRow(row.id_inasistencia, {
            id_certificado: inserted.id_certificado,
            dirty: false,
            saving: false,
          });
          ok += 1;
        } else if (row.checked && row.id_certificado) {
          if (!row.fecha_carga) {
            throw new Error('Falta la fecha de carga del certificado.');
          }
          const { error: updErr } = await supabase
            .from('certificados')
            .update({
              fecha_carga: row.fecha_carga,
            })
            .eq('id_certificado', row.id_certificado);

          if (updErr) throw updErr;

          updateRow(row.id_inasistencia, { dirty: false, saving: false });
          ok += 1;
        } else if (!row.checked && row.id_certificado) {
          const { error: delErr } = await supabase
            .from('certificados')
            .delete()
            .eq('id_certificado', row.id_certificado);

          if (delErr) throw delErr;

          updateRow(row.id_inasistencia, {
            id_certificado: null,
            dirty: false,
            saving: false,
          });
          ok += 1;
        } else {
          updateRow(row.id_inasistencia, { dirty: false, saving: false });
        }
      } catch (e) {
        console.error('Error guardando fila:', e);
        updateRow(row.id_inasistencia, {
          saving: false,
          error: errorMessage(e),
        });
        fail += 1;
      }
    }

    setSaveSummary({ ok, fail });
    setSavingAll(false);
    if (ok > 0) {
      emitCertificadosChanged();
      onChange?.();
    }
  };

  const dirtyCount = useMemo(() => panelRows.filter(r => r.dirty).length, [panelRows]);

  return (
    <div className="p-3 bg-surface-container-lowest/70 backdrop-blur-md rounded-xl border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs font-bold text-primary font-headline uppercase tracking-wider flex items-center gap-2">
          Certificados Pendientes ({panelRows.length})
          {panelLoading && <span className="text-[10px] text-slate-400 italic font-normal">cargando…</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPanel}
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold font-headline uppercase tracking-wider hover:bg-primary/20 transition-all active:scale-95"
          >
            Refrescar
          </button>
          <button
            onClick={handleSaveAll}
            disabled={savingAll || dirtyCount === 0}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold font-headline uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingAll ? 'Guardando…' : `Guardar (${dirtyCount})`}
          </button>
        </div>
      </div>
      {saveSummary && (
        <div className={`mb-3 px-3 py-2 rounded text-xs ${saveSummary.fail === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {saveSummary.fail === 0
            ? `✅ ${saveSummary.ok} certificado(s) guardado(s) correctamente.`
            : `⚠ ${saveSummary.ok} guardado(s), ${saveSummary.fail} con error. Revisá las filas marcadas.`}
        </div>
      )}
      {panelError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-xs">{panelError}</div>}
      {panelRows.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-2">No hay inasistencias con requiere_certificado=true sin presentar este año.</div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <thead className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm z-10">
              <tr className="border-b border-outline-variant/20">
                <th className="py-2 px-2 font-semibold text-on-surface-variant">Agente</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">F. Inasist.</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant">Motivo</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center">Presentado</th>
                <th className="py-2 px-2 font-semibold text-on-surface-variant text-center" title="Fecha de carga del certificado">F. Carga</th>
              </tr>
            </thead>
            <tbody>
              {panelRows.map(row => (
                <tr key={row.id_inasistencia} className={`border-b border-outline-variant/10 transition-colors ${row.dirty ? 'bg-amber-50/50' : 'hover:bg-surface-container-low'} ${row.error ? 'border-l-2 border-l-red-500' : ''}`}>
                  <td className="py-1.5 px-2 font-medium truncate" title={row.agente}>{row.agente}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-[12px] text-gray-600 whitespace-nowrap" title={row.fecha_inasistencia}>{formatDayMonth(row.fecha_inasistencia)}</td>
                  <td className="py-1.5 px-2 text-gray-700 truncate" title={row.motivo}>{row.motivo}</td>
                  <td className="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.checked}
                      disabled={row.saving || savingAll}
                      onChange={(e) => handleToggle(row, e.target.checked)}
                      className="accent-primary w-4 h-4 cursor-pointer disabled:opacity-50"
                      aria-label="Marcar certificado como presentado"
                    />
                    {row.error && <div className="text-red-600 text-[10px] mt-1 leading-tight max-w-[120px] mx-auto">{row.error}</div>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <input
                      type="date"
                      value={row.fecha_carga ?? ''}
                      disabled={!row.checked || row.saving || savingAll}
                      onChange={(e) => handleDateChange(row, { fecha_carga: e.target.value })}
                      className="w-full border border-outline-variant/30 rounded px-1 py-0.5 text-xs font-mono disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
