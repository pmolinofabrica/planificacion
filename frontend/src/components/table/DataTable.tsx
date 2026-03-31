import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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

        // Ensure proper boolean coercing even if originalValue is undefined/null initially
        // but we know it's meant to be boolean because rawValue is strictly 'true' or 'false' from checkbox
        if (rawValue === 'true') {
           typedValue = true;
        } else if (rawValue === 'false') {
           typedValue = false;
        } else if (typeof originalValue === 'number') {
           typedValue = rawValue === '' ? null : Number(rawValue);
        } else if (typeof originalValue === 'boolean') {
           typedValue = rawValue === 'true';
        } else if (originalValue === null && rawValue === '') {
           typedValue = null;
        }

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
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={addRow}
          className="bg-gradient-to-br from-primary to-primary-container text-white px-4 py-1.5 rounded-lg text-xs font-bold font-headline shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          + NUEVA FILA
        </button>
        {enableClone && (
          <div className="flex gap-2">
            <button onClick={() => addMultipleRows(18)} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold hover:bg-primary/20 transition-all">+18</button>
            <button onClick={() => addMultipleRows(36)} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold hover:bg-primary/20 transition-all">+36</button>
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
              className="px-3 py-1.5 text-xs font-bold font-headline uppercase tracking-wide bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
            >
              Eliminar {selectedIds.size}
            </button>
          </div>
        )}
        {hasPendingChanges && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="ml-auto px-5 py-1.5 text-xs font-bold font-headline uppercase tracking-wide bg-tertiary text-on-tertiary rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
          >
            {saving ? 'Guardando...' : `Guardar Cambios (${diff.inserts.length + diff.updates.length + diff.deletes.length})`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
        <table className="min-w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="py-2.5 px-4 font-headline uppercase text-on-surface-variant tracking-wider border-none text-xs font-semibold align-top"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {!header.isPlaceholder && (
                      <div className="flex flex-col gap-2">
                        <div
                          className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-primary' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        {header.column.getCanFilter() && !['select', '_status', '_actions'].includes(header.id) ? (
                          <input
                            type="text"
                            value={(header.column.getFilterValue() ?? '') as string}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            className="w-full px-2 py-1 text-[10px] font-body normal-case tracking-normal text-slate-700 bg-surface border border-outline-variant/30 rounded focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Filtrar..."
                          />
                        ) : null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-outline-variant/5 text-on-surface">
            {table.getRowModel().rows.map((row) => {
              const status = row.original._status;
              return (
                <tr
                  key={row.id}
                  className={
                    status === 'new'
                      ? 'bg-emerald-500/10'
                      : status === 'modified'
                      ? 'bg-yellow-500/10'
                      : status === 'deleted'
                      ? 'bg-error/10 opacity-50'
                      : 'row-hover transition-colors'
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 border-none">
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
    accessorFn: (row) => {
      // For select columns, return the label instead of value for proper filtering/sorting
      if (type === 'select' && options) {
        const value = row.data[field];
        const match = options.find(o => String(o.value) === String(value));
        return match ? match.label : value;
      }
      return row.data[field];
    },
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
