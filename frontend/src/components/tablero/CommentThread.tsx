import { useState } from 'react';
import type { TableroComentario, TableroUser } from '../../types/tablero';

interface CommentThreadProps {
  comentarios: TableroComentario[];
  currentUser: TableroUser | null;
  onAddComment: (contenido: string) => Promise<void>;
}

export function CommentThread({ comentarios, currentUser, onAddComment }: CommentThreadProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !currentUser || sending) return;
    setSending(true);
    try {
      await onAddComment(text.trim());
      setText('');
    } catch {
      // deja el texto para que el usuario reintente
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-bold text-on-surface font-headline">Comentarios</h4>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
        {comentarios.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-4">
            Sin comentarios aún
          </p>
        )}
        {comentarios.map((c) => (
          <div key={c.id} className="bg-surface-variant/50 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-on-surface">
                {c.autor_nombre}
              </span>
              <span className="text-[10px] text-on-surface-variant">
                {new Date(c.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-xs text-on-surface/80 whitespace-pre-wrap">{c.contenido}</p>
          </div>
        ))}
      </div>

      {currentUser && (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Escribí un comentario..."
            className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold font-headline hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? '...' : '→'}
          </button>
        </div>
      )}
    </div>
  );
}
