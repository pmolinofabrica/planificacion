# Índices de la Base de Datos (public)


## Tabla: agentes_grupos_dias
- **pk_agentes_grupos_dias**: `CREATE UNIQUE INDEX pk_agentes_grupos_dias ON public.agentes_grupos_dias USING btree (id_agente, dia_semana)`

## Tabla: ajustes_horas
- **ajustes_horas_pkey**: `CREATE UNIQUE INDEX ajustes_horas_pkey ON public.ajustes_horas USING btree (id_ajuste)`

## Tabla: asignaciones
- **asignaciones_pkey**: `CREATE UNIQUE INDEX asignaciones_pkey ON public.asignaciones USING btree (id)`
- **idx_asig_agente**: `CREATE INDEX idx_asig_agente ON public.asignaciones USING btree (id_agente)`
- **idx_asig_dispositivo**: `CREATE INDEX idx_asig_dispositivo ON public.asignaciones USING btree (id_dispositivo)`
- **idx_asig_doble_turno**: `CREATE INDEX idx_asig_doble_turno ON public.asignaciones USING btree (es_doble_turno) WHERE (es_doble_turno = true)`
- **idx_asig_fecha**: `CREATE INDEX idx_asig_fecha ON public.asignaciones USING btree (fecha)`
- **idx_asig_fecha_turno**: `CREATE INDEX idx_asig_fecha_turno ON public.asignaciones USING btree (fecha, id_turno)`
- **idx_asig_turno**: `CREATE INDEX idx_asig_turno ON public.asignaciones USING btree (id_turno)`
- **uq_asignacion**: `CREATE UNIQUE INDEX uq_asignacion ON public.asignaciones USING btree (id_agente, fecha, id_turno)`

## Tabla: asignaciones_visita
- **asignaciones_visita_pkey**: `CREATE UNIQUE INDEX asignaciones_visita_pkey ON public.asignaciones_visita USING btree (id_asignacion)`

## Tabla: asignaciones_visita_historial
- **asignaciones_visita_historial_pkey**: `CREATE UNIQUE INDEX asignaciones_visita_historial_pkey ON public.asignaciones_visita_historial USING btree (id_hist)`

## Tabla: calendario_dispositivos
- **calendario_dispositivos_pkey**: `CREATE UNIQUE INDEX calendario_dispositivos_pkey ON public.calendario_dispositivos USING btree (id)`
- **idx_cal_dispositivo**: `CREATE INDEX idx_cal_dispositivo ON public.calendario_dispositivos USING btree (id_dispositivo)`
- **idx_cal_fecha**: `CREATE INDEX idx_cal_fecha ON public.calendario_dispositivos USING btree (fecha)`
- **idx_cal_fecha_turno**: `CREATE INDEX idx_cal_fecha_turno ON public.calendario_dispositivos USING btree (fecha, id_turno)`
- **idx_cal_turno**: `CREATE INDEX idx_cal_turno ON public.calendario_dispositivos USING btree (id_turno)`
- **uq_calendario**: `CREATE UNIQUE INDEX uq_calendario ON public.calendario_dispositivos USING btree (fecha, id_turno, id_dispositivo)`

## Tabla: cambio_transaccion
- **cambio_transaccion_pkey**: `CREATE UNIQUE INDEX cambio_transaccion_pkey ON public.cambio_transaccion USING btree (id_transaccion)`
- **idx_trans_estado**: `CREATE INDEX idx_trans_estado ON public.cambio_transaccion USING btree (estado)`
- **idx_trans_iniciador**: `CREATE INDEX idx_trans_iniciador ON public.cambio_transaccion USING btree (agente_iniciador)`

## Tabla: cambio_transaccion_detalle
- **cambio_transaccion_detalle_pkey**: `CREATE UNIQUE INDEX cambio_transaccion_detalle_pkey ON public.cambio_transaccion_detalle USING btree (id_detalle)`
- **idx_detalle_trans**: `CREATE INDEX idx_detalle_trans ON public.cambio_transaccion_detalle USING btree (id_transaccion)`

## Tabla: cambio_validacion
- **cambio_validacion_pkey**: `CREATE UNIQUE INDEX cambio_validacion_pkey ON public.cambio_validacion USING btree (id_validacion)`
- **idx_val_tipo**: `CREATE INDEX idx_val_tipo ON public.cambio_validacion USING btree (tipo_validacion)`
- **idx_val_transaccion**: `CREATE INDEX idx_val_transaccion ON public.cambio_validacion USING btree (id_transaccion)`

## Tabla: capacitaciones
- **capacitaciones_pkey**: `CREATE UNIQUE INDEX capacitaciones_pkey ON public.capacitaciones USING btree (id_cap)`
- **idx_cap_coordinador**: `CREATE INDEX idx_cap_coordinador ON public.capacitaciones USING btree (coordinador_cap)`
- **idx_cap_dia**: `CREATE INDEX idx_cap_dia ON public.capacitaciones USING btree (id_dia)`
- **uq_capacitaciones_dia_turno_grupo**: `CREATE UNIQUE INDEX uq_capacitaciones_dia_turno_grupo ON public.capacitaciones USING btree (id_dia, id_turno, grupo)`

## Tabla: capacitaciones_dispositivos
- **capacitaciones_dispositivos_pkey**: `CREATE UNIQUE INDEX capacitaciones_dispositivos_pkey ON public.capacitaciones_dispositivos USING btree (id_cap_dispo)`
- **idx_cap_dispo_cap**: `CREATE INDEX idx_cap_dispo_cap ON public.capacitaciones_dispositivos USING btree (id_cap)`
- **idx_cap_dispo_dispositivo**: `CREATE INDEX idx_cap_dispo_dispositivo ON public.capacitaciones_dispositivos USING btree (id_dispositivo)`
- **uq_cap_dispositivo**: `CREATE UNIQUE INDEX uq_cap_dispositivo ON public.capacitaciones_dispositivos USING btree (id_cap, id_dispositivo)`

## Tabla: capacitaciones_participantes
- **capacitaciones_participantes_pkey**: `CREATE UNIQUE INDEX capacitaciones_participantes_pkey ON public.capacitaciones_participantes USING btree (id_participante)`
- **idx_cap_part_agente**: `CREATE INDEX idx_cap_part_agente ON public.capacitaciones_participantes USING btree (id_agente)`
- **idx_cap_part_asistio**: `CREATE INDEX idx_cap_part_asistio ON public.capacitaciones_participantes USING btree (asistio)`
- **idx_cap_part_cap**: `CREATE INDEX idx_cap_part_cap ON public.capacitaciones_participantes USING btree (id_cap)`
- **uq_cap_agente**: `CREATE UNIQUE INDEX uq_cap_agente ON public.capacitaciones_participantes USING btree (id_cap, id_agente)`

## Tabla: certificados
- **certificados_pkey**: `CREATE UNIQUE INDEX certificados_pkey ON public.certificados USING btree (id_certificado)`
- **idx_cert_agente**: `CREATE INDEX idx_cert_agente ON public.certificados USING btree (id_agente)`
- **idx_cert_estado**: `CREATE INDEX idx_cert_estado ON public.certificados USING btree (estado_certificado)`
- **idx_cert_inasistencia**: `CREATE INDEX idx_cert_inasistencia ON public.certificados USING btree (id_inasistencia)`
- **uq_inasistencia_tipo**: `CREATE UNIQUE INDEX uq_inasistencia_tipo ON public.certificados USING btree (id_inasistencia, tipo_certificado)`

## Tabla: config_ciclo_lectivo
- **config_ciclo_lectivo_pkey**: `CREATE UNIQUE INDEX config_ciclo_lectivo_pkey ON public.config_ciclo_lectivo USING btree (anio)`

## Tabla: config_cohorte
- **config_cohorte_pkey**: `CREATE UNIQUE INDEX config_cohorte_pkey ON public.config_cohorte USING btree (anio)`

## Tabla: config_visitas_coeficientes
- **config_visitas_coeficientes_pkey**: `CREATE UNIQUE INDEX config_visitas_coeficientes_pkey ON public.config_visitas_coeficientes USING btree (id_coeficiente)`

## Tabla: configuracion
- **configuracion_pkey**: `CREATE UNIQUE INDEX configuracion_pkey ON public.configuracion USING btree (clave)`
- **idx_config_tipo**: `CREATE INDEX idx_config_tipo ON public.configuracion USING btree (tipo_dato)`

## Tabla: configuracion_turnos
- **pk_configuracion_turnos**: `CREATE UNIQUE INDEX pk_configuracion_turnos ON public.configuracion_turnos USING btree (fecha, id_turno)`

## Tabla: convocatoria
- **convocatoria_pkey**: `CREATE UNIQUE INDEX convocatoria_pkey ON public.convocatoria USING btree (id_convocatoria)`
- **convocatoria_unicidad**: `CREATE UNIQUE INDEX convocatoria_unicidad ON public.convocatoria USING btree (id_plani, id_agente)`
- **idx_conv_agente**: `CREATE INDEX idx_conv_agente ON public.convocatoria USING btree (id_agente)`
- **idx_conv_agente_fecha_estado**: `CREATE INDEX idx_conv_agente_fecha_estado ON public.convocatoria USING btree (id_agente, fecha_convocatoria, estado)`
- **idx_conv_estado**: `CREATE INDEX idx_conv_estado ON public.convocatoria USING btree (estado)`
- **idx_conv_fecha**: `CREATE INDEX idx_conv_fecha ON public.convocatoria USING btree (fecha_convocatoria)`
- **idx_conv_plani**: `CREATE INDEX idx_conv_plani ON public.convocatoria USING btree (id_plani)`

## Tabla: convocatoria_historial
- **convocatoria_historial_pkey**: `CREATE UNIQUE INDEX convocatoria_historial_pkey ON public.convocatoria_historial USING btree (id_hist)`
- **idx_hist_convocatoria**: `CREATE INDEX idx_hist_convocatoria ON public.convocatoria_historial USING btree (id_convocatoria)`
- **idx_hist_fecha**: `CREATE INDEX idx_hist_fecha ON public.convocatoria_historial USING btree (fecha_cambio)`

## Tabla: correos_visita
- **correos_visita_pkey**: `CREATE UNIQUE INDEX correos_visita_pkey ON public.correos_visita USING btree (id_correo)`

## Tabla: datos_personales
- **datos_personales_dni_key**: `CREATE UNIQUE INDEX datos_personales_dni_key ON public.datos_personales USING btree (dni)`
- **datos_personales_pkey**: `CREATE UNIQUE INDEX datos_personales_pkey ON public.datos_personales USING btree (id_agente)`
- **idx_agentes_activo**: `CREATE INDEX idx_agentes_activo ON public.datos_personales USING btree (activo)`
- **idx_agentes_dni**: `CREATE UNIQUE INDEX idx_agentes_dni ON public.datos_personales USING btree (dni)`
- **idx_agentes_nombre_apellido**: `CREATE INDEX idx_agentes_nombre_apellido ON public.datos_personales USING btree (apellido, nombre)`
- **ix_datos_personales_cohorte**: `CREATE INDEX ix_datos_personales_cohorte ON public.datos_personales USING btree (cohorte)`

## Tabla: datos_personales_adicionales
- **datos_personales_adicionales_pkey**: `CREATE UNIQUE INDEX datos_personales_adicionales_pkey ON public.datos_personales_adicionales USING btree (id_agente)`
- **idx_datos_adicionales_agente**: `CREATE INDEX idx_datos_adicionales_agente ON public.datos_personales_adicionales USING btree (id_agente)`

## Tabla: descansos
- **descansos_agente_dia_key**: `CREATE UNIQUE INDEX descansos_agente_dia_key ON public.descansos USING btree (id_agente, dia_solicitado)`
- **descansos_pkey**: `CREATE UNIQUE INDEX descansos_pkey ON public.descansos USING btree (id_desc)`
- **idx_desc_agente**: `CREATE INDEX idx_desc_agente ON public.descansos USING btree (id_agente)`
- **idx_desc_dia**: `CREATE INDEX idx_desc_dia ON public.descansos USING btree (dia_solicitado)`
- **idx_desc_estado**: `CREATE INDEX idx_desc_estado ON public.descansos USING btree (estado)`

## Tabla: dias
- **dias_fecha_key**: `CREATE UNIQUE INDEX dias_fecha_key ON public.dias USING btree (fecha)`
- **dias_pkey**: `CREATE UNIQUE INDEX dias_pkey ON public.dias USING btree (id_dia)`

## Tabla: disponibilidad
- **disponibilidad_pkey**: `CREATE UNIQUE INDEX disponibilidad_pkey ON public.disponibilidad USING btree (id_dispo)`
- **idx_dispo_agente**: `CREATE INDEX idx_dispo_agente ON public.disponibilidad USING btree (id_agente)`
- **idx_dispo_turno**: `CREATE INDEX idx_dispo_turno ON public.disponibilidad USING btree (id_turno)`
- **uq_agente_turno**: `CREATE UNIQUE INDEX uq_agente_turno ON public.disponibilidad USING btree (id_agente, id_turno)`

## Tabla: dispositivos
- **dispositivos_pkey**: `CREATE UNIQUE INDEX dispositivos_pkey ON public.dispositivos USING btree (id_dispositivo)`
- **idx_dispositivos_activo**: `CREATE INDEX idx_dispositivos_activo ON public.dispositivos USING btree (activo)`
- **idx_dispositivos_piso**: `CREATE INDEX idx_dispositivos_piso ON public.dispositivos USING btree (piso_dispositivo)`

## Tabla: error_patterns
- **error_patterns_pattern_signature_key**: `CREATE UNIQUE INDEX error_patterns_pattern_signature_key ON public.error_patterns USING btree (pattern_signature)`
- **error_patterns_pkey**: `CREATE UNIQUE INDEX error_patterns_pkey ON public.error_patterns USING btree (id_pattern)`
- **idx_patterns_count**: `CREATE INDEX idx_patterns_count ON public.error_patterns USING btree (occurrence_count)`
- **idx_patterns_signature**: `CREATE INDEX idx_patterns_signature ON public.error_patterns USING btree (pattern_signature)`
- **idx_patterns_status**: `CREATE INDEX idx_patterns_status ON public.error_patterns USING btree (pattern_status)`

## Tabla: inasistencias
- **idx_inasis_agente**: `CREATE INDEX idx_inasis_agente ON public.inasistencias USING btree (id_agente)`
- **idx_inasis_estado**: `CREATE INDEX idx_inasis_estado ON public.inasistencias USING btree (estado)`
- **idx_inasis_fecha**: `CREATE INDEX idx_inasis_fecha ON public.inasistencias USING btree (fecha_inasistencia)`
- **inasistencias_agente_fecha_key**: `CREATE UNIQUE INDEX inasistencias_agente_fecha_key ON public.inasistencias USING btree (id_agente, fecha_inasistencia)`
- **inasistencias_pkey**: `CREATE UNIQUE INDEX inasistencias_pkey ON public.inasistencias USING btree (id_inasistencia)`

## Tabla: menu
- **idx_menu_agente**: `CREATE INDEX idx_menu_agente ON public.menu USING btree (id_agente)`
- **idx_menu_convocatoria**: `CREATE INDEX idx_menu_convocatoria ON public.menu USING btree (id_convocatoria)`
- **idx_menu_dispositivo**: `CREATE INDEX idx_menu_dispositivo ON public.menu USING btree (id_dispositivo)`
- **idx_menu_fecha**: `CREATE INDEX idx_menu_fecha ON public.menu USING btree (fecha_asignacion)`
- **menu_pkey**: `CREATE UNIQUE INDEX menu_pkey ON public.menu USING btree (id_menu)`

## Tabla: menu_semana
- **idx_menu_sem_agente**: `CREATE INDEX idx_menu_sem_agente ON public.menu_semana USING btree (id_agente)`
- **idx_menu_sem_convocatoria**: `CREATE INDEX idx_menu_sem_convocatoria ON public.menu_semana USING btree (id_convocatoria)`
- **idx_menu_sem_dispositivo**: `CREATE INDEX idx_menu_sem_dispositivo ON public.menu_semana USING btree (id_dispositivo)`
- **idx_menu_sem_fecha**: `CREATE INDEX idx_menu_sem_fecha ON public.menu_semana USING btree (fecha_asignacion)`
- **idx_menu_sem_turno**: `CREATE INDEX idx_menu_sem_turno ON public.menu_semana USING btree (id_turno)`
- **pk_menu_semana**: `CREATE UNIQUE INDEX pk_menu_semana ON public.menu_semana USING btree (id_menu_semana)`
- **uq_menu_semana_asignacion**: `CREATE UNIQUE INDEX uq_menu_semana_asignacion ON public.menu_semana USING btree (id_agente, fecha_asignacion, id_turno, id_dispositivo)`

## Tabla: planificacion
- **idx_plani_dia**: `CREATE INDEX idx_plani_dia ON public.planificacion USING btree (id_dia)`
- **idx_plani_turno**: `CREATE INDEX idx_plani_turno ON public.planificacion USING btree (id_turno)`
- **planificacion_pkey**: `CREATE UNIQUE INDEX planificacion_pkey ON public.planificacion USING btree (id_plani)`
- **uq_plani_dia_turno_grupo**: `CREATE UNIQUE INDEX uq_plani_dia_turno_grupo ON public.planificacion USING btree (id_dia, id_turno, grupo)`

## Tabla: saldos
- **idx_saldo_agente**: `CREATE INDEX idx_saldo_agente ON public.saldos USING btree (id_agente)`
- **idx_saldo_periodo**: `CREATE INDEX idx_saldo_periodo ON public.saldos USING btree (anio, mes)`
- **saldos_pkey**: `CREATE UNIQUE INDEX saldos_pkey ON public.saldos USING btree (id_saldo)`
- **uq_agente_periodo**: `CREATE UNIQUE INDEX uq_agente_periodo ON public.saldos USING btree (id_agente, mes, anio)`

## Tabla: seguimiento_llamados_visita
- **seguimiento_llamados_visita_pkey**: `CREATE UNIQUE INDEX seguimiento_llamados_visita_pkey ON public.seguimiento_llamados_visita USING btree (id_llamado)`

## Tabla: solicitudes
- **solicitudes_pkey**: `CREATE UNIQUE INDEX solicitudes_pkey ON public.solicitudes USING btree (id)`

## Tabla: stg_calendario_import
- **idx_stg_procesado**: `CREATE INDEX idx_stg_procesado ON public.stg_calendario_import USING btree (procesado)`
- **stg_calendario_import_pkey**: `CREATE UNIQUE INDEX stg_calendario_import_pkey ON public.stg_calendario_import USING btree (id)`

## Tabla: system_errors
- **idx_errors_component**: `CREATE INDEX idx_errors_component ON public.system_errors USING btree (component)`
- **idx_errors_recurring**: `CREATE INDEX idx_errors_recurring ON public.system_errors USING btree (is_recurring)`
- **idx_errors_resolved**: `CREATE INDEX idx_errors_resolved ON public.system_errors USING btree (resolved)`
- **idx_errors_severity**: `CREATE INDEX idx_errors_severity ON public.system_errors USING btree (severity, resolved)`
- **idx_errors_timestamp**: `CREATE INDEX idx_errors_timestamp ON public.system_errors USING btree ("timestamp")`
- **idx_errors_type**: `CREATE INDEX idx_errors_type ON public.system_errors USING btree (error_type)`
- **system_errors_pkey**: `CREATE UNIQUE INDEX system_errors_pkey ON public.system_errors USING btree (id_error)`

## Tabla: tardanzas
- **idx_tardanzas_agente**: `CREATE INDEX idx_tardanzas_agente ON public.tardanzas USING btree (id_agente)`
- **idx_tardanzas_fecha**: `CREATE INDEX idx_tardanzas_fecha ON public.tardanzas USING btree (fecha)`
- **tardanzas_agente_fecha_key**: `CREATE UNIQUE INDEX tardanzas_agente_fecha_key ON public.tardanzas USING btree (id_agente, fecha)`
- **tardanzas_pkey**: `CREATE UNIQUE INDEX tardanzas_pkey ON public.tardanzas USING btree (id_tardanza)`

## Tabla: turnos
- **idx_turnos_tipo**: `CREATE INDEX idx_turnos_tipo ON public.turnos USING btree (tipo_turno)`
- **turnos_pkey**: `CREATE UNIQUE INDEX turnos_pkey ON public.turnos USING btree (id_turno)`
- **turnos_tipo_turno_key**: `CREATE UNIQUE INDEX turnos_tipo_turno_key ON public.turnos USING btree (tipo_turno)`

## Tabla: visitas_grupales
- **visitas_grupales_pkey**: `CREATE UNIQUE INDEX visitas_grupales_pkey ON public.visitas_grupales USING btree (id_visita)`
