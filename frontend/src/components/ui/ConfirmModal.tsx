interface ConfirmModalProps {
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function ConfirmModal({
  insertCount,
  updateCount,
  deleteCount,
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  const total = insertCount + updateCount + deleteCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Confirmar cambios</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Se van a enviar <strong>{total} operaciones</strong> a la base de datos:
        </p>
        <div className="space-y-2 mb-6">
          {insertCount > 0 && (
            <div className="flex items-center gap-3 bg-green-50 px-3 py-2 rounded">
              <span className="text-green-600 font-bold text-lg">+{insertCount}</span>
              <span className="text-green-800 text-sm">registros nuevos a crear</span>
            </div>
          )}
          {updateCount > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 px-3 py-2 rounded">
              <span className="text-yellow-600 font-bold text-lg">~{updateCount}</span>
              <span className="text-yellow-800 text-sm">registros a actualizar</span>
            </div>
          )}
          {deleteCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 px-3 py-2 rounded">
              <span className="text-red-600 font-bold text-lg">-{deleteCount}</span>
              <span className="text-red-800 text-sm">registros a eliminar</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
