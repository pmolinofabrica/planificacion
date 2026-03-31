import type { TrackedRow, DiffResult } from '../types/table';

/**
 * Computes diff between original loaded data and current in-memory state.
 * Returns inserts, updates, and deletes to be confirmed by the user.
 */
export function computeDiff<T extends object>(
  rows: TrackedRow<T>[],
  pkField: keyof T
): DiffResult<T> {
  const inserts: T[] = [];
  const updates: { id: unknown; changes: Partial<T> }[] = [];
  const deletes: unknown[] = [];

  for (const row of rows) {
    if (row._status === 'new') {
      inserts.push(row.data);
    } else if (row._status === 'deleted' && row._original) {
      deletes.push(row._original[pkField]);
    } else if (row._status === 'modified' && row._original) {
      const changes: Partial<T> = {};
      for (const key in row.data) {
        if (row.data[key] !== row._original[key]) {
          changes[key as keyof T] = row.data[key];
        }
      }
      if (Object.keys(changes).length > 0) {
        updates.push({ id: row._original[pkField], changes });
      }
    }
  }

  return { inserts, updates, deletes };
}

/**
 * Chunk array into batches of given size (default 100 as per Regla de Oro #Plan Free)
 */
export function chunkArray<T>(arr: T[], size: number = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
