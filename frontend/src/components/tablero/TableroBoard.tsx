import { useState } from 'react';
import { ESTADO_COLUMNS } from '../../types/tablero';
import type { TableroItem, TableroUser, TableroEstado, TableroComentario, TableroTipo } from '../../types/tablero';
import { TableroColumn } from './TableroColumn';
import { TarjetaDetailModal } from './TarjetaDetailModal';

interface TableroBoardProps {
  items: TableroItem[];
  comentarios: TableroComentario[];
  currentUser: TableroUser | null;
  onUpdateEstado: (id: number, estado: TableroEstado) => Promise<void>;
  onAddComment: (itemId: number, contenido: string) => Promise<void>;
  onUpdateItem: (id: number, titulo: string, descripcion: string, tipo: TableroTipo) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  getComentariosByItem: (itemId: number) => TableroComentario[];
}

export function TableroBoard({
  items, comentarios, currentUser, onUpdateEstado, onAddComment, onUpdateItem, onDeleteItem, getComentariosByItem,
}: TableroBoardProps) {
  const [selectedItem, setSelectedItem] = useState<TableroItem | null>(null);

  const itemsByEstado = ESTADO_COLUMNS.reduce((acc, col) => {
    acc[col.estado] = items.filter(i => i.estado === col.estado);
    return acc;
  }, {} as Record<string, TableroItem[]>);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 px-1 no-scrollbar">
        {ESTADO_COLUMNS.map((col) => (
          <TableroColumn
            key={col.estado}
            estado={col.estado}
            label={col.label}
            items={itemsByEstado[col.estado] || []}
            onCardClick={setSelectedItem}
          />
        ))}
      </div>

      <TarjetaDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        currentUser={currentUser}
        comentarios={selectedItem ? getComentariosByItem(selectedItem.id) : []}
        onUpdateEstado={onUpdateEstado}
        onAddComment={onAddComment}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
      />
    </>
  );
}
