import { useState, useEffect, useRef } from 'react';
import { X, Mail, Save, RotateCcw } from 'lucide-react';
import { reemplazarVariables, obtenerPlantilla, guardarPlantilla, resetPlantilla } from '../../lib/email-utils';
import type { TemplateVars, ModoCorreo } from '../../lib/email-utils';

interface EmailDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  modo: ModoCorreo;
  templateVars: TemplateVars;
  emails: string[];
}

export default function EmailDraftModal({ isOpen, onClose, modo, templateVars, emails }: EmailDraftModalProps) {
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [saved, setSaved] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const plantilla = obtenerPlantilla(modo);
      setAsunto(plantilla.asunto);
      setCuerpo(plantilla.cuerpo);
      setSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modo]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const handleSaveTemplate = () => {
    guardarPlantilla(modo, asunto, cuerpo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetTemplate = () => {
    resetPlantilla(modo);
    const plantilla = obtenerPlantilla(modo);
    setAsunto(plantilla.asunto);
    setCuerpo(plantilla.cuerpo);
  };

  if (!isOpen) return null;

  const cuerpoPreview = reemplazarVariables(cuerpo, templateVars);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Editar borrador {modo === 'confirmado' ? 'confirmado' : 'pendiente'}
            </h2>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 rounded-lg hover:bg-outline-variant/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Destinatarios */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Destinatarios (CCO)</label>
            <div className="flex flex-wrap gap-1">
              {emails.map((email, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {email}
                </span>
              ))}
            </div>
          </div>

          {/* Variables disponibles */}
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <p className="text-xs font-medium text-on-surface-variant mb-2">Variables disponibles:</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(templateVars).map((key) => (
                <span key={key} className="px-2 py-0.5 rounded bg-outline-variant/20 text-on-surface-variant text-[10px] font-mono">
                  {'{' + key + '}'}
                </span>
              ))}
            </div>
          </div>

          {/* Asunto */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Asunto</label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>

          {/* Cuerpo editable */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Cuerpo del correo (editable)</label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm font-mono"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>

          {/* Vista previa */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Vista previa</label>
            <div className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm whitespace-pre-wrap">
              {cuerpoPreview}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between px-6 py-4 border-t border-outline-variant/20">
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleSaveTemplate(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saved ? 'Guardado' : 'Guardar plantilla'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleResetTemplate(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-outline-variant/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Restablecer
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-medium hover:bg-outline-variant/10 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
