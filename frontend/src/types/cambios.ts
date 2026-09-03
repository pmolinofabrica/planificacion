export type CambioTransaccionEstado =
  | 'PENDIENTE'
  | 'VALIDADO_SUPERVISOR'
  | 'VALIDADO_AGENTE'
  | 'APROBADO'
  | 'EN_EJECUCION'
  | 'EJECUTADO'
  | 'RECHAZADO'
  | 'CANCELADO';

export interface CambioTransaccion {
  id_transaccion: number;
  agente_iniciador: number;
  tipo_transaccion: string;
  estado: CambioTransaccionEstado;
  fecha_solicitud: string | null;
  fecha_validacion: string | null;
  fecha_aprobacion: string | null;
  fecha_ejecucion: string | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
  usuario_aprobador: string | null;
  id_agente_supervisor: number | null;
}

export interface CambioTransaccionDetalle {
  id_detalle: number;
  id_transaccion: number;
  id_convocatoria_original: number;
  id_convocatoria_nueva: number | null;
  id_agente_original: number;
  id_agente_nuevo: number;
  id_turno_original: number;
  id_turno_nuevo: number;
  fecha_original: string;
  fecha_nueva: string;
  secuencia: number;
  validacion_conflicto: boolean | null;
  mensaje_validacion: string | null;
}

export interface CambioValidacion {
  id_validacion: number;
  id_transaccion: number;
  tipo_validacion: string;
  mensaje: string;
  es_alerta: boolean;
  es_bloqueante: boolean;
  estado: string;
  detalle_tecnico: string | null;
  fecha_validacion: string | null;
  fecha_resolucion: string | null;
  usuario_resolucion: string | null;
}

export interface CambioListado {
  id_transaccion: number | null;
  agente_iniciador: number | null;
  tipo_transaccion: string | null;
  estado: string | null;
  fecha_solicitud: string | null;
  fecha_validacion: string | null;
  fecha_aprobacion: string | null;
  fecha_ejecucion: string | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
  id_detalle: number | null;
  id_convocatoria_original: number | null;
  id_convocatoria_nueva: number | null;
  fecha_original: string | null;
  fecha_nueva: string | null;
  id_turno_original: number | null;
  id_turno_nuevo: number | null;
  id_agente_original: number | null;
  nombre_original: string | null;
  apellido_original: string | null;
  id_agente_nuevo: number | null;
  nombre_nuevo: string | null;
  apellido_nuevo: string | null;
  tipo_turno_original: string | null;
  tipo_turno_nuevo: string | null;
  id_agente_supervisor: number | null;
  nombre_supervisor: string | null;
  apellido_supervisor: string | null;
  usuario_aprobador: string | null;
  metodo_aprobacion: 'SISTEMA' | 'AGENTES' | null;
}

export interface ConvocatoriaHistorial {
  id_hist: number;
  id_convocatoria: number | null;
  id_agente_anterior: number | null;
  nombre_anterior: string | null;
  apellido_anterior: string | null;
  id_agente_nuevo: number | null;
  nombre_nuevo: string | null;
  apellido_nuevo: string | null;
  id_transaccion_cambio: number | null;
  tipo_cambio: string | null;
  motivo: string | null;
  fecha_cambio: string | null;
  usuario_responsable: string | null;
}

export interface BorradorEstado {
  id_transaccion: number;
  borrador_pendiente: boolean;
  borrador_confirmado: boolean;
  fecha_pendiente: string | null;
  fecha_confirmado: string | null;
}

export const CAMBIO_ESTADO_LABELS: Record<CambioTransaccionEstado, string> = {
  PENDIENTE: 'Pendiente',
  VALIDADO_SUPERVISOR: 'Validado por supervisor',
  VALIDADO_AGENTE: 'Validado por agente destino',
  APROBADO: 'Aprobado',
  EN_EJECUCION: 'En ejecucion',
  EJECUTADO: 'Ejecutado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
};
