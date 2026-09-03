import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  CambioTransaccion,
  CambioTransaccionDetalle,
  CambioValidacion,
  CambioListado,
  ConvocatoriaHistorial,
  CambioTransaccionEstado,
  BorradorEstado,
} from '../types/cambios';

// ============================================================
// QUERIES
// ============================================================

export function useCambiosPendientes() {
  return useQuery({
    queryKey: ['cambios-pendientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vista_cambios_listado' as any)
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('fecha_solicitud', { ascending: false });
      if (error) throw error;
      return (data || []) as CambioListado[];
    },
  });
}

export function useCambiosHistorial() {
  return useQuery({
    queryKey: ['cambios-historial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vista_cambios_listado' as any)
        .select('*')
        .order('fecha_solicitud', { ascending: false });
      if (error) throw error;
      return (data || []) as CambioListado[];
    },
  });
}

export function useTransaccion(id: number | null) {
  return useQuery({
    queryKey: ['cambio-transaccion', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('cambio_transaccion' as any)
        .select('*')
        .eq('id_transaccion', id)
        .single();
      if (error) throw error;
      return data as unknown as CambioTransaccion;
    },
    enabled: !!id,
  });
}

export function useDetalleTransaccion(idTransaccion: number | null) {
  return useQuery({
    queryKey: ['cambio-detalle', idTransaccion],
    queryFn: async () => {
      if (!idTransaccion) return [];
      const { data, error } = await supabase
        .from('cambio_transaccion_detalle' as any)
        .select('*')
        .eq('id_transaccion', idTransaccion)
        .order('secuencia');
      if (error) throw error;
      return (data || []) as unknown as CambioTransaccionDetalle[];
    },
    enabled: !!idTransaccion,
  });
}

export function useValidacionesTransaccion(idTransaccion: number | null) {
  return useQuery({
    queryKey: ['cambio-validaciones', idTransaccion],
    queryFn: async () => {
      if (!idTransaccion) return [];
      const { data, error } = await supabase
        .from('cambio_validacion' as any)
        .select('*')
        .eq('id_transaccion', idTransaccion)
        .order('fecha_validacion');
      if (error) throw error;
      return (data || []) as unknown as CambioValidacion[];
    },
    enabled: !!idTransaccion,
  });
}

export function useHistorialCambio(idTransaccion: number | null) {
  return useQuery({
    queryKey: ['cambio-historial-conv', idTransaccion],
    queryFn: async () => {
      if (!idTransaccion) return [];
      const { data, error } = await supabase
        .from('vista_historial_convocatoria' as any)
        .select('*')
        .eq('id_transaccion_cambio', idTransaccion)
        .order('fecha_cambio', { ascending: false });
      if (error) throw error;
      return (data || []) as ConvocatoriaHistorial[];
    },
    enabled: !!idTransaccion,
  });
}

export function useBorradoresEstado() {
  return useQuery({
    queryKey: ['borradores-estado'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vista_borradores_estado' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as BorradorEstado[];
    },
  });
}

// ============================================================
// MUTATIONS
// ============================================================

interface SolicitudCambio {
  agente_iniciador: number;
  observaciones?: string;
  detalles: Omit<CambioTransaccionDetalle, 'id_detalle' | 'id_transaccion' | 'secuencia' | 'validacion_conflicto' | 'mensaje_validacion'>[];
}

export function useCrearSolicitudCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (solicitud: SolicitudCambio) => {
      const { data: cabecera, error: errCab } = await supabase
        .from('cambio_transaccion' as any)
        .insert({
          agente_iniciador: solicitud.agente_iniciador,
          tipo_transaccion: 'cambio_turno',
          estado: 'PENDIENTE',
          observaciones: solicitud.observaciones || null,
        } as any)
        .select()
        .single();
      if (errCab) throw errCab;

      const detallesConTransaccion = solicitud.detalles.map((d, i) => ({
        ...d,
        id_transaccion: cabecera.id_transaccion,
        secuencia: i + 1,
      }));

      const { error: errDet } = await supabase
        .from('cambio_transaccion_detalle' as any)
        .insert(detallesConTransaccion as any);
      if (errDet) throw errDet;

      return cabecera as unknown as CambioTransaccion;
    },
    onSuccess: async (data: CambioTransaccion) => {
      qc.invalidateQueries({ queryKey: ['cambios-pendientes'] });
      qc.invalidateQueries({ queryKey: ['cambio-transaccion', data.id_transaccion] });
    },
  });
}

export function useAceptarCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id_transaccion: number; usuario?: string }) => {
      const { error } = await supabase.rpc('fn_aceptar_cambio' as any, {
        p_id_transaccion: params.id_transaccion,
        p_usuario: params.usuario || null,
      });
      if (error) throw error;
      return params.id_transaccion;
    },
    onSuccess: (id: number) => {
      qc.invalidateQueries({ queryKey: ['cambios-pendientes'] });
      qc.invalidateQueries({ queryKey: ['cambios-historial'] });
      qc.invalidateQueries({ queryKey: ['cambio-transaccion', id] });
    },
  });
}

export function useCancelarCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id_transaccion: number; motivo?: string; usuario?: string }) => {
      const { error } = await supabase.rpc('fn_cancelar_solicitud_cambio' as any, {
        p_id_transaccion: params.id_transaccion,
        p_motivo: params.motivo || null,
        p_usuario: params.usuario || null,
      });
      if (error) throw error;
      return params.id_transaccion;
    },
    onSuccess: (id: number) => {
      qc.invalidateQueries({ queryKey: ['cambios-pendientes'] });
      qc.invalidateQueries({ queryKey: ['cambios-historial'] });
      qc.invalidateQueries({ queryKey: ['cambio-transaccion', id] });
    },
  });
}

export interface EditarSolicitudParams {
  id_transaccion: number;
  observaciones?: string;
  id_convocatoria_original?: number;
  id_convocatoria_nueva?: number;
  id_agente_original?: number;
  id_agente_nuevo?: number;
  id_turno_original?: number;
  id_turno_nuevo?: number;
  fecha_original?: string;
  fecha_nueva?: string;
  usuario?: string;
}

export function useEditarCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: EditarSolicitudParams) => {
      const { error } = await supabase.rpc('fn_editar_solicitud_cambio' as any, {
        p_id_transaccion: params.id_transaccion,
        p_observaciones: params.observaciones ?? null,
        p_id_convocatoria_original: params.id_convocatoria_original ?? null,
        p_id_convocatoria_nueva: params.id_convocatoria_nueva ?? null,
        p_id_agente_original: params.id_agente_original ?? null,
        p_id_agente_nuevo: params.id_agente_nuevo ?? null,
        p_id_turno_original: params.id_turno_original ?? null,
        p_id_turno_nuevo: params.id_turno_nuevo ?? null,
        p_fecha_original: params.fecha_original ?? null,
        p_fecha_nueva: params.fecha_nueva ?? null,
        p_usuario: params.usuario ?? 'sistema',
      });
      if (error) throw error;
      return params.id_transaccion;
    },
    onSuccess: (id: number) => {
      qc.invalidateQueries({ queryKey: ['cambios-pendientes'] });
      qc.invalidateQueries({ queryKey: ['cambios-historial'] });
      qc.invalidateQueries({ queryKey: ['cambio-transaccion', id] });
    },
  });
}

export function useRevertirCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id_transaccion: number; usuario?: string }) => {
      const { error } = await supabase.rpc('fn_revertir_cambio' as any, {
        p_id_transaccion: params.id_transaccion,
        p_usuario: params.usuario || null,
      });
      if (error) throw error;
      return params.id_transaccion;
    },
    onSuccess: (id: number) => {
      qc.invalidateQueries({ queryKey: ['cambios-pendientes'] });
      qc.invalidateQueries({ queryKey: ['cambios-historial'] });
      qc.invalidateQueries({ queryKey: ['cambio-transaccion', id] });
    },
  });
}

export function useToggleBorradorChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      idTransaccion: number;
      tipo: 'pendiente' | 'confirmado';
      activar: boolean;
      usuario?: string;
    }) => {
      if (params.activar) {
        const { error } = await supabase.rpc('fn_registrar_borrador' as any, {
          p_id_transaccion: params.idTransaccion,
          p_tipo_borrador: params.tipo,
          p_usuario: params.usuario || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('fn_eliminar_borrador' as any, {
          p_id_transaccion: params.idTransaccion,
          p_tipo_borrador: params.tipo,
        });
        if (error) throw error;
      }
      return params.idTransaccion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borradores-estado'] });
    },
  });
}

