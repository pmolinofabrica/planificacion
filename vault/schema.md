# Supabase Database Schema (public)


## Table: agentes_grupos_dias
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | NO |
| dia_semana | integer | NO |
| grupo | character varying | NO |

## Table: ajustes_horas
| Column | Type | Nullable |
|--------|------|----------|
| id_ajuste | integer | NO |
| id_agente | integer | YES |
| fecha_ajuste | date | YES |
| horas_delta | numeric | NO |
| motivo | text | NO |
| creado_por | text | YES |

## Table: asignaciones
| Column | Type | Nullable |
|--------|------|----------|
| id | integer | NO |
| id_agente | integer | NO |
| id_dispositivo | integer | NO |
| fecha | date | NO |
| id_turno | integer | NO |
| es_doble_turno | boolean | YES |
| es_capacitacion_servicio | boolean | YES |
| created_at | timestamp without time zone | YES |

## Table: asignaciones_visita
| Column | Type | Nullable |
|--------|------|----------|
| id_asignacion | integer | NO |
| id_visita | integer | YES |
| id_plani | integer | YES |
| estado | character varying | NO |
| cantidad_personas_original | integer | NO |
| id_coeficiente | integer | YES |
| coeficiente_aplicado | numeric | NO |
| cupo_calculado | numeric | NO |
| nombre_institucion | text | YES |
| nombre_referente | text | YES |
| email_referente | text | YES |
| telefono_referente | text | YES |
| telefono_institucion | text | YES |
| nombre_empresa | text | YES |
| rango_etario | text | YES |
| mes_solicitado | integer | YES |
| agente_asigno | text | YES |
| observaciones | text | YES |
| created_at | timestamp without time zone | YES |
| updated_at | timestamp without time zone | YES |
| numero_grupo | ARRAY | YES |

## Table: asignaciones_visita_historial
| Column | Type | Nullable |
|--------|------|----------|
| id_hist | integer | NO |
| id_asignacion | integer | NO |
| estado_anterior | character varying | YES |
| estado_nuevo | character varying | NO |
| motivo | text | YES |
| usuario | text | YES |
| created_at | timestamp without time zone | YES |

## Table: calendario_dispositivos
| Column | Type | Nullable |
|--------|------|----------|
| id | integer | NO |
| fecha | date | NO |
| id_turno | integer | NO |
| id_dispositivo | integer | NO |
| cupo_objetivo | integer | YES |
| created_at | timestamp without time zone | YES |

## Table: cambio_transaccion
| Column | Type | Nullable |
|--------|------|----------|
| id_transaccion | integer | NO |
| fecha_solicitud | timestamp without time zone | YES |
| agente_iniciador | integer | NO |
| tipo_transaccion | character varying | NO |
| estado | character varying | YES |
| fecha_validacion | timestamp without time zone | YES |
| fecha_aprobacion | timestamp without time zone | YES |
| fecha_ejecucion | timestamp without time zone | YES |
| usuario_aprobador | character varying | YES |
| motivo_rechazo | text | YES |
| observaciones | text | YES |

## Table: cambio_transaccion_detalle
| Column | Type | Nullable |
|--------|------|----------|
| id_detalle | integer | NO |
| id_transaccion | integer | NO |
| secuencia | integer | NO |
| id_convocatoria_original | integer | NO |
| id_agente_original | integer | NO |
| fecha_original | date | NO |
| id_turno_original | integer | NO |
| id_convocatoria_nueva | integer | YES |
| id_agente_nuevo | integer | NO |
| fecha_nueva | date | NO |
| id_turno_nuevo | integer | NO |
| validacion_capacitacion | boolean | YES |
| validacion_disponibilidad | boolean | YES |
| validacion_conflicto | boolean | YES |
| mensaje_validacion | text | YES |

## Table: cambio_validacion
| Column | Type | Nullable |
|--------|------|----------|
| id_validacion | integer | NO |
| id_transaccion | integer | NO |
| tipo_validacion | character varying | NO |
| es_bloqueante | boolean | YES |
| es_alerta | boolean | YES |
| estado | character varying | YES |
| mensaje | text | NO |
| detalle_tecnico | text | YES |
| fecha_validacion | timestamp without time zone | YES |
| usuario_resolucion | character varying | YES |
| fecha_resolucion | timestamp without time zone | YES |

## Table: capacitaciones
| Column | Type | Nullable |
|--------|------|----------|
| id_cap | integer | NO |
| id_dia | integer | NO |
| coordinador_cap | integer | NO |
| tema | character varying | NO |
| grupo | character varying | YES |
| observaciones | text | YES |
| fecha_registro | timestamp without time zone | YES |
| id_turno | integer | YES |

## Table: capacitaciones_dispositivos
| Column | Type | Nullable |
|--------|------|----------|
| id_cap_dispo | integer | NO |
| id_cap | integer | NO |
| id_dispositivo | integer | NO |
| orden | integer | YES |
| tiempo_minutos | integer | YES |

## Table: capacitaciones_participantes
| Column | Type | Nullable |
|--------|------|----------|
| id_participante | integer | NO |
| id_cap | integer | NO |
| id_agente | integer | NO |
| asistio | boolean | YES |
| observaciones | text | YES |

## Table: certificados
| Column | Type | Nullable |
|--------|------|----------|
| id_certificado | integer | NO |
| id_inasistencia | integer | NO |
| id_agente | integer | NO |
| fecha_carga | date | NO |
| fecha_inasistencia_justifica | date | NO |
| tipo_certificado | character varying | YES |
| estado_certificado | character varying | YES |
| observaciones | text | YES |

## Table: config_ciclo_lectivo
| Column | Type | Nullable |
|--------|------|----------|
| anio | integer | NO |
| fecha_inicio | date | NO |
| fecha_fin | date | NO |
| horas_semanales_meta | integer | YES |
| limite_inasistencias_justificadas | integer | YES |
| limite_inasistencias_injustificadas | integer | YES |
| limite_imprevistos_mensual | integer | YES |
| limite_imprevistos_anual | integer | YES |

## Table: config_cohorte
| Column | Type | Nullable |
|--------|------|----------|
| anio | integer | NO |
| fecha_inicio | date | NO |
| fecha_fin | date | NO |
| horas_semanales_requeridas | integer | YES |
| activo | boolean | YES |
| created_at | timestamp with time zone | YES |

## Table: config_visitas_coeficientes
| Column | Type | Nullable |
|--------|------|----------|
| id_coeficiente | integer | NO |
| nombre_categoria | text | NO |
| valor | numeric | NO |
| rango_edad_texto | text | YES |
| activo | boolean | YES |

## Table: configuracion
| Column | Type | Nullable |
|--------|------|----------|
| clave | character varying | NO |
| valor | text | NO |
| descripcion | text | YES |
| tipo_dato | character varying | YES |
| fecha_modificacion | timestamp without time zone | YES |
| modificado_por | character varying | YES |

## Table: configuracion_turnos
| Column | Type | Nullable |
|--------|------|----------|
| fecha | date | NO |
| id_turno | integer | NO |
| tipo_organizacion | character varying | NO |

## Table: convocatoria
| Column | Type | Nullable |
|--------|------|----------|
| id_convocatoria | integer | NO |
| id_plani | integer | NO |
| id_agente | integer | NO |
| id_turno | integer | NO |
| fecha_convocatoria | date | NO |
| estado | character varying | YES |
| id_convocatoria_origen | integer | YES |
| fecha_registro | timestamp without time zone | YES |
| fecha_modificacion | timestamp without time zone | YES |
| motivo_cambio | text | YES |
| usuario_modificacion | character varying | YES |
| turno_cancelado | boolean | YES |

## Table: convocatoria_historial
| Column | Type | Nullable |
|--------|------|----------|
| id_hist | integer | NO |
| id_convocatoria | integer | NO |
| id_agente_anterior | integer | NO |
| id_agente_nuevo | integer | NO |
| fecha_cambio | timestamp without time zone | YES |
| tipo_cambio | character varying | NO |
| motivo | text | YES |
| id_transaccion_cambio | integer | YES |
| usuario_responsable | character varying | YES |

## Table: correos_visita
| Column | Type | Nullable |
|--------|------|----------|
| id_correo | integer | NO |
| id_asignacion | integer | NO |
| tipo_correo | character varying | NO |
| asunto | text | YES |
| cuerpo | text | YES |
| destinatario_email | text | NO |
| fecha_envio | timestamp without time zone | YES |
| estado_envio | character varying | NO |
| respuesta_recibida | boolean | YES |
| fecha_respuesta | timestamp without time zone | YES |
| notas | text | YES |
| created_at | timestamp without time zone | YES |

## Table: datos_personales
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | NO |
| nombre | character varying | NO |
| apellido | character varying | NO |
| dni | character varying | NO |
| fecha_nacimiento | date | YES |
| email | character varying | YES |
| telefono | character varying | YES |
| domicilio | text | YES |
| activo | boolean | YES |
| fecha_alta | timestamp without time zone | YES |
| fecha_baja | timestamp without time zone | YES |
| cohorte | integer | NO |

## Table: datos_personales_adicionales
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | bigint | NO |
| referencia_emergencia | text | YES |
| nombre_preferido | text | YES |
| pronombres | text | YES |
| formacion_extra | text | YES |
| info_extra | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |

## Table: descansos
| Column | Type | Nullable |
|--------|------|----------|
| id_desc | integer | NO |
| id_agente | integer | NO |
| dia_solicitado | date | NO |
| mes_solicitado | integer | NO |
| estado | character varying | YES |
| fecha_solicitud | timestamp without time zone | YES |
| observaciones | text | YES |

## Table: dias
| Column | Type | Nullable |
|--------|------|----------|
| id_dia | integer | NO |
| fecha | date | NO |
| dia | integer | NO |
| mes | integer | NO |
| anio | integer | NO |
| numero_dia_semana | integer | NO |
| es_feriado | boolean | YES |
| descripcion_feriado | text | YES |

## Table: disponibilidad
| Column | Type | Nullable |
|--------|------|----------|
| id_dispo | integer | NO |
| id_agente | integer | NO |
| id_turno | integer | NO |
| estado | character varying | YES |
| prioridad | integer | YES |
| fecha_declaracion | date | YES |

## Table: dispositivos
| Column | Type | Nullable |
|--------|------|----------|
| id_dispositivo | integer | NO |
| nombre_dispositivo | character varying | NO |
| piso_dispositivo | integer | NO |
| activo | boolean | YES |
| fecha_creacion | timestamp without time zone | YES |
| es_critico | boolean | YES |
| cupo_minimo | integer | YES |
| cupo_optimo | integer | YES |

## Table: error_patterns
| Column | Type | Nullable |
|--------|------|----------|
| id_pattern | integer | NO |
| pattern_signature | character varying | NO |
| error_type | character varying | YES |
| component | character varying | YES |
| first_occurrence | timestamp without time zone | YES |
| last_occurrence | timestamp without time zone | YES |
| occurrence_count | integer | YES |
| severity_max | character varying | YES |
| affected_users_count | integer | YES |
| pattern_status | character varying | YES |
| resolution_description | text | YES |

## Table: inasistencias
| Column | Type | Nullable |
|--------|------|----------|
| id_inasistencia | integer | NO |
| id_agente | integer | NO |
| fecha_aviso | timestamp without time zone | YES |
| fecha_inasistencia | date | NO |
| motivo | character varying | NO |
| requiere_certificado | boolean | YES |
| estado | character varying | YES |
| observaciones | text | YES |
| fecha_actualizacion_estado | timestamp without time zone | YES |
| usuario_actualizo_estado | character varying | YES |
| certificado_presentado | boolean | YES |
| genera_descuento | boolean | YES |
| descuento_confirmado | boolean | YES |
| mes_informe_descuento | integer | YES |

## Table: menu
| Column | Type | Nullable |
|--------|------|----------|
| id_menu | integer | NO |
| id_convocatoria | integer | NO |
| id_dispositivo | integer | NO |
| id_agente | integer | NO |
| fecha_asignacion | date | NO |
| orden | integer | YES |
| acompaña_grupo | boolean | YES |
| fecha_registro | timestamp without time zone | YES |
| estado_ejecucion | character varying | YES |
| id_dispositivo_origen | integer | YES |
| dispositivo_cerrado | boolean | YES |
| es_capacitacion_servicio | boolean | YES |

## Table: menu_semana
| Column | Type | Nullable |
|--------|------|----------|
| id_menu_semana | integer | NO |
| id_convocatoria | integer | NO |
| id_dispositivo | integer | NO |
| id_agente | integer | NO |
| fecha_asignacion | date | NO |
| id_turno | integer | NO |
| orden | integer | YES |
| acompaña_grupo | boolean | YES |
| fecha_registro | timestamp without time zone | YES |
| estado_ejecucion | character varying | YES |
| id_dispositivo_origen | integer | YES |
| dispositivo_cerrado | boolean | YES |
| es_capacitacion_servicio | boolean | YES |
| tipo_organizacion | character varying | YES |
| numero_grupo | integer | YES |

## Table: planificacion
| Column | Type | Nullable |
|--------|------|----------|
| id_plani | integer | NO |
| id_dia | integer | NO |
| id_turno | integer | NO |
| cant_residentes_plan | integer | NO |
| cant_visit | integer | YES |
| plani_notas | text | YES |
| fecha_creacion | timestamp without time zone | YES |
| hora_inicio | time without time zone | YES |
| hora_fin | time without time zone | YES |
| cant_horas | numeric | YES |
| usa_horario_custom | boolean | YES |
| motivo_horario_custom | text | YES |
| grupo | character varying | YES |
| lugar | text | YES |

## Table: saldos
| Column | Type | Nullable |
|--------|------|----------|
| id_saldo | integer | NO |
| id_agente | integer | NO |
| mes | integer | NO |
| anio | integer | NO |
| horas_mes | numeric | YES |
| horas_anuales | numeric | YES |
| fecha_actualizacion | timestamp without time zone | YES |

## Table: seguimiento_llamados_visita
| Column | Type | Nullable |
|--------|------|----------|
| id_llamado | integer | NO |
| id_asignacion | integer | YES |
| fecha_hora | timestamp with time zone | YES |
| agente | text | YES |
| atendio | boolean | YES |
| created_at | timestamp with time zone | YES |
| observaciones | text | YES |

## Table: solicitudes
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| marca_temporal | timestamp with time zone | YES |
| direccion_email | text | YES |
| tipo_institucion | text | YES |
| nombre_institucion | text | YES |
| provincia | text | YES |
| departamento | text | YES |
| agenda_amplia | text | YES |
| quien_coordina | text | YES |
| nombre_coordinador_viaje | text | YES |
| nombre_empresa_organizacion | text | YES |
| telefono_contacto_coordinador | text | YES |
| email_contacto_coordinador | text | YES |
| nombre_referente | text | YES |
| cargo_institucion | text | YES |
| telefono_referente | text | YES |
| telefono_institucion | text | YES |
| email_referente | text | YES |
| mes_visita_preferido | text | YES |
| dias_turnos_preferencia | text | YES |
| disponibilidad_llamados | text | YES |
| rango_etario | text | YES |
| cantidad_visitantes | integer | YES |
| requerimientos_accesibilidad | text | YES |
| comentarios_observaciones | text | YES |
| created_at | timestamp with time zone | YES |
| estado_actual | text | YES |
| coeficiente_calculado | numeric | YES |

## Table: stg_calendario_import
| Column | Type | Nullable |
|--------|------|----------|
| id | integer | NO |
| fecha | date | NO |
| id_turno | integer | NO |
| config_raw | text | NO |
| usuario_carga | text | YES |
| procesado | boolean | YES |
| error | text | YES |
| created_at | timestamp without time zone | YES |

## Table: system_errors
| Column | Type | Nullable |
|--------|------|----------|
| id_error | integer | NO |
| timestamp | timestamp without time zone | YES |
| error_type | character varying | NO |
| component | character varying | NO |
| error_message | text | NO |
| error_details | text | YES |
| user_action | text | YES |
| id_agente | integer | YES |
| id_convocatoria | integer | YES |
| id_transaccion | integer | YES |
| additional_context | text | YES |
| severity | character varying | YES |
| resolved | boolean | YES |
| resolution_date | timestamp without time zone | YES |
| resolution_notes | text | YES |
| resolved_by | character varying | YES |
| is_recurring | boolean | YES |
| related_error_id | integer | YES |

## Table: tardanzas
| Column | Type | Nullable |
|--------|------|----------|
| id_tardanza | integer | NO |
| id_agente | integer | NO |
| id_convocatoria | integer | YES |
| fecha | date | NO |
| minutos_atraso | integer | YES |
| ciclo_numero | integer | YES |
| posicion_en_ciclo | integer | YES |
| accion_aplicada | text | YES |
| observaciones | text | YES |
| created_at | timestamp with time zone | YES |

## Table: turnos
| Column | Type | Nullable |
|--------|------|----------|
| id_turno | integer | NO |
| tipo_turno | character varying | NO |
| descripcion | text | YES |
| cant_horas | numeric | YES |
| hora_inicio | time without time zone | YES |
| hora_fin | time without time zone | YES |
| solo_semana | boolean | YES |
| activo | boolean | YES |

## Table: visitas_grupales
| Column | Type | Nullable |
|--------|------|----------|
| id_visita | integer | NO |
| created_at | timestamp without time zone | YES |
| nombre_institucion | text | NO |
| nombre_referente | text | YES |
| email_referente | text | YES |
| telefono_referente | text | YES |
| cantidad_personas | integer | NO |
| id_coeficiente | integer | YES |
| requiere_accesibilidad | boolean | YES |
| observaciones_grupo | text | YES |
| estado | text | YES |
| id_plani_asignado | integer | YES |
| email_confirmacion_enviado | boolean | YES |

## Table: vista_agentes_capacitados
| Column | Type | Nullable |
|--------|------|----------|
| id_dispositivo | integer | YES |
| nombre_dispositivo | character varying | YES |
| id_agente | integer | YES |
| nombre_completo | text | YES |
| capacitacion | character varying | YES |
| asistio | boolean | YES |
| fecha_capacitacion | date | YES |
| estado_capacitacion | text | YES |

## Table: vista_cambios_pendientes
| Column | Type | Nullable |
|--------|------|----------|
| id_transaccion | integer | YES |
| fecha_solicitud | timestamp without time zone | YES |
| agente_iniciador | text | YES |
| tipo_transaccion | character varying | YES |
| estado | character varying | YES |
| cantidad_cambios | bigint | YES |
| observaciones | text | YES |

## Table: vista_cambios_turno
| Column | Type | Nullable |
|--------|------|----------|
| id_nuevo | integer | YES |
| id_original | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| fecha_original | date | YES |
| turno_tipo_original | character varying | YES |
| estado_original | character varying | YES |
| fecha_nueva | date | YES |
| turno_tipo_nuevo | character varying | YES |
| estado_nuevo | character varying | YES |
| motivo_cambio | text | YES |
| fecha_registro | timestamp without time zone | YES |
| usuario_modificacion | character varying | YES |

## Table: vista_certificados_completa
| Column | Type | Nullable |
|--------|------|----------|
| id_certificado | integer | YES |
| id_inasistencia | integer | YES |
| id_agente | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| fecha_entrega_certificado | date | YES |
| fecha_inasistencia_justifica | date | YES |
| tipo_certificado | character varying | YES |
| estado_certificado | character varying | YES |
| observaciones | text | YES |

## Table: vista_convocatoria_completa
| Column | Type | Nullable |
|--------|------|----------|
| id_convocatoria | integer | YES |
| id_plani | integer | YES |
| id_agente | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| fecha_turno | date | YES |
| anio | integer | YES |
| mes | integer | YES |
| tipo_turno | character varying | YES |
| id_turno | integer | YES |
| estado | character varying | YES |
| turno_cancelado | boolean | YES |
| motivo_cambio | text | YES |
| cant_horas | numeric | YES |

## Table: vista_convocatoria_mes_activo
| Column | Type | Nullable |
|--------|------|----------|
| id_convocatoria | integer | YES |
| id_plani | integer | YES |
| id_agente | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| fecha_turno | date | YES |
| anio | integer | YES |
| mes | integer | YES |
| tipo_turno | character varying | YES |
| id_turno | integer | YES |
| estado | character varying | YES |
| turno_cancelado | boolean | YES |
| motivo_cambio | text | YES |
| cant_horas | numeric | YES |

## Table: vista_dashboard_inasistencias
| Column | Type | Nullable |
|--------|------|----------|
| anio | numeric | YES |
| mes | numeric | YES |
| motivo | character varying | YES |
| estado | character varying | YES |
| total | bigint | YES |

## Table: vista_demanda_planificada
| Column | Type | Nullable |
|--------|------|----------|
| fecha | date | YES |
| id_turno | integer | YES |
| nombre_turno | character varying | YES |
| cantidad_personas | integer | YES |
| notas | text | YES |

## Table: vista_disponibilidad_visitas
| Column | Type | Nullable |
|--------|------|----------|
| id_plani | integer | YES |
| fecha | date | YES |
| mes | integer | YES |
| anio | integer | YES |
| numero_dia_semana | integer | YES |
| id_turno | integer | YES |
| tipo_turno | character varying | YES |
| hora_inicio | time without time zone | YES |
| hora_fin | time without time zone | YES |
| cupo_total | integer | YES |
| cupo_ocupado_firme | numeric | YES |
| cupo_en_espera | numeric | YES |
| cupo_disponible | numeric | YES |
| semaforo | text | YES |
| residentes_convocados | bigint | YES |

## Table: vista_dispositivos_ocupacion
| Column | Type | Nullable |
|--------|------|----------|
| id_dispositivo | integer | YES |
| nombre_dispositivo | character varying | YES |
| piso_dispositivo | integer | YES |
| veces_asignado | bigint | YES |
| agentes_distintos | bigint | YES |
| ultima_asignacion | date | YES |
| frecuencia_uso | text | YES |

## Table: vista_errores_por_componente
| Column | Type | Nullable |
|--------|------|----------|
| component | character varying | YES |
| error_type | character varying | YES |
| total_errores | bigint | YES |
| criticos | bigint | YES |
| altos | bigint | YES |
| resueltos | bigint | YES |
| ultimo_error | timestamp without time zone | YES |
| tasa_resolucion | numeric | YES |

## Table: vista_errores_recientes
| Column | Type | Nullable |
|--------|------|----------|
| id_error | integer | YES |
| timestamp | timestamp without time zone | YES |
| error_type | character varying | YES |
| component | character varying | YES |
| error_message | text | YES |
| severity | character varying | YES |
| resolved | boolean | YES |
| afectado | text | YES |
| user_action | text | YES |
| alerta | text | YES |

## Table: vista_errores_timeline
| Column | Type | Nullable |
|--------|------|----------|
| fecha | date | YES |
| error_type | character varying | YES |
| severity | character varying | YES |
| cantidad | bigint | YES |

## Table: vista_estado_calendario
| Column | Type | Nullable |
|--------|------|----------|
| fecha | date | YES |
| id_turno | integer | YES |
| nombre_turno | character varying | YES |
| dispositivos_configurados | bigint | YES |
| personas_asignadas | bigint | YES |
| estado | text | YES |

## Table: vista_estado_cobertura
| Column | Type | Nullable |
|--------|------|----------|
| id_plani | integer | YES |
| fecha | date | YES |
| anio | integer | YES |
| tipo_turno | character varying | YES |
| solicitados | integer | YES |
| cubiertos | bigint | YES |
| faltantes | bigint | YES |
| estado | text | YES |

## Table: vista_historial_capacitaciones
| Column | Type | Nullable |
|--------|------|----------|
| fecha_capacitacion | date | YES |
| id_dispositivo | integer | YES |
| dispositivo_capacitado | character varying | YES |
| id_agente | integer | YES |
| residente_capacitado | text | YES |
| estado_asistencia | text | YES |

## Table: vista_inasistencias_completa
| Column | Type | Nullable |
|--------|------|----------|
| id_inasistencia | integer | YES |
| id_agente | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| fecha_inasistencia | date | YES |
| anio | integer | YES |
| mes | integer | YES |
| motivo | character varying | YES |
| estado | character varying | YES |
| requiere_certificado | boolean | YES |
| observaciones | text | YES |
| fecha_aviso | timestamp without time zone | YES |

## Table: vista_inasistencias_mes
| Column | Type | Nullable |
|--------|------|----------|
| id_inasistencia | integer | YES |
| id_agente | integer | YES |
| nombre_completo | text | YES |
| fecha_inasistencia | date | YES |
| motivo | character varying | YES |
| estado | character varying | YES |
| requiere_certificado | boolean | YES |
| certificados_presentados | bigint | YES |
| observaciones | text | YES |

## Table: vista_ocupacion
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | YES |
| fecha | date | YES |
| anio | integer | YES |
| id_plani | integer | YES |
| id_turno | integer | YES |

## Table: vista_patrones_errores
| Column | Type | Nullable |
|--------|------|----------|
| id_pattern | integer | YES |
| error_type | character varying | YES |
| component | character varying | YES |
| veces_ocurrido | integer | YES |
| primera_vez | timestamp without time zone | YES |
| ultima_vez | timestamp without time zone | YES |
| dias_activo | numeric | YES |
| severidad_maxima | character varying | YES |
| estado | character varying | YES |
| nivel_urgencia | text | YES |
| resolution_description | text | YES |

## Table: vista_planificacion_anio
| Column | Type | Nullable |
|--------|------|----------|
| id_plani | integer | YES |
| id_dia | integer | YES |
| fecha | date | YES |
| anio | integer | YES |
| mes | integer | YES |
| es_feriado | boolean | YES |
| descripcion_feriado | text | YES |
| id_turno | integer | YES |
| tipo_turno | character varying | YES |
| cant_residentes_plan | integer | YES |
| cant_visit | integer | YES |
| hora_inicio | time without time zone | YES |
| hora_fin | time without time zone | YES |
| cant_horas | numeric | YES |

## Table: vista_planificacion_escuelas
| Column | Type | Nullable |
|--------|------|----------|
| id_convocatoria | integer | YES |
| fecha_convocatoria | date | YES |
| dia_semana | integer | YES |
| id_agente | integer | YES |
| nombre | character varying | YES |
| apellido | character varying | YES |
| tipo_turno | character varying | YES |
| descripcion_turno | text | YES |
| grupo_escuela | character varying | YES |
| estado_coherencia | text | YES |

## Table: vista_saldo_horas_live
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | YES |
| nombre_completo | text | YES |
| cohorte | integer | YES |
| meta_teorica | integer | YES |
| horas_reales | numeric | YES |
| saldo_neto | numeric | YES |

## Table: vista_saldo_horas_resumen
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | YES |
| agente | text | YES |
| cohorte | integer | YES |
| anio | integer | YES |
| mes | integer | YES |
| turnos_cumplidos | bigint | YES |
| horas_mes | numeric | YES |

## Table: vista_saldos_actuales
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | YES |
| nombre_completo | text | YES |
| email | character varying | YES |
| mes | integer | YES |
| anio | integer | YES |
| horas_mes | numeric | YES |
| horas_anuales | numeric | YES |
| fecha_actualizacion | timestamp without time zone | YES |
| nivel_horas | text | YES |

## Table: vista_saldos_resumen
| Column | Type | Nullable |
|--------|------|----------|
| id_agente | integer | YES |
| agente | text | YES |
| anio | integer | YES |
| mes | integer | YES |
| horas_cumplidas | numeric | YES |
| turnos_cancelados | bigint | YES |
| inasistencias_mes | bigint | YES |
| horas_objetivo_mes | numeric | YES |
| saldo_mensual | numeric | YES |
| horas_cumplidas_acumuladas | numeric | YES |
| horas_objetivo_acumuladas | numeric | YES |
| saldo_acumulado | numeric | YES |

## Table: vista_salud_dispositivos
| Column | Type | Nullable |
|--------|------|----------|
| id_dispositivo | integer | YES |
| nombre | character varying | YES |
| piso | text | YES |
| cupo_minimo | integer | YES |
| total_capacitados | bigint | YES |
| coeficiente_robustez | numeric | YES |

## Table: vista_salud_sistema
| Column | Type | Nullable |
|--------|------|----------|
| errores_24h | bigint | YES |
| criticos_pendientes | bigint | YES |
| errores_semana | bigint | YES |
| patrones_activos | bigint | YES |
| componente_problematico | character varying | YES |
| tasa_resolucion_porcentaje | numeric | YES |
| estado_sistema | text | YES |
| fecha_reporte | timestamp with time zone | YES |

## Table: vista_seguimiento_residentes
| Column | Type | Nullable |
|--------|------|----------|
| anio | integer | YES |
| mes | integer | YES |
| id_agente | integer | YES |
| agente | text | YES |
| dni | character varying | YES |
| turnos_totales | numeric | YES |
| horas_totales | numeric | YES |
| tipos_turno_json | jsonb | YES |
| tardanzas | bigint | YES |
| total_inasistencias | bigint | YES |
| inasistencias_salud | bigint | YES |
| inasistencias_estudio | bigint | YES |
| inasistencias_imprevisto | bigint | YES |
