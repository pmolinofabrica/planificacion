export const TABLERO_USERS = ['Pablo', 'Vane', 'Celi', 'Euge', 'Eli'] as const;
export type TableroUser = typeof TABLERO_USERS[number];

export type TableroTipo = 'fallo' | 'mensaje' | 'propuesta';
export type TableroEstado = 'pendiente' | 'en_progreso' | 'feedback' | 'resuelto' | 'cerrado';

/** Apps que comparten el tablero */
export const TABLERO_APPS = ['asignaciones', 'planificacion', 'visit'] as const;
export type TableroApp = typeof TABLERO_APPS[number];

export interface TableroItem {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: TableroTipo;
  estado: TableroEstado;
  autor_nombre: TableroUser;
  app: TableroApp;
  created_at: string;
  updated_at: string;
}

export interface TableroComentario {
  id: number;
  item_id: number;
  autor_nombre: TableroUser;
  contenido: string;
  created_at: string;
}

export const TIPO_CONFIG: Record<TableroTipo, { label: string; badge: string; border: string; icon: string }> = {
  fallo: {
    label: 'Fallo',
    badge: 'bg-error-container text-on-error-container',
    border: 'border-l-4 border-error',
    icon: '🐛',
  },
  mensaje: {
    label: 'Mensaje',
    badge: 'bg-primary-container text-on-primary-container',
    border: 'border-l-4 border-primary',
    icon: '💬',
  },
  propuesta: {
    label: 'Propuesta',
    badge: 'bg-secondary-container text-on-secondary-container',
    border: 'border-l-4 border-secondary',
    icon: '💡',
  },
};

export const ESTADO_LABELS: Record<TableroEstado, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  feedback: 'Feedback',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const ESTADO_SHORT: Record<TableroEstado, string> = {
  pendiente: 'Pend.',
  en_progreso: 'Progreso',
  feedback: 'Feedback',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const ESTADO_COLUMNS: { estado: TableroEstado; label: string; shortLabel: string; color: string; icon: string; headerBg: string }[] = [
  { estado: 'pendiente', label: 'Pendiente', shortLabel: 'Pend.', color: 'bg-surface-container', icon: 'Inbox', headerBg: 'bg-surface-container-high' },
  { estado: 'en_progreso', label: 'En Progreso', shortLabel: 'Progreso', color: 'bg-primary/5', icon: 'PlayCircle', headerBg: 'bg-primary/10' },
  { estado: 'feedback', label: 'Feedback', shortLabel: 'Feedback', color: 'bg-tertiary/5', icon: 'MessageCircle', headerBg: 'bg-tertiary/10' },
  { estado: 'resuelto', label: 'Resuelto', shortLabel: 'Resuelto', color: 'bg-surface-container', icon: 'CheckCircle2', headerBg: 'bg-surface-container-high' },
  { estado: 'cerrado', label: 'Cerrado', shortLabel: 'Cerrado', color: 'bg-surface-dim', icon: 'Archive', headerBg: 'bg-surface-container-low' },
];

export const STORAGE_USER_KEY = 'tablero_user';
