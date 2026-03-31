import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TrackedRow, BatchError } from '../../types/table';
import { computeDiff } from '../../utils/diff';
import { batchInsert, batchUpdate, batchDelete } from '../../utils/batch';
import EditableCell from './EditableCell';
import ConfirmModal from '../ui/ConfirmModal';
import BatchResultModal from '../ui/BatchResultModal';

interface DataTableProps<T extends object> {
  tableName: string;
  pkField: keyof T;
  initialData: T[];
  columns: ColumnDef<TrackedRow<T>>[];
  onRefresh: () => void;
  buildNewRow: () => T;
  onBatchInsert?: (inserts: T[]) => Promise<{ successes: T[]; failures: BatchError[] }>;
  enableClone?: boolean;
  /** Pre-built rows to inject (e.g. Grupo A/B bulk), consumed once */
  bulkRows?: T[];
  onBulkRowsConsumed?: () => void;
  /** Extra JSX to render in the toolbar after the standard buttons */
  extraToolbar?: React.ReactNode;
  /** Custom buttons that appear when rows are selected */
  customMassActions?: Array<{
    label: React.ReactNode;
    onClick: (selectedData: T[]) => void | Promise<void>;
    className?: string; // extra tailwind classes like bg-green-600
  }>;
}

export default function DataTable<T extends object>(props: DataTableProps<T>) {
  const { tableName, pkField, initialData, columns, onRefresh, buildNewRow, enableClone,
          bulkRows, onBulkRowsConsumed, extraToolbar, customMassActions } = props;
  const [rows, setRows] = useState<TrackedRow<T>[]>(() =>
    initialData.map((d) => ({
      _id: String(d[pkField]) ?? uuidv4(),
      _status: 'original',
      _original: d,
      data: { ...d },
    }))
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchResult, setBatchResult] = useState<{ successes: number; failures: BatchError[] } | null>(null);

  const visibleRows = useMemo(() => rows.filter((r) => r._status !== 'deleted'), [rows]);

  // Consume bulkRows from parent when they arrive
  const prevBulkRef = useRef<T[] | undefined>(undefined);
  useEffect(() => {
    if (bulkRows && bulkRows.length > 0 && bulkRows !== prevBulkRef.current) {
      prevBulkRef.current = bulkRows;
      const newRows = bulkRows.map(d => ({
        _id: uuidv4(),
        _status: 'new' as const,
        _original: null,
        data: { ...d },
      }));
      setRows(prev => [...newRows, ...prev]);
      onBulkRowsConsumed?.();
    }
  }, [bulkRows, onBulkRowsConsumed]);

  const updateCell = useCallback((rowId: string, field: keyof T, rawValue: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row._id !== rowId) return row;
        const originalValue = row._original ? row._original[field] : undefined;
        let typedValue: unknown = rawValue;

        // Coerce to original type
        if (typeof originalValue === 'number') typedValue = rawValue === '' ? null : Number(rawValue);
        if (typeof originalValue === 'boolean') typedValue = rawValue === 'true';
        if (originalValue === null && rawValue === '') typedValue = null;

        const updatedData = { ...row.data, [field]: typedValue };
        const isModified = row._status === 'new'
          ? true
          : JSON.stringify(updatedData) !== JSON.stringify(row._original);

        return {
          ...row,
          data: updatedData,
          _status: row._status === 'new' ? 'new' : isModified ? 'modified' : 'original',
        };
      })
    );
  }, []);

  const addRow = () => {
    const newRow: TrackedRow<T> = {
      _id: uuidv4(),
      _status: 'new',
      _original: null,
      data: buildNewRow(),
    };
    setRows((prev) => [newRow, ...prev]);
  };

  const cloneRow = (originalData: T) => {
    const newRow: TrackedRow<T> = {
      _id: uuidv4(),
      _status: 'new',
      _original: null,
      data: { ...originalData },
    };
    // Ensure PK is reset
    if (typeof (newRow.data as any)[pkField] === 'number') {
      (newRow.data as any)[pkField] = 0;
    }
    setRows((prev) => [newRow, ...prev]);
  };

  const addMultipleRows = (count: number) => {
    const newRows = Array.from({ length: count }).map(() => ({
      _id: uuidv4(),
      _status: 'new' as const,
      _original: null,
      data: buildNewRow(),
    }));
    setRows((prev) => [...newRows, ...prev]);
  };

  const markDeleted = () => {
    setRows((prev) =>
      prev.map((row) =>
        selectedIds.has(row._id)
          ? row._status === 'new'
            ? { ...row, _status: 'deleted' }
            : { ...row, _status: 'deleted' }
          : row
      )
    );
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const diff = useMemo(() => computeDiff(rows, pkField), [rows, pkField]);
  const hasPendingChanges = diff.inserts.length > 0 || diff.updates.length > 0 || diff.deletes.length > 0;

  const handleSave = async () => {
    setSaving(true);
    setShowConfirm(false);
    let totalFailures: BatchError[] = [];
    let totalSuccesses = 0;

    // Order: Inserts → Updates → Deletes (Regla de Oro)
    if (diff.inserts.length > 0) {
      const result = props.onBatchInsert 
        ? await props.onBatchInsert(diff.inserts)
        : await batchInsert(tableName, diff.inserts);
      totalSuccesses += result.successes.length;
      totalFailures = [...totalFailures, ...result.failures];
    }

    if (diff.updates.length > 0) {
      const result = await batchUpdate(tableName, String(pkField), diff.updates);
      totalSuccesses += result.successes.length;
      totalFailures = [...totalFailures, ...result.failures];
    }

    if (diff.deletes.length > 0) {
      const result = await batchDelete(tableName, String(pkField), diff.deletes);
      totalSuccesses += result.successes.length;
      totalFailures = [...totalFailures, ...result.failures];
    }

    setSaving(false);
    setBatchResult({ successes: totalSuccesses, failures: totalFailures });

    if (totalFailures.length === 0) {
      onRefresh();
    }
  };

  const handleRetry = async (_failures: BatchError[]) => {
    // Future: retry just the failed rows
    setBatchResult(null);
    onRefresh();
  };

  const tableColumns: ColumnDef<TrackedRow<T>>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original._id)}
          onChange={() => toggleSelect(row.original._id)}
          className="cursor-pointer"
        />
      ),
      size: 40,
    },
    {
      id: '_status',
      header: '',
      cell: ({ row }) => {
        const status = row.original._status;
        if (status === 'new') return <span className="text-xs text-green-600 font-semibold">NEW</span>;
        if (status === 'modified') return <span className="text-xs text-yellow-600 font-semibold">MOD</span>;
        if (status === 'deleted') return <span className="text-xs text-red-600 font-semibold">DEL</span>;
        return null;
      },
      size: 48,
    },
    {
      id: '_actions',
      header: '',
      cell: ({ row }) => enableClone && (
        <button
          onClick={() => cloneRow(row.original.data)}
          className="text-blue-500 hover:text-blue-700 bg-blue-50 px-1 rounded font-bold text-xs border border-blue-200"
          title="Duplicar esta fila"
        >
          📑
        </button>
      ),
      size: 30,
    },
    ...columns,
  ], [columns, selectedIds, enableClone]);

  const table = useReactTable({
    data: visibleRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    meta: { updateCell },
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={addRow}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          + Nuevo
        </button>
        {enableClone && (
          <div className="flex">
            <button onClick={() => addMultipleRows(18)} className="px-2 py-1.5 text-sm bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 rounded-l border-r-0">+18</button>
            <button onClick={() => addMultipleRows(36)} className="px-2 py-1.5 text-sm bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 rounded-r border-l-0">+36</button>
          </div>
        )}
        {extraToolbar}
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            {customMassActions?.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const selectedData = visibleRows.filter(r => selectedIds.has(r._id)).map(r => r.data);
                  action.onClick(selectedData);
                }}
                className={`px-3 py-1.5 text-sm rounded transition-colors text-white ${action.className || 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={markDeleted}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Eliminar seleccionados ({selectedIds.size})
            </button>
          </div>
        )}
        {hasPendingChanges && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="ml-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
          >
            {saving ? 'Guardando...' : `Guardar cambios (${diff.inserts.length + diff.updates.length + diff.deletes.length})`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => {
              const status = row.original._status;
              return (
                <tr
                  key={row.id}
                  className={
                    status === 'new'
                      ? 'bg-green-50'
                      : status === 'modified'
                      ? 'bg-yellow-50'
                      : status === 'deleted'
                      ? 'bg-red-50 opacity-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-1.5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={tableColumns.length} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-3 mt-2 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Página <strong>{table.getState().pagination.pageIndex + 1}</strong> de{' '}
            <strong>{table.getPageCount()}</strong>
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 bg-white"
          >
            {[50, 100, 250, 500].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Mostrar {pageSize}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            Siguiente
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {visibleRows.length} registros totales · {diff.inserts.length} nuevos · {diff.updates.length} modificados · {diff.deletes.length} a eliminar
      </p>

      {/* Modals */}
      {showConfirm && (
        <ConfirmModal
          insertCount={diff.inserts.length}
          updateCount={diff.updates.length}
          deleteCount={diff.deletes.length}
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
          loading={saving}
        />
      )}

      {batchResult && (
        <BatchResultModal
          successCount={batchResult.successes}
          failures={batchResult.failures}
          onRetry={handleRetry}
          onClose={() => {
            setBatchResult(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Helper to create a column definition with EditableCell
export function editableColumn<T extends object>(
  field: keyof T,
  header: string,
  type: 'text' | 'number' | 'boolean' | 'time' | 'date' | 'select' = 'text',
  options?: { value: string | number; label: string }[]
): ColumnDef<TrackedRow<T>> {
  return {
    id: String(field),
    header,
    cell: ({ row, table }) => (
      <EditableCell
        value={row.original.data[field] as string | number | boolean | null}
        onSave={(val) => {
          const meta = table.options.meta as { updateCell: (id: string, field: keyof T, val: string) => void };
          meta.updateCell(row.original._id, field, val);
        }}
        type={type}
        options={options}
      />
    ),
  };
}
