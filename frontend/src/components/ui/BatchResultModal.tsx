import type { BatchError } from '../../types/table';

interface BatchResultModalProps {
  successCount: number;
  failures: BatchError[];
  onRetry: (failures: BatchError[]) => void;
  onClose: () => void;
}

export default function BatchResultModal({
  successCount,
  failures,
  onRetry,
  onClose,
}: BatchResultModalProps) {
  const hasFailures = failures.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Resultado del guardado</h2>

        {successCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded px-3 py-2 mb-3 text-sm text-green-800">
            ✅ {successCount} registros guardados correctamente.
          </div>
        )}

        {hasFailures && (
          <>
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 text-sm text-red-800">
              ❌ {failures.length} registro{failures.length > 1 ? 's' : ''} con error.
            </div>
            <div className="space-y-2 mb-4">
              {failures.map((f, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">Fila {f.index + 1}:</p>
                  <p className="text-red-600">{f.error}</p>
                  <pre className="text-gray-500 mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(f.row, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 justify-end">
          {hasFailures && (
            <button
              onClick={() => onRetry(failures)}
              className="px-4 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Reintentar fallidos
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
