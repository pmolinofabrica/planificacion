import { useState, useEffect } from 'react';
import { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { TIPO_CONFIG, ESTADO_COLUMNS } from '../../types/tablero';
import type { TableroItem, TableroUser, TableroEstado, TableroComentario, TableroTipo } from '../../types/tablero';
import { CommentThread } from './CommentThread';
import { NuevaTarjetaDialog } from './NuevaTarjetaDialog';

const ICON_MAP = { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive };

interface TarjetaDetailModalProps {
  item: TableroItem | null;
  open: boolean;
  onClose: () => void;
  currentUser: TableroUser | null;
  comentarios: TableroComentario[];
  onUpdateEstado: (id: number, estado: TableroEstado) => Promise<void>;
  onAddComment: (itemId: number, contenido: string) => Promise<void>;
  onUpdateItem: (id: number, titulo: string, descripcion: string, tipo: TableroTipo) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
}

export function TarjetaDetailModal({
  item, open, onClose, currentUser, comentarios, onUpdateEstado, onAddComment, onUpdateItem, onDeleteItem,
}: TarjetaDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setEditOpen(false);
  }, [item?.id]);

  if (!item) return null;

  const tipoCfg = TIPO_CONFIG[item.tipo];
  const fecha = new Date(item.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleDelete = () => {
    if (confirm('Eliminar "' + item.titulo + '"?')) {
      onDeleteItem(item.id);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + tipoCfg.badge}>
                  {tipoCfg.icon} {tipoCfg.label}
                </span>
                <span className="text-xs text-on-surface-variant">por {item.autor_nombre} &middot; {fecha}</span>
              </div>
              {currentUser && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <DialogTitle>{item.titulo}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-4">
            {item.descripcion && (
              <p className="text-sm text-on-surface/80 whitespace-pre-wrap">{item.descripcion}</p>
            )}

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-2 block font-headline uppercase tracking-wider">Estado</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ESTADO_COLUMNS.map((col) => {
                  const active = item.estado === col.estado;
                  const canMove = currentUser && !active;
                  const Icon = ICON_MAP[col.icon as keyof typeof ICON_MAP];
                  let btnClass = col.color + ' border-outline-variant/20 text-on-surface-variant/40 cursor-default';
                  if (active) {
                    btnClass = 'bg-primary/10 border-primary text-on-surface';
                  } else if (canMove) {
                    btnClass = col.color + ' border-outline-variant/20 text-on-surface-variant hover:border-on-surface/30 hover:text-on-surface cursor-pointer';
                  }
                  return (
                    <button
                      key={col.estado}
                      onClick={() => canMove && onUpdateEstado(item.id, col.estado)}
                      disabled={!canMove}
                      className={'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-bold font-headline transition-all border ' + btnClass}
                    >
                      <Icon className={'w-4 h-4 ' + (active ? 'text-primary' : '')} />
                      <span className="leading-tight text-center">{col.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-outline-variant/20" />

            <CommentThread
              comentarios={comentarios}
              currentUser={currentUser}
              onAddComment={async (contenido) => {
                await onAddComment(item.id, contenido);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {item && (
        <NuevaTarjetaDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          currentUser={currentUser}
          editItem={item}
          onSaveEdit={onUpdateItem}
          dialogTitle="Editar tarjeta"
        />
      )}
    </>
  );
}
