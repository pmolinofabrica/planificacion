import { supabase } from '../lib/supabase';
import type { BatchError, BatchResult } from '../types/table';
import { chunkArray } from './diff';

/**
 * Execute batch inserts with per-row error control.
 * Inserts in chunks of 100. Partial failures do NOT stop the rest.
 */
export async function batchInsert<T extends object>(
  table: string,
  rows: T[]
): Promise<BatchResult<T>> {
  const successes: T[] = [];
  const failures: BatchError[] = [];
  const chunks = chunkArray(rows, 100);

  for (const chunk of chunks) {
    // Try inserting the whole chunk first
    const { data, error } = await supabase
      .from(table)
      .insert(chunk)
      .select();

    if (!error) {
      successes.push(...(data as T[]));
    } else {
      // Chunk failed — retry row by row to identify which ones actually failed
      for (let i = 0; i < chunk.length; i++) {
        const { data: singleData, error: singleErr } = await supabase
          .from(table)
          .insert(chunk[i])
          .select()
          .single();

        if (singleErr) {
          failures.push({ index: i, row: chunk[i], error: singleErr.message });
        } else if (singleData) {
          successes.push(singleData as T);
        }
      }
    }
  }

  return { successes, failures };
}

/**
 * Execute batch updates with per-row error control.
 * Order: updates AFTER inserts (per execution order rule).
 */
export async function batchUpdate<T extends object>(
  table: string,
  pkField: string,
  updates: { id: unknown; changes: Partial<T> }[]
): Promise<BatchResult<{ id: unknown }>> {
  const successes: { id: unknown }[] = [];
  const failures: BatchError[] = [];

  for (let i = 0; i < updates.length; i++) {
    const { id, changes } = updates[i];
    const { error } = await supabase
      .from(table)
      .update(changes)
      .eq(pkField, id);

    if (error) {
      failures.push({ index: i, row: updates[i], error: error.message });
    } else {
      successes.push({ id });
    }
  }

  return { successes, failures };
}

/**
 * Execute batch deletes.
 * Order: deletes LAST (after inserts and updates).
 */
export async function batchDelete(
  table: string,
  pkField: string,
  ids: unknown[]
): Promise<BatchResult<unknown>> {
  const successes: unknown[] = [];
  const failures: BatchError[] = [];

  // Supabase supports "in" filter for batch delete
  const { error } = await supabase
    .from(table)
    .delete()
    .in(pkField, ids);

  if (error) {
    // If the entire batch fails, try individually
    for (let i = 0; i < ids.length; i++) {
      const { error: singleErr } = await supabase
        .from(table)
        .delete()
        .eq(pkField, ids[i]);

      if (singleErr) {
        failures.push({ index: i, row: ids[i], error: singleErr.message });
      } else {
        successes.push(ids[i]);
      }
    }
  } else {
    successes.push(...ids);
  }

  return { successes, failures };
}
