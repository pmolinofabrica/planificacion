-- Definiciones de Vistas (public)

-- ===== VIEW: vista_agentes_capacitados =====
CREATE OR REPLACE VIEW vista_agentes_capacitados AS
 SELECT disp.id_dispositivo,
    disp.nombre_dispositivo,
    dp.id_agente,
    (((dp.nombre)::text || ' '::text) || (dp.apellido)::text) AS nombre_completo,
    cap.tema AS capacitacion,
    cap_part.asistio,
    d.fecha AS fecha_capacitacion,
        CASE
            WHEN (cap_part.asistio = true) THEN 'CAPACITADO'::text
            ELSE 'NO ASISTIÓ'::text
        END AS estado_capacitacion
   FROM (((((dispositivos disp
     JOIN capacitaciones_dispositivos cap_disp ON ((disp.id_dispositivo = cap_disp.id_dispositivo)))
     JOIN capacitaciones cap ON ((cap_disp.id_cap = cap.id_cap)))
     JOIN capacitaciones_participantes cap_part ON ((cap.id_cap = cap_part.id_cap)))
     JOIN datos_personales dp ON ((cap_part.id_agente = dp.id_agente)))
     JOIN dias d ON ((cap.id_dia = d.id_dia)))
  WHERE (dp.activo = true)
  ORDER BY disp.nombre_dispositivo, dp.apellido;;

-- ===== VIEW: vista_cambios_pendientes =====
CREATE OR REPLACE VIEW vista_cambios_pendientes AS
 SELECT ct.id_transaccion,
    ct.fecha_solicitud,
    (((dp_ini.nombre)::text || ' '::text) || (dp_ini.apellido)::text) AS agente_iniciador,
    ct.tipo_transaccion,
    ct.estado,
    count(ctd.id_detalle) AS cantidad_cambios,
    ct.observaciones
   FROM ((cambio_transaccion ct
     JOIN datos_personales dp_ini ON ((ct.agente_iniciador = dp_ini.id_agente)))
     LEFT JOIN cambio_transaccion_detalle ctd ON ((ct.id_transaccion = ctd.id_transaccion)))
  WHERE ((ct.estado)::text = ANY ((ARRAY['pendiente'::character varying, 'validada'::character varying])::text[]))
  GROUP BY ct.id_transaccion, ct.fecha_solicitud, dp_ini.nombre, dp_ini.apellido, ct.tipo_transaccion, ct.estado, ct.observaciones
  ORDER BY ct.fecha_solicitud DESC;;

-- ===== VIEW: vista_cambios_turno =====
CREATE OR REPLACE VIEW vista_cambios_turno AS
 SELECT c_nuevo.id_convocatoria AS id_nuevo,
    c_nuevo.id_convocatoria_origen AS id_original,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    dp.dni,
    d_orig.fecha AS fecha_original,
    t_orig.tipo_turno AS turno_tipo_original,
    c_orig.estado AS estado_original,
    d_nuevo.fecha AS fecha_nueva,
    t_nuevo.tipo_turno AS turno_tipo_nuevo,
    c_nuevo.estado AS estado_nuevo,
    c_nuevo.motivo_cambio,
    c_nuevo.fecha_registro,
    c_nuevo.usuario_modificacion
   FROM ((((((((convocatoria c_nuevo
     JOIN convocatoria c_orig ON ((c_nuevo.id_convocatoria_origen = c_orig.id_convocatoria)))
     JOIN datos_personales dp ON ((c_nuevo.id_agente = dp.id_agente)))
     JOIN planificacion p_nuevo ON ((c_nuevo.id_plani = p_nuevo.id_plani)))
     JOIN planificacion p_orig ON ((c_orig.id_plani = p_orig.id_plani)))
     JOIN dias d_nuevo ON ((p_nuevo.id_dia = d_nuevo.id_dia)))
     JOIN dias d_orig ON ((p_orig.id_dia = d_orig.id_dia)))
     JOIN turnos t_nuevo ON ((c_nuevo.id_turno = t_nuevo.id_turno)))
     JOIN turnos t_orig ON ((c_orig.id_turno = t_orig.id_turno)))
  WHERE (c_nuevo.id_convocatoria_origen IS NOT NULL)
  ORDER BY c_nuevo.fecha_registro DESC;;

-- ===== VIEW: vista_certificados_completa =====
CREATE OR REPLACE VIEW vista_certificados_completa AS
 SELECT c.id_certificado,
    c.id_inasistencia,
    c.id_agente,
    (((p.apellido)::text || ', '::text) || (p.nombre)::text) AS agente,
    p.dni,
    c.fecha_carga AS fecha_entrega_certificado,
    c.fecha_inasistencia_justifica,
    c.tipo_certificado,
    c.estado_certificado,
    c.observaciones
   FROM (certificados c
     JOIN datos_personales p ON ((c.id_agente = p.id_agente)));;

-- ===== VIEW: vista_convocatoria_completa =====
CREATE OR REPLACE VIEW vista_convocatoria_completa AS
 SELECT c.id_convocatoria,
    c.id_plani,
    c.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    dp.dni,
    d.fecha AS fecha_turno,
    (EXTRACT(year FROM d.fecha))::integer AS anio,
    (EXTRACT(month FROM d.fecha))::integer AS mes,
    t.tipo_turno,
    t.id_turno,
    c.estado,
    c.turno_cancelado,
    c.motivo_cambio,
    p.cant_horas
   FROM ((((convocatoria c
     JOIN planificacion p ON ((c.id_plani = p.id_plani)))
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN datos_personales dp ON ((c.id_agente = dp.id_agente)))
     JOIN turnos t ON ((c.id_turno = t.id_turno)));;

-- ===== VIEW: vista_convocatoria_mes_activo =====
CREATE OR REPLACE VIEW vista_convocatoria_mes_activo AS
 SELECT c.id_convocatoria,
    c.id_plani,
    c.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    dp.dni,
    d.fecha AS fecha_turno,
    (EXTRACT(year FROM d.fecha))::integer AS anio,
    (EXTRACT(month FROM d.fecha))::integer AS mes,
    t.tipo_turno,
    t.id_turno,
    c.estado,
    c.turno_cancelado,
    c.motivo_cambio,
    p.cant_horas
   FROM ((((convocatoria c
     JOIN planificacion p ON ((c.id_plani = p.id_plani)))
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN datos_personales dp ON ((c.id_agente = dp.id_agente)))
     JOIN turnos t ON ((c.id_turno = t.id_turno)))
  WHERE ((d.fecha >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) AND (d.fecha < (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval)));;

-- ===== VIEW: vista_dashboard_inasistencias =====
CREATE OR REPLACE VIEW vista_dashboard_inasistencias AS
 SELECT EXTRACT(year FROM fecha_inasistencia) AS anio,
    EXTRACT(month FROM fecha_inasistencia) AS mes,
    motivo,
    estado,
    count(*) AS total
   FROM inasistencias
  GROUP BY (EXTRACT(year FROM fecha_inasistencia)), (EXTRACT(month FROM fecha_inasistencia)), motivo, estado;;

-- ===== VIEW: vista_demanda_planificada =====
CREATE OR REPLACE VIEW vista_demanda_planificada AS
 SELECT d.fecha,
    p.id_turno,
    t.tipo_turno AS nombre_turno,
    p.cant_residentes_plan AS cantidad_personas,
    p.plani_notas AS notas
   FROM ((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)));;

-- ===== VIEW: vista_disponibilidad_visitas =====
CREATE OR REPLACE VIEW vista_disponibilidad_visitas AS
 SELECT p.id_plani,
    d.fecha,
    d.mes,
    d.anio,
    d.numero_dia_semana,
    t.id_turno,
    t.tipo_turno,
    t.hora_inicio,
    t.hora_fin,
    120 AS cupo_total,
    COALESCE(sum(
        CASE
            WHEN ((av.estado)::text = ANY (ARRAY[('asignado'::character varying)::text, ('confirmado'::character varying)::text])) THEN av.cupo_calculado
            ELSE (0)::numeric
        END), (0)::numeric) AS cupo_ocupado_firme,
    COALESCE(sum(
        CASE
            WHEN ((av.estado)::text = 'en_espera'::text) THEN av.cupo_calculado
            ELSE (0)::numeric
        END), (0)::numeric) AS cupo_en_espera,
    ((120)::numeric - COALESCE(sum(
        CASE
            WHEN ((av.estado)::text = ANY (ARRAY[('asignado'::character varying)::text, ('confirmado'::character varying)::text])) THEN av.cupo_calculado
            ELSE (0)::numeric
        END), (0)::numeric)) AS cupo_disponible,
        CASE
            WHEN (((120)::numeric - COALESCE(sum(
            CASE
                WHEN ((av.estado)::text = ANY (ARRAY[('asignado'::character varying)::text, ('confirmado'::character varying)::text])) THEN av.cupo_calculado
                ELSE (0)::numeric
            END), (0)::numeric)) > (15)::numeric) THEN 'verde'::text
            WHEN (((120)::numeric - COALESCE(sum(
            CASE
                WHEN ((av.estado)::text = ANY (ARRAY[('asignado'::character varying)::text, ('confirmado'::character varying)::text])) THEN av.cupo_calculado
                ELSE (0)::numeric
            END), (0)::numeric)) >= ('-15'::integer)::numeric) THEN 'amarillo'::text
            ELSE 'rojo'::text
        END AS semaforo,
    ( SELECT count(*) AS count
           FROM convocatoria c
          WHERE ((c.id_plani = p.id_plani) AND ((c.estado)::text = 'vigente'::text))) AS residentes_convocados
   FROM (((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)))
     LEFT JOIN asignaciones_visita av ON (((av.id_plani = p.id_plani) AND ((av.estado)::text <> ALL (ARRAY[('cancelado'::character varying)::text, ('duplicado'::character varying)::text])))))
  WHERE (t.id_turno = ANY (ARRAY[3, 4]))
  GROUP BY p.id_plani, d.fecha, d.mes, d.anio, d.numero_dia_semana, t.id_turno, t.tipo_turno, t.hora_inicio, t.hora_fin;;

-- ===== VIEW: vista_dispositivos_ocupacion =====
CREATE OR REPLACE VIEW vista_dispositivos_ocupacion AS
 SELECT disp.id_dispositivo,
    disp.nombre_dispositivo,
    disp.piso_dispositivo,
    count(DISTINCT m.id_menu) AS veces_asignado,
    count(DISTINCT m.id_agente) AS agentes_distintos,
    max(m.fecha_asignacion) AS ultima_asignacion,
        CASE
            WHEN (count(DISTINCT m.id_menu) >= 20) THEN 'ALTA'::text
            WHEN (count(DISTINCT m.id_menu) >= 10) THEN 'MEDIA'::text
            ELSE 'BAJA'::text
        END AS frecuencia_uso
   FROM (dispositivos disp
     LEFT JOIN menu m ON (((disp.id_dispositivo = m.id_dispositivo) AND (m.fecha_asignacion >= (CURRENT_DATE - '30 days'::interval)))))
  WHERE (disp.activo = true)
  GROUP BY disp.id_dispositivo
  ORDER BY (count(DISTINCT m.id_menu)) DESC;;

-- ===== VIEW: vista_errores_por_componente =====
CREATE OR REPLACE VIEW vista_errores_por_componente AS
 SELECT component,
    error_type,
    count(*) AS total_errores,
    sum(
        CASE
            WHEN ((severity)::text = 'critical'::text) THEN 1
            ELSE 0
        END) AS criticos,
    sum(
        CASE
            WHEN ((severity)::text = 'high'::text) THEN 1
            ELSE 0
        END) AS altos,
    sum(
        CASE
            WHEN (resolved = true) THEN 1
            ELSE 0
        END) AS resueltos,
    max("timestamp") AS ultimo_error,
    round((((sum(
        CASE
            WHEN (resolved = true) THEN 1
            ELSE 0
        END))::numeric / (count(*))::numeric) * (100)::numeric), 2) AS tasa_resolucion
   FROM system_errors
  WHERE ("timestamp" >= (CURRENT_TIMESTAMP - '30 days'::interval))
  GROUP BY component, error_type
 HAVING (count(*) > 0)
  ORDER BY (count(*)) DESC;;

-- ===== VIEW: vista_errores_recientes =====
CREATE OR REPLACE VIEW vista_errores_recientes AS
 SELECT e.id_error,
    e."timestamp",
    e.error_type,
    e.component,
    e.error_message,
    e.severity,
    e.resolved,
        CASE
            WHEN (e.id_agente IS NOT NULL) THEN (((dp.nombre)::text || ' '::text) || (dp.apellido)::text)
            ELSE 'Sistema'::text
        END AS afectado,
    e.user_action,
        CASE
            WHEN (e.is_recurring = true) THEN '⚠️ RECURRENTE'::text
            ELSE ''::text
        END AS alerta
   FROM (system_errors e
     LEFT JOIN datos_personales dp ON ((e.id_agente = dp.id_agente)))
  WHERE (e."timestamp" >= (CURRENT_TIMESTAMP - '7 days'::interval))
  ORDER BY e."timestamp" DESC, e.severity DESC;;

-- ===== VIEW: vista_errores_timeline =====
CREATE OR REPLACE VIEW vista_errores_timeline AS
 SELECT date("timestamp") AS fecha,
    error_type,
    severity,
    count(*) AS cantidad
   FROM system_errors
  WHERE ("timestamp" >= (CURRENT_TIMESTAMP - '30 days'::interval))
  GROUP BY (date("timestamp")), error_type, severity
  ORDER BY (date("timestamp")) DESC, (count(*)) DESC;;

-- ===== VIEW: vista_estado_calendario =====
CREATE OR REPLACE VIEW vista_estado_calendario AS
 SELECT d.fecha,
    p.id_turno,
    t.tipo_turno AS nombre_turno,
    count(DISTINCT c.id_dispositivo) AS dispositivos_configurados,
    count(DISTINCT a.id) AS personas_asignadas,
        CASE
            WHEN (count(DISTINCT a.id) > 0) THEN 'ASIGNADO'::text
            WHEN (count(DISTINCT c.id_dispositivo) > 0) THEN 'CONFIGURADO'::text
            ELSE 'PENDIENTE'::text
        END AS estado
   FROM ((((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)))
     LEFT JOIN calendario_dispositivos c ON (((d.fecha = c.fecha) AND (p.id_turno = c.id_turno))))
     LEFT JOIN asignaciones a ON (((d.fecha = a.fecha) AND (p.id_turno = a.id_turno))))
  GROUP BY d.fecha, p.id_turno, t.tipo_turno
  ORDER BY d.fecha DESC, p.id_turno;;

-- ===== VIEW: vista_estado_cobertura =====
CREATE OR REPLACE VIEW vista_estado_cobertura AS
 SELECT p.id_plani,
    d.fecha,
    d.anio,
    t.tipo_turno,
    p.cant_residentes_plan AS solicitados,
    count(c.id_convocatoria) AS cubiertos,
    (p.cant_residentes_plan - count(c.id_convocatoria)) AS faltantes,
        CASE
            WHEN (count(c.id_convocatoria) = p.cant_residentes_plan) THEN 'COMPLETO'::text
            WHEN (count(c.id_convocatoria) > p.cant_residentes_plan) THEN 'EXCEDIDO'::text
            WHEN (count(c.id_convocatoria) = 0) THEN 'VACÍO'::text
            ELSE 'PARCIAL'::text
        END AS estado
   FROM (((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)))
     LEFT JOIN convocatoria c ON ((p.id_plani = c.id_plani)))
  GROUP BY p.id_plani, d.fecha, d.anio, t.tipo_turno, p.cant_residentes_plan
  ORDER BY d.fecha, t.tipo_turno;;

-- ===== VIEW: vista_historial_capacitaciones =====
CREATE OR REPLACE VIEW vista_historial_capacitaciones AS
 SELECT d.fecha AS fecha_capacitacion,
    disp.id_dispositivo,
    disp.nombre_dispositivo AS dispositivo_capacitado,
    dp.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS residente_capacitado,
        CASE
            WHEN (cp.asistio = true) THEN 'Sí'::text
            WHEN (cp.asistio = false) THEN 'No'::text
            ELSE 'Pendiente'::text
        END AS estado_asistencia
   FROM (((((capacitaciones c
     JOIN dias d ON ((c.id_dia = d.id_dia)))
     JOIN capacitaciones_dispositivos cd ON ((c.id_cap = cd.id_cap)))
     JOIN dispositivos disp ON ((cd.id_dispositivo = disp.id_dispositivo)))
     JOIN capacitaciones_participantes cp ON ((c.id_cap = cp.id_cap)))
     JOIN datos_personales dp ON ((cp.id_agente = dp.id_agente)))
  ORDER BY d.fecha DESC, disp.nombre_dispositivo, dp.apellido;;

-- ===== VIEW: vista_inasistencias_completa =====
CREATE OR REPLACE VIEW vista_inasistencias_completa AS
 SELECT i.id_inasistencia,
    i.id_agente,
    (((p.apellido)::text || ', '::text) || (p.nombre)::text) AS agente,
    p.dni,
    i.fecha_inasistencia,
    (EXTRACT(year FROM i.fecha_inasistencia))::integer AS anio,
    (EXTRACT(month FROM i.fecha_inasistencia))::integer AS mes,
    i.motivo,
    i.estado,
    i.requiere_certificado,
    i.observaciones,
    i.fecha_aviso
   FROM (inasistencias i
     JOIN datos_personales p ON ((i.id_agente = p.id_agente)));;

-- ===== VIEW: vista_inasistencias_mes =====
CREATE OR REPLACE VIEW vista_inasistencias_mes AS
 SELECT inas.id_inasistencia,
    dp.id_agente,
    (((dp.nombre)::text || ' '::text) || (dp.apellido)::text) AS nombre_completo,
    inas.fecha_inasistencia,
    inas.motivo,
    inas.estado,
    inas.requiere_certificado,
        CASE
            WHEN (inas.requiere_certificado = true) THEN ( SELECT count(*) AS count
               FROM certificados
              WHERE ((certificados.id_inasistencia = inas.id_inasistencia) AND ((certificados.estado_certificado)::text = 'presentado'::text)))
            ELSE NULL::bigint
        END AS certificados_presentados,
    inas.observaciones
   FROM (inasistencias inas
     JOIN datos_personales dp ON ((inas.id_agente = dp.id_agente)))
  WHERE (to_char((inas.fecha_inasistencia)::timestamp with time zone, 'YYYY-MM'::text) = to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM'::text))
  ORDER BY inas.fecha_inasistencia DESC;;

-- ===== VIEW: vista_ocupacion =====
CREATE OR REPLACE VIEW vista_ocupacion AS
 SELECT c.id_agente,
    d.fecha,
    d.anio,
    p.id_plani,
    p.id_turno
   FROM ((convocatoria c
     JOIN planificacion p ON ((c.id_plani = p.id_plani)))
     JOIN dias d ON ((p.id_dia = d.id_dia)));;

-- ===== VIEW: vista_patrones_errores =====
CREATE OR REPLACE VIEW vista_patrones_errores AS
 SELECT id_pattern,
    error_type,
    component,
    occurrence_count AS veces_ocurrido,
    first_occurrence AS primera_vez,
    last_occurrence AS ultima_vez,
    round((EXTRACT(epoch FROM (CURRENT_TIMESTAMP - (first_occurrence)::timestamp with time zone)) / 86400.0), 1) AS dias_activo,
    severity_max AS severidad_maxima,
    pattern_status AS estado,
        CASE
            WHEN (occurrence_count >= 10) THEN '🔴 CRÍTICO'::text
            WHEN (occurrence_count >= 5) THEN '🟡 ATENCIÓN'::text
            ELSE '🟢 BAJO'::text
        END AS nivel_urgencia,
    resolution_description
   FROM error_patterns p
  WHERE ((pattern_status)::text = ANY ((ARRAY['active'::character varying, 'investigating'::character varying])::text[]))
  ORDER BY occurrence_count DESC, last_occurrence DESC;;

-- ===== VIEW: vista_planificacion_anio =====
CREATE OR REPLACE VIEW vista_planificacion_anio AS
 SELECT p.id_plani,
    p.id_dia,
    d.fecha,
    (EXTRACT(year FROM d.fecha))::integer AS anio,
    (EXTRACT(month FROM d.fecha))::integer AS mes,
    d.es_feriado,
    d.descripcion_feriado,
    p.id_turno,
    t.tipo_turno,
    p.cant_residentes_plan,
    p.cant_visit,
    p.hora_inicio,
    p.hora_fin,
    p.cant_horas
   FROM ((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)));;

-- ===== VIEW: vista_planificacion_escuelas =====
CREATE OR REPLACE VIEW vista_planificacion_escuelas AS
 SELECT c.id_convocatoria,
    c.fecha_convocatoria,
    (EXTRACT(isodow FROM c.fecha_convocatoria))::integer AS dia_semana,
    dp.id_agente,
    dp.nombre,
    dp.apellido,
    t.tipo_turno,
    t.descripcion AS descripcion_turno,
    COALESCE(agd.grupo, 'sin_asignar'::character varying) AS grupo_escuela,
        CASE
            WHEN (((agd.grupo)::text = 'manana'::text) AND (lower(t.descripcion) ~~ '%tarde%'::text)) THEN 'ALERTA: Grupo Mañana en Turno Tarde'::text
            WHEN (((agd.grupo)::text = 'tarde'::text) AND (lower(t.descripcion) ~~ '%mañana%'::text)) THEN 'ALERTA: Grupo Tarde en Turno Mañana'::text
            WHEN (agd.grupo IS NULL) THEN 'Sin grupo asignado ese día'::text
            ELSE 'OK'::text
        END AS estado_coherencia
   FROM (((convocatoria c
     JOIN datos_personales dp ON ((c.id_agente = dp.id_agente)))
     LEFT JOIN turnos t ON ((c.id_turno = t.id_turno)))
     LEFT JOIN agentes_grupos_dias agd ON (((c.id_agente = agd.id_agente) AND ((EXTRACT(isodow FROM c.fecha_convocatoria))::integer = agd.dia_semana))))
  WHERE ((EXTRACT(isodow FROM c.fecha_convocatoria) = ANY (ARRAY[(4)::numeric, (5)::numeric])) AND ((c.estado)::text = ANY ((ARRAY['vigente'::character varying, 'confirmada'::character varying])::text[])));;

-- ===== VIEW: vista_saldo_horas_live =====
CREATE OR REPLACE VIEW vista_saldo_horas_live AS
 SELECT dp.id_agente,
    COALESCE((((dp.apellido)::text || ', '::text) || (dp.nombre)::text), (dp.nombre)::text, 'Sin Nombre'::text) AS nombre_completo,
    dp.cohorte,
    (((EXTRACT(day FROM (now() - ((c.fecha_inicio)::timestamp without time zone)::timestamp with time zone)) / (7)::numeric))::integer * c.horas_semanales_meta) AS meta_teorica,
    ((COALESCE(( SELECT (count(*) * 4)
           FROM convocatoria co
          WHERE ((co.id_agente = dp.id_agente) AND ((co.estado)::text = 'cumplida'::text) AND (co.turno_cancelado = false))), (0)::bigint))::numeric + COALESCE(( SELECT sum(ah.horas_delta) AS sum
           FROM ajustes_horas ah
          WHERE (ah.id_agente = dp.id_agente)), (0)::numeric)) AS horas_reales,
    (((COALESCE(( SELECT (count(*) * 4)
           FROM convocatoria co
          WHERE ((co.id_agente = dp.id_agente) AND ((co.estado)::text = 'cumplida'::text) AND (co.turno_cancelado = false))), (0)::bigint))::numeric + COALESCE(( SELECT sum(ah.horas_delta) AS sum
           FROM ajustes_horas ah
          WHERE (ah.id_agente = dp.id_agente)), (0)::numeric)) - ((((EXTRACT(day FROM (now() - ((c.fecha_inicio)::timestamp without time zone)::timestamp with time zone)) / (7)::numeric))::integer * c.horas_semanales_meta))::numeric) AS saldo_neto
   FROM (datos_personales dp
     JOIN config_ciclo_lectivo c ON ((dp.cohorte = c.anio)))
  WHERE (dp.activo = true);;

-- ===== VIEW: vista_saldo_horas_resumen =====
CREATE OR REPLACE VIEW vista_saldo_horas_resumen AS
 SELECT c.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    dp.cohorte,
    (EXTRACT(year FROM d.fecha))::integer AS anio,
    (EXTRACT(month FROM d.fecha))::integer AS mes,
    count(*) AS turnos_cumplidos,
    sum(p.cant_horas) AS horas_mes
   FROM (((convocatoria c
     JOIN planificacion p ON ((c.id_plani = p.id_plani)))
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN datos_personales dp ON ((c.id_agente = dp.id_agente)))
  WHERE ((c.turno_cancelado IS NULL) OR (c.turno_cancelado = false))
  GROUP BY c.id_agente, dp.apellido, dp.nombre, dp.cohorte, (EXTRACT(year FROM d.fecha)), (EXTRACT(month FROM d.fecha))
  ORDER BY ((EXTRACT(year FROM d.fecha))::integer), ((EXTRACT(month FROM d.fecha))::integer), (((dp.apellido)::text || ', '::text) || (dp.nombre)::text);;

-- ===== VIEW: vista_saldos_actuales =====
CREATE OR REPLACE VIEW vista_saldos_actuales AS
 SELECT s.id_agente,
    (((dp.nombre)::text || ' '::text) || (dp.apellido)::text) AS nombre_completo,
    dp.email,
    s.mes,
    s.anio,
    s.horas_mes,
    s.horas_anuales,
    s.fecha_actualizacion,
        CASE
            WHEN (s.horas_mes < (( SELECT (configuracion.valor)::integer AS valor
               FROM configuracion
              WHERE ((configuracion.clave)::text = 'horas_minimas_mes'::text)))::numeric) THEN 'BAJO'::text
            WHEN (s.horas_mes >= ((( SELECT (configuracion.valor)::integer AS valor
               FROM configuracion
              WHERE ((configuracion.clave)::text = 'horas_minimas_mes'::text)))::numeric * 1.5)) THEN 'ALTO'::text
            ELSE 'NORMAL'::text
        END AS nivel_horas
   FROM (saldos s
     JOIN datos_personales dp ON ((s.id_agente = dp.id_agente)))
  WHERE (dp.activo = true)
  ORDER BY s.anio DESC, s.mes DESC, dp.apellido;;

-- ===== VIEW: vista_saldos_resumen =====
CREATE OR REPLACE VIEW vista_saldos_resumen AS
 WITH cohorte_info AS (
         SELECT config_cohorte.anio,
            config_cohorte.fecha_inicio,
            config_cohorte.fecha_fin,
            config_cohorte.horas_semanales_requeridas,
            config_cohorte.activo,
            config_cohorte.created_at
           FROM config_cohorte
          WHERE (config_cohorte.activo = true)
         LIMIT 1
        ), agente_cronograma AS (
         SELECT dp.id_agente,
            dp.apellido,
            dp.nombre,
            dp.fecha_alta,
            dp.fecha_baja,
            ci.anio,
            ci.horas_semanales_requeridas,
            GREATEST((ci.fecha_inicio)::timestamp without time zone, COALESCE(dp.fecha_alta, (ci.fecha_inicio)::timestamp without time zone)) AS fecha_inicio_efectiva,
            LEAST((ci.fecha_fin)::timestamp without time zone, COALESCE(dp.fecha_baja, (ci.fecha_fin)::timestamp without time zone)) AS fecha_fin_efectiva
           FROM (datos_personales dp
             CROSS JOIN cohorte_info ci)
          WHERE ((dp.activo = true) OR (dp.fecha_baja >= ci.fecha_inicio))
        ), meses_calculo AS (
         SELECT generate_series(1, 12) AS mes
        ), horas_trabajadas AS (
         SELECT c.id_agente,
            EXTRACT(month FROM d.fecha) AS mes,
            EXTRACT(year FROM d.fecha) AS anio,
            sum(p.cant_horas) AS horas_cumplidas,
            count(
                CASE
                    WHEN c.turno_cancelado THEN 1
                    ELSE NULL::integer
                END) AS turnos_cancelados
           FROM ((convocatoria c
             JOIN planificacion p ON ((c.id_plani = p.id_plani)))
             JOIN dias d ON ((p.id_dia = d.id_dia)))
          WHERE (c.turno_cancelado IS FALSE)
          GROUP BY c.id_agente, (EXTRACT(month FROM d.fecha)), (EXTRACT(year FROM d.fecha))
        ), inasistencias_count AS (
         SELECT inasistencias.id_agente,
            EXTRACT(month FROM inasistencias.fecha_inasistencia) AS mes,
            EXTRACT(year FROM inasistencias.fecha_inasistencia) AS anio,
            count(*) AS total_inasistencias
           FROM inasistencias
          GROUP BY inasistencias.id_agente, (EXTRACT(month FROM inasistencias.fecha_inasistencia)), (EXTRACT(year FROM inasistencias.fecha_inasistencia))
        )
 SELECT ac.id_agente,
    (((ac.apellido)::text || ', '::text) || (ac.nombre)::text) AS agente,
    ac.anio,
    mc.mes,
    COALESCE(ht.horas_cumplidas, (0)::numeric) AS horas_cumplidas,
    COALESCE(ht.turnos_cancelados, (0)::bigint) AS turnos_cancelados,
    COALESCE(ic.total_inasistencias, (0)::bigint) AS inasistencias_mes,
    round(
        CASE
            WHEN (make_date(ac.anio, mc.mes, 1) > ac.fecha_fin_efectiva) THEN (0)::numeric
            WHEN ((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date < ac.fecha_inicio_efectiva) THEN (0)::numeric
            ELSE (((((LEAST((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date, (ac.fecha_fin_efectiva)::date) - GREATEST(make_date(ac.anio, mc.mes, 1), (ac.fecha_inicio_efectiva)::date)) + 1))::numeric / 7.0) * (ac.horas_semanales_requeridas)::numeric)
        END, 1) AS horas_objetivo_mes,
    (COALESCE(ht.horas_cumplidas, (0)::numeric) - round(
        CASE
            WHEN (make_date(ac.anio, mc.mes, 1) > ac.fecha_fin_efectiva) THEN (0)::numeric
            WHEN ((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date < ac.fecha_inicio_efectiva) THEN (0)::numeric
            ELSE (((((LEAST((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date, (ac.fecha_fin_efectiva)::date) - GREATEST(make_date(ac.anio, mc.mes, 1), (ac.fecha_inicio_efectiva)::date)) + 1))::numeric / 7.0) * (ac.horas_semanales_requeridas)::numeric)
        END, 1)) AS saldo_mensual,
    sum(COALESCE(ht.horas_cumplidas, (0)::numeric)) OVER (PARTITION BY ac.id_agente ORDER BY mc.mes) AS horas_cumplidas_acumuladas,
    sum(round(
        CASE
            WHEN (make_date(ac.anio, mc.mes, 1) > ac.fecha_fin_efectiva) THEN (0)::numeric
            WHEN ((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date < ac.fecha_inicio_efectiva) THEN (0)::numeric
            ELSE (((((LEAST((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date, (ac.fecha_fin_efectiva)::date) - GREATEST(make_date(ac.anio, mc.mes, 1), (ac.fecha_inicio_efectiva)::date)) + 1))::numeric / 7.0) * (ac.horas_semanales_requeridas)::numeric)
        END, 1)) OVER (PARTITION BY ac.id_agente ORDER BY mc.mes) AS horas_objetivo_acumuladas,
    (sum(COALESCE(ht.horas_cumplidas, (0)::numeric)) OVER (PARTITION BY ac.id_agente ORDER BY mc.mes) - sum(round(
        CASE
            WHEN (make_date(ac.anio, mc.mes, 1) > ac.fecha_fin_efectiva) THEN (0)::numeric
            WHEN ((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date < ac.fecha_inicio_efectiva) THEN (0)::numeric
            ELSE (((((LEAST((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date, (ac.fecha_fin_efectiva)::date) - GREATEST(make_date(ac.anio, mc.mes, 1), (ac.fecha_inicio_efectiva)::date)) + 1))::numeric / 7.0) * (ac.horas_semanales_requeridas)::numeric)
        END, 1)) OVER (PARTITION BY ac.id_agente ORDER BY mc.mes)) AS saldo_acumulado
   FROM (((agente_cronograma ac
     CROSS JOIN meses_calculo mc)
     LEFT JOIN horas_trabajadas ht ON (((ac.id_agente = ht.id_agente) AND ((ac.anio)::numeric = ht.anio) AND ((mc.mes)::numeric = ht.mes))))
     LEFT JOIN inasistencias_count ic ON (((ac.id_agente = ic.id_agente) AND ((ac.anio)::numeric = ic.anio) AND ((mc.mes)::numeric = ic.mes))))
  WHERE ((make_date(ac.anio, mc.mes, 1) <= ac.fecha_fin_efectiva) AND ((((make_date(ac.anio, mc.mes, 1) + '1 mon'::interval) - '1 day'::interval))::date >= ac.fecha_inicio_efectiva))
  ORDER BY ac.id_agente, mc.mes;;

-- ===== VIEW: vista_salud_dispositivos =====
CREATE OR REPLACE VIEW vista_salud_dispositivos AS
 SELECT d.id_dispositivo,
    d.nombre_dispositivo AS nombre,
    (d.piso_dispositivo)::text AS piso,
    d.cupo_minimo,
    count(DISTINCT cp.id_agente) AS total_capacitados,
    round(((count(DISTINCT cp.id_agente))::numeric / (NULLIF(d.cupo_minimo, 0))::numeric), 2) AS coeficiente_robustez
   FROM ((dispositivos d
     LEFT JOIN capacitaciones_dispositivos cd ON ((d.id_dispositivo = cd.id_dispositivo)))
     LEFT JOIN capacitaciones_participantes cp ON ((cd.id_cap = cp.id_cap)))
  WHERE (d.activo = true)
  GROUP BY d.id_dispositivo, d.nombre_dispositivo, d.piso_dispositivo, d.cupo_minimo;;

-- ===== VIEW: vista_salud_sistema =====
CREATE OR REPLACE VIEW vista_salud_sistema AS
 SELECT ( SELECT count(*) AS count
           FROM system_errors
          WHERE (system_errors."timestamp" >= (CURRENT_TIMESTAMP - '1 day'::interval))) AS errores_24h,
    ( SELECT count(*) AS count
           FROM system_errors
          WHERE (((system_errors.severity)::text = 'critical'::text) AND (system_errors.resolved = false))) AS criticos_pendientes,
    ( SELECT count(*) AS count
           FROM system_errors
          WHERE (system_errors."timestamp" >= (CURRENT_TIMESTAMP - '7 days'::interval))) AS errores_semana,
    ( SELECT count(*) AS count
           FROM error_patterns
          WHERE (((error_patterns.pattern_status)::text = 'active'::text) AND (error_patterns.occurrence_count >= 3))) AS patrones_activos,
    ( SELECT system_errors.component
           FROM system_errors
          WHERE (system_errors."timestamp" >= (CURRENT_TIMESTAMP - '7 days'::interval))
          GROUP BY system_errors.component
          ORDER BY (count(*)) DESC
         LIMIT 1) AS componente_problematico,
    round((((( SELECT count(*) AS count
           FROM system_errors
          WHERE (system_errors.resolved = true)))::numeric / (NULLIF(( SELECT count(*) AS count
           FROM system_errors), 0))::numeric) * (100)::numeric), 2) AS tasa_resolucion_porcentaje,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM system_errors
              WHERE (((system_errors.severity)::text = 'critical'::text) AND (system_errors.resolved = false))) > 0) THEN '🔴 CRÍTICO'::text
            WHEN (( SELECT count(*) AS count
               FROM system_errors
              WHERE (system_errors."timestamp" >= (CURRENT_TIMESTAMP - '1 day'::interval))) > 10) THEN '🟡 ATENCIÓN'::text
            WHEN (( SELECT count(*) AS count
               FROM error_patterns
              WHERE (((error_patterns.pattern_status)::text = 'active'::text) AND (error_patterns.occurrence_count >= 5))) > 0) THEN '🟡 ATENCIÓN'::text
            ELSE '🟢 SALUDABLE'::text
        END AS estado_sistema,
    CURRENT_TIMESTAMP AS fecha_reporte;;

-- ===== VIEW: vista_seguimiento_residentes =====
CREATE OR REPLACE VIEW vista_seguimiento_residentes AS
 WITH cohorte_info AS (
         SELECT config_cohorte.anio,
            config_cohorte.fecha_inicio,
            config_cohorte.fecha_fin,
            config_cohorte.horas_semanales_requeridas,
            config_cohorte.activo,
            config_cohorte.created_at
           FROM config_cohorte
          WHERE (config_cohorte.activo = true)
         LIMIT 1
        ), convocatorias_base AS (
         SELECT c.id_convocatoria,
            c.id_agente,
            (EXTRACT(year FROM d.fecha))::integer AS anio,
            (EXTRACT(month FROM d.fecha))::integer AS mes,
            p.cant_horas,
            COALESCE(t.tipo_turno, 'Sin Asignar'::character varying) AS tipo_turno
           FROM (((convocatoria c
             JOIN planificacion p ON ((c.id_plani = p.id_plani)))
             JOIN dias d ON ((p.id_dia = d.id_dia)))
             LEFT JOIN turnos t ON ((c.id_turno = t.id_turno)))
          WHERE ((c.turno_cancelado IS FALSE) AND (EXTRACT(year FROM d.fecha) = (( SELECT cohorte_info.anio
                   FROM cohorte_info))::numeric))
        ), turnos_por_tipo AS (
         SELECT convocatorias_base.id_agente,
            convocatorias_base.anio,
            convocatorias_base.mes,
            convocatorias_base.tipo_turno,
            count(*) AS cnt,
            sum(convocatorias_base.cant_horas) AS horas_tipo
           FROM convocatorias_base
          GROUP BY convocatorias_base.id_agente, convocatorias_base.anio, convocatorias_base.mes, convocatorias_base.tipo_turno
        ), resumen_agrupado AS (
         SELECT turnos_por_tipo.id_agente,
            turnos_por_tipo.anio,
            turnos_por_tipo.mes,
            sum(turnos_por_tipo.cnt) FILTER (WHERE ((turnos_por_tipo.tipo_turno)::text <> ALL ((ARRAY['descanso'::character varying, 'Descanso'::character varying])::text[]))) AS turnos_totales,
            sum(turnos_por_tipo.horas_tipo) FILTER (WHERE ((turnos_por_tipo.tipo_turno)::text <> ALL ((ARRAY['descanso'::character varying, 'Descanso'::character varying])::text[]))) AS horas_totales,
            jsonb_object_agg(turnos_por_tipo.tipo_turno, turnos_por_tipo.cnt) AS tipos_turno_json
           FROM turnos_por_tipo
          GROUP BY turnos_por_tipo.id_agente, turnos_por_tipo.anio, turnos_por_tipo.mes
        ), inasistencias_resumen AS (
         SELECT inasistencias.id_agente,
            (EXTRACT(year FROM inasistencias.fecha_inasistencia))::integer AS anio,
            (EXTRACT(month FROM inasistencias.fecha_inasistencia))::integer AS mes,
            count(*) FILTER (WHERE ((inasistencias.motivo)::text <> 'tardanza'::text)) AS total_inasis,
            count(*) FILTER (WHERE ((inasistencias.motivo)::text = ANY ((ARRAY['medico'::character varying, 'enfermedad'::character varying])::text[]))) AS inasis_salud,
            count(*) FILTER (WHERE ((inasistencias.motivo)::text = 'estudio'::text)) AS inasis_estudio,
            count(*) FILTER (WHERE ((inasistencias.motivo)::text = 'imprevisto'::text)) AS inasis_imprevisto
           FROM inasistencias
          GROUP BY inasistencias.id_agente, (EXTRACT(year FROM inasistencias.fecha_inasistencia)), (EXTRACT(month FROM inasistencias.fecha_inasistencia))
        ), tardanzas_resumen AS (
         SELECT tardanzas.id_agente,
            (EXTRACT(year FROM tardanzas.fecha))::integer AS anio,
            (EXTRACT(month FROM tardanzas.fecha))::integer AS mes,
            count(*) AS total_tardanzas,
            max(tardanzas.posicion_en_ciclo) AS posicion_ciclo_actual
           FROM tardanzas
          GROUP BY tardanzas.id_agente, (EXTRACT(year FROM tardanzas.fecha)), (EXTRACT(month FROM tardanzas.fecha))
        )
 SELECT ra.anio,
    ra.mes,
    dp.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    dp.dni,
    COALESCE(ra.turnos_totales, (0)::numeric) AS turnos_totales,
    COALESCE(ra.horas_totales, (0)::numeric) AS horas_totales,
    ra.tipos_turno_json,
    COALESCE(tr.total_tardanzas, (0)::bigint) AS tardanzas,
    COALESCE(ir.total_inasis, (0)::bigint) AS total_inasistencias,
    COALESCE(ir.inasis_salud, (0)::bigint) AS inasistencias_salud,
    COALESCE(ir.inasis_estudio, (0)::bigint) AS inasistencias_estudio,
    COALESCE(ir.inasis_imprevisto, (0)::bigint) AS inasistencias_imprevisto
   FROM (((resumen_agrupado ra
     JOIN datos_personales dp ON ((ra.id_agente = dp.id_agente)))
     LEFT JOIN inasistencias_resumen ir ON (((ra.id_agente = ir.id_agente) AND (ra.anio = ir.anio) AND (ra.mes = ir.mes))))
     LEFT JOIN tardanzas_resumen tr ON (((ra.id_agente = tr.id_agente) AND (ra.anio = tr.anio) AND (ra.mes = tr.mes))))
  ORDER BY ra.anio DESC, ra.mes DESC, dp.apellido;;

