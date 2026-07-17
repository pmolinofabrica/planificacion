import { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive } from 'lucide-react';
import type { TableroItem, TableroEstado } from '../../types/tablero';
import { ESTADO_COLUMNS } from '../../types/tablero';
import { TableroCard } from './TableroCard';

const ICON_MAP = { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive };

interface TableroColumnProps {
  estado: TableroEstado;
  label: string;
  items: TableroItem[];
  onCardClick: (item: TableroItem) => void;
}

export function TableroColumn({ estado, label, items, onCardClick }: TableroColumnProps) {
  const col = ESTADO_COLUMNS.find(c => c.estado === estado)!;
  const Icon = ICON_MAP[col.icon as keyof typeof ICON_MAP];

  return (
    <div className="flex flex-col min-w-[220px] max-w-[280px] flex-1">
      <div className={`flex items-center justify-between gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg ${col.headerBg}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3.5 h-3.5 text-on-surface/60 shrink-0" />
          <span className="text-[11px] font-bold text-on-surface/70 uppercase tracking-wider font-headline truncate">
            {col.shortLabel}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-on-surface/50 bg-surface/50 px-1.5 py-0.5 rounded-full shrink-0">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 no-scrollbar">
        {items.map((item) => (
          <TableroCard key={item.id} item={item} onClick={onCardClick} />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-16 border-2 border-dashed border-outline-variant/20 rounded-lg">
            <span className="text-[10px] text-on-surface-variant/50">Vacío</span>
          </div>
        )}
      </div>
    </div>
  );
}
