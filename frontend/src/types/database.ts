export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      turnos: {
        Row: {
          id_turno: number
          tipo_turno: string
          descripcion: string | null
          cant_horas: number | null
          hora_inicio: string | null
          hora_fin: string | null
          solo_semana: boolean | null
          activo: boolean | null
        }
        Insert: {
          id_turno?: number
          tipo_turno: string
          descripcion?: string | null
          cant_horas?: number | null
          hora_inicio?: string | null
          hora_fin?: string | null
          solo_semana?: boolean | null
          activo?: boolean | null
        }
        Update: {
          id_turno?: number
          tipo_turno?: string
          descripcion?: string | null
          cant_horas?: number | null
          hora_inicio?: string | null
          hora_fin?: string | null
          solo_semana?: boolean | null
          activo?: boolean | null
        }
      }
      convocatoria: {
        Row: {
          id_convocatoria: number
          id_plani: number
          id_agente: number
          id_turno: number
          fecha_convocatoria: string // ISO Date string, timestamp creación
          estado: string | null
          id_convocatoria_origen: number | null
          motivo_cambio: string | null
          turno_cancelado: boolean | null
        }
        Insert: {
          id_convocatoria?: number
          id_plani: number
          id_agente: number
          id_turno: number
          fecha_convocatoria?: string
          estado?: string | null
          id_convocatoria_origen?: number | null
          motivo_cambio?: string | null
          turno_cancelado?: boolean | null
        }
        Update: {
          id_convocatoria?: number
          id_plani?: number
          id_agente?: number
          id_turno?: number
          fecha_convocatoria?: string
          estado?: string | null
          id_convocatoria_origen?: number | null
          motivo_cambio?: string | null
          turno_cancelado?: boolean | null
        }
      }
    }
    Views: {
      vista_convocatoria_mes_activo: {
        Row: {
          id_convocatoria: number
          id_plani: number
          id_agente: number
          agente: string
          dni: string
          fecha_turno: string
          anio: number
          mes: number
          tipo_turno: string
          id_turno: number
          estado: string | null
          turno_cancelado: boolean | null
          motivo_cambio: string | null
          cant_horas: number | null
        }
      }
    }
    Functions: {
      create_convocatoria: {
        Args: { p_dni: string, p_id_planificacion: number }
        Returns: number
      }
    }
  }
}

export interface Agente {
  id_agente: number
  nombre: string
  apellido: string
  dni: string
  hs_semana_actual: number
  anio_residencia: string
  hospital_referencia: string
  cohorte: number
  grupo_capacitacion: string | null
}

export interface PlanificacionView {
  id_plani: number
  id_dia: number
  id_turno: number
  cant_residentes_plan: number
  plani_notas: string | null
  hora_inicio: string | null
  hora_fin: string | null
  grupo: string | null
  fecha_virtual?: string
  turno_virtual?: string
}

export interface Planificacion {
  id_plani: number
  id_dia: number
  id_turno: number
  cant_residentes_plan: number
  plani_notas: string | null
  hora_inicio: string | null
  hora_fin: string | null
  grupo: string | null
  fecha_virtual?: string // Not in DB natively, joined via dias
  turno_virtual?: string // joined via turnos
}

export interface InasistenciaView {
  id_inasistencia: number
  id_agente: number
  agente: string
  dni: string
  fecha_inasistencia: string
  anio: number
  mes: number
  motivo: string
  estado: string | null
  requiere_certificado: boolean | null
  observaciones: string | null
  fecha_aviso: string | null
}

export interface Descanso {
  id_desc: number
  id_agente: number
  dia_solicitado: string
  mes_solicitado: number
  estado: string | null
  fecha_solicitud: string | null
  observaciones: string | null
}

export interface CertificadoView {
  id_certificado: number
  id_agente: number
  agente: string
  id_inasistencia: number | null
  fecha_inasistencia_justifica: string
  fecha_carga: string | null
  observaciones: string | null
}

export interface Capacitacion {
  id_cap: number
  id_dia: number
  coordinador_cap: number
  tema: string
  grupo: string | null
  observaciones: string | null
  id_turno: number | null
}

export interface Dispositivo {
  id_dispositivo: number
  nombre_dispositivo: string
  piso_dispositivo: number
  activo: boolean | null
  es_critico: boolean | null
  cupo_minimo: number | null
  cupo_optimo: number | null
}

export interface CapacitacionDispositivo {
  id_cap_dispo: number
  id_cap: number
  id_dispositivo: number
  orden: number | null
  tiempo_minutos: number | null
}

export interface VistaCapacitacionesDispositivos {
  id_cap: number;
  fecha: string | null;
  tipo_turno: string | null;
  grupo_capacitacion: string | null;
  tema: string | null;
  id_dispositivo: number | null;
  nombre_dispositivo: string | null;
  tiempo_minutos: number | null;
}

export interface SaldoDashboardView {
  anio: number;
  mes: number;
  id_agente: number;
  residente: string;
  dni: string;
  total_horas_convocadas: number;
  objetivo_mensual_48: number;
  objetivo_mensual_12w: number;
  diferencia_saldo_48: number;
  diferencia_saldo_12w: number;
  acumulado_anual_horas: number;
  acumulado_anual_obj_48: number;
  acumulado_anual_obj_12w: number;
  horas_manana: number;
  horas_tarde: number;
  horas_finde: number;
  horas_otros: number;
}


