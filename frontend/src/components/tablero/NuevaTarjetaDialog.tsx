import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { TIPO_CONFIG, TABLERO_USERS } from '../../types/tablero';
import type { TableroUser, TableroTipo, TableroItem } from '../../types/tablero';

interface NuevaTarjetaDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: TableroUser | null;
  onSubmit?: (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => Promise<void>;
  onSaveEdit?: (id: number, titulo: string, descripcion: string, tipo: TableroTipo) => Promise<void>;
  editItem?: TableroItem | null;
  dialogTitle?: string;
}

export function NuevaTarjetaDialog({ open, onClose, currentUser, onSubmit, onSaveEdit, editItem, dialogTitle }: NuevaTarjetaDialogProps) {
  const isEdit = !!editItem;
  const [titulo, setTitulo] = useState(isEdit ? editItem!.titulo : '');
  const [descripcion, setDescripcion] = useState(isEdit ? editItem!.descripcion : '');
  const [tipo, setTipo] = useState<TableroTipo>(isEdit ? editItem!.tipo : 'fallo');
  const [autor, setAutor] = useState<TableroUser>(currentUser || TABLERO_USERS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    if (isEdit && onSaveEdit && editItem) {
      await onSaveEdit(editItem.id, titulo.trim(), descripcion.trim(), tipo);
    } else if (onSubmit) {
      await onSubmit(titulo.trim(), descripcion.trim(), tipo, autor);
    }
    setSaving(false);
    setTitulo('');
    setDescripcion('');
    setTipo('fallo');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle || (isEdit ? 'Editar tarjeta' : 'Nueva tarjeta')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2 px-6">
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block font-headline uppercase tracking-wider">Tipo</label>
            <div className="flex gap-1.5">
              {(Object.entries(TIPO_CONFIG) as [TableroTipo, typeof TIPO_CONFIG[TableroTipo]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setTipo(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-headline transition-all border ${
                    tipo === key
                      ? 'border-primary bg-primary/10 text-on-surface'
                      : 'border-outline-variant/20 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>
          {(!currentUser && !isEdit) && (
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block font-headline uppercase tracking-wider">Autor</label>
              <select
                value={autor}
                onChange={(e) => setAutor(e.target.value as TableroUser)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-md px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
              >
                {TABLERO_USERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block font-headline uppercase tracking-wider">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumí en una línea..."
              className="w-full bg-surface-container-high border border-outline-variant/20 rounded-md px-2.5 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block font-headline uppercase tracking-wider">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contá más detalles..."
              rows={3}
              className="w-full bg-surface-container-high border border-outline-variant/20 rounded-md px-2.5 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold font-headline text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-wider">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim() || saving}
            className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold font-headline shadow-md hover:shadow-lg transition-all disabled:opacity-50 uppercase tracking-wider"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarjeta'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
