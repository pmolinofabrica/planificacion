import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, ArrowLeft } from 'lucide-react';
import { useTablero } from '../hooks/useTablero';
import { UserSelector } from '../components/tablero/UserSelector';
import { TableroBoard } from '../components/tablero/TableroBoard';
import { NuevaTarjetaDialog } from '../components/tablero/NuevaTarjetaDialog';
import { STORAGE_USER_KEY } from '../types/tablero';
import type { TableroUser, TableroTipo } from '../types/tablero';

export default function TableroPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<TableroUser | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filterTipo, setFilterTipo] = useState<TableroTipo | 'todas'>('todas');

  const {
    items, comentarios, loading, crearItem, updateEstado, agregarComentario, updateItem, deleteItem, getComentariosByItem, refresh,
  } = useTablero('planificacion');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY) as TableroUser | null;
    if (saved && (['Pablo', 'Vane', 'Celi', 'Euge', 'Eli'] as const).includes(saved as any)) {
      setCurrentUser(saved);
    }
  }, []);

  const filteredItems = filterTipo === 'todas'
    ? items
    : items.filter(i => i.tipo === filterTipo);

  const handleCrearTarjeta = async (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => {
    const { error } = await crearItem(titulo, descripcion, tipo, autor);
    if (error) alert(`Error al crear: ${error}`);
  };

  const handleUpdateItem = async (id: number, titulo: string, descripcion: string, tipo: TableroTipo) => {
    const { error } = await updateItem(id, { titulo, descripcion, tipo });
    if (error) alert(`Error al editar: ${error}`);
  };

  const handleDeleteItem = async (id: number) => {
    const { error } = await deleteItem(id);
    if (error) alert(`Error al eliminar: ${error}`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col">
      <header className="bg-surface-container-low border-b border-outline-variant/20 px-4 sm:px-6 py-3 flex flex-col gap-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary rounded-lg p-1.5 sm:p-2 text-on-primary shadow-sm">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-on-surface font-headline">Tablero</h1>
                <p className="text-[10px] text-on-surface-variant font-medium -mt-0.5">
                  {items.length} {items.length === 1 ? 'tarjeta' : 'tarjetas'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserSelector currentUser={currentUser} onSelect={setCurrentUser} />
            <button
              onClick={() => setShowNewDialog(true)}
              disabled={!currentUser}
              className="p-1.5 sm:p-2 rounded-lg border transition-all bg-primary text-on-primary border-primary shadow-sm hover:shadow-md disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              title="Nueva tarjeta"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pb-0.5">
          <button
            onClick={() => setFilterTipo('todas')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold font-headline transition-all border uppercase tracking-wider ${
              filterTipo === 'todas'
                ? 'bg-primary text-on-primary border-primary shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            Todas
          </button>
          {(['fallo', 'mensaje', 'propuesta'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-headline transition-all border uppercase tracking-wider ${
                filterTipo === t
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              {t === 'fallo' ? '🐛 Fallos' : t === 'mensaje' ? '💬 Mensajes' : '💡 Propuestas'}
            </button>
          ))}
          <button
            onClick={refresh}
            className="ml-auto px-2.5 py-1 rounded-md text-[10px] font-bold font-headline border border-outline-variant/20 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all uppercase tracking-wider"
          >
            🔄 Refrescar
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TableroBoard
            items={filteredItems}
            comentarios={comentarios}
            currentUser={currentUser}
            onUpdateEstado={async (id, estado) => { await updateEstado(id, estado); }}
            onAddComment={async (itemId, contenido) => {
              if (!currentUser) return;
              await agregarComentario(itemId, currentUser, contenido);
            }}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            getComentariosByItem={getComentariosByItem}
          />
        )}
      </div>

      {!currentUser && !loading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-lg pointer-events-auto max-w-sm text-center mx-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-on-surface mb-1 font-headline">Seleccioná tu usuario</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Elegí quién sos en el selector de arriba para empezar a usar el tablero.
            </p>
          </div>
        </div>
      )}

      <NuevaTarjetaDialog
        key={currentUser}
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        currentUser={currentUser}
        onSubmit={handleCrearTarjeta}
      />
    </div>
  );
}
