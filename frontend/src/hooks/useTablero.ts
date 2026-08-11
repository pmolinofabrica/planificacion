import { useState, useEffect, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TableroItem, TableroComentario, TableroEstado, TableroUser, TableroTipo, TableroApp } from '../types/tablero';

type ItemUpdates = { titulo?: string; descripcion?: string; tipo?: TableroTipo };

const sortByUpdated = (list: TableroItem[]) =>
  [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

export function useTablero(app: TableroApp = 'asignaciones') {
  const [items, setItems] = useState<TableroItem[]>([]);
  const [comentarios, setComentarios] = useState<TableroComentario[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('tablero_items')
      .select('*')
      .eq('app', app)
      .order('updated_at', { ascending: false });
    if (data) setItems(data as TableroItem[]);
  }, [app]);

  const loadComentarios = useCallback(async () => {
    const { data } = await supabase
      .from('tablero_comentarios')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setComentarios(data as TableroComentario[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadItems(), loadComentarios()]);
      setLoading(false);
    })();
  }, [loadItems, loadComentarios]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const itemsChannel = supabase
      .channel('tablero_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tablero_items' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const { eventType } = payload;
          const newRow = payload.new as TableroItem | undefined;
          const oldRow = payload.old as TableroItem | undefined;
          if (eventType === 'INSERT' && newRow && newRow.app === app) {
            setItems(prev => (prev.some(i => i.id === newRow.id)
              ? prev
              : sortByUpdated([newRow, ...prev])));
          } else if (eventType === 'UPDATE' && newRow) {
            setItems(prev => sortByUpdated(prev.map(i => (i.id === newRow.id ? { ...i, ...newRow } : i))));
          } else if (eventType === 'DELETE' && oldRow) {
            setItems(prev => prev.filter(i => i.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('tablero_comentarios_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tablero_comentarios' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const { eventType } = payload;
          const newRow = payload.new as TableroComentario | undefined;
          const oldRow = payload.old as TableroComentario | undefined;
          if (eventType === 'INSERT' && newRow) {
            setComentarios(prev => (prev.some(c => c.id === newRow.id)
              ? prev
              : [...prev, newRow]));
          } else if (eventType === 'UPDATE' && newRow) {
            setComentarios(prev => prev.map(c => (c.id === newRow.id ? { ...c, ...newRow } : c)));
          } else if (eventType === 'DELETE' && oldRow) {
            setComentarios(prev => prev.filter(c => c.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [app]);

  const crearItem = async (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => {
    const tempId = -Date.now();
    const now = new Date().toISOString();
    const temp: TableroItem = {
      id: tempId, titulo, descripcion, tipo, estado: 'pendiente', autor_nombre: autor, app,
      created_at: now, updated_at: now,
    };
    setItems(prev => sortByUpdated([temp, ...prev]));

    const { data, error } = await supabase.from('tablero_items').insert({
      titulo, descripcion, tipo, estado: 'pendiente', autor_nombre: autor, app,
    }).select().single();

    if (!error && data) {
      const row = data as TableroItem;
      setItems(prev => {
        const rest = prev.filter(i => i.id !== tempId);
        if (rest.some(i => i.id === row.id)) return rest;
        return sortByUpdated([row, ...rest]);
      });
    } else if (error) {
      setItems(prev => prev.filter(i => i.id !== tempId));
      await loadItems();
    }
    return { error: error?.message || null };
  };

  const updateEstado = async (id: number, estado: TableroEstado) => {
    const now = new Date().toISOString();
    setItems(prev => sortByUpdated(prev.map(i => (i.id === id ? { ...i, estado, updated_at: now } : i))));
    const { error } = await supabase
      .from('tablero_items')
      .update({ estado, updated_at: now })
      .eq('id', id);
    if (error) await loadItems();
    return { error: error?.message || null };
  };

  const agregarComentario = async (itemId: number, autor: TableroUser, contenido: string) => {
    const tempId = -Date.now();
    const temp: TableroComentario = {
      id: tempId, item_id: itemId, autor_nombre: autor, contenido, created_at: new Date().toISOString(),
    };
    setComentarios(prev => [...prev, temp]);

    const { data, error } = await supabase.from('tablero_comentarios').insert({
      item_id: itemId, autor_nombre: autor, contenido,
    }).select().single();

    if (!error && data) {
      const row = data as TableroComentario;
      setComentarios(prev => {
        const rest = prev.filter(c => c.id !== tempId);
        if (rest.some(c => c.id === row.id)) return rest;
        return [...rest, row];
      });
    } else if (error) {
      setComentarios(prev => prev.filter(c => c.id !== tempId));
      await loadComentarios();
    }
    return { error: error?.message || null };
  };

  const updateItem = async (id: number, updates: ItemUpdates) => {
    const now = new Date().toISOString();
    setItems(prev => sortByUpdated(prev.map(i => (i.id === id ? { ...i, ...updates, updated_at: now } : i))));
    const { error } = await supabase
      .from('tablero_items')
      .update({ ...updates, updated_at: now })
      .eq('id', id);
    if (error) await loadItems();
    return { error: error?.message || null };
  };

  const deleteItem = async (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setComentarios(prev => prev.filter(c => c.item_id !== id));
    const { error } = await supabase
      .from('tablero_items')
      .delete()
      .eq('id', id);
    if (error) await loadItems();
    return { error: error?.message || null };
  };

  const getComentariosByItem = (itemId: number) =>
    comentarios.filter(c => c.item_id === itemId);

  const refresh = useCallback(async () => {
    await Promise.all([loadItems(), loadComentarios()]);
  }, [loadItems, loadComentarios]);

  return {
    items,
    comentarios,
    loading,
    crearItem,
    updateEstado,
    agregarComentario,
    updateItem,
    deleteItem,
    getComentariosByItem,
    refresh,
  };
}
