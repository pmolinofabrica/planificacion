import { TABLERO_USERS, STORAGE_USER_KEY } from '../../types/tablero';
import type { TableroUser } from '../../types/tablero';

interface UserSelectorProps {
  currentUser: TableroUser | null;
  onSelect: (user: TableroUser) => void;
}

export function UserSelector({ currentUser, onSelect }: UserSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap font-headline uppercase tracking-wider">
        {currentUser ? 'Conectado:' : '¿Quién eres?'}
      </span>
      <select
        className="bg-surface-container-high border border-outline-variant/20 rounded-md px-2 py-1 text-sm font-bold text-on-surface outline-none hover:bg-surface-container-highest cursor-pointer"
        value={currentUser || ''}
        onChange={(e) => {
          const user = e.target.value as TableroUser;
          if (user) {
            localStorage.setItem(STORAGE_USER_KEY, user);
            onSelect(user);
          }
        }}
      >
        {!currentUser && <option value="">Seleccionar...</option>}
        {TABLERO_USERS.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      {currentUser && (
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_USER_KEY);
            onSelect(null as any);
          }}
          className="text-[10px] font-medium text-on-surface-variant hover:text-error transition-colors ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
