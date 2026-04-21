Output format is unaligned.
## ================= VIEWS ===============
vista_ocupacion
 SELECT c.id_agente,
    d.fecha,
    d.anio,
    p.id_plani,
    p.id_turno
   FROM ((convocatoria c
     JOIN planificacion p ON ((c.id_plani = p.id_plani)))
     JOIN dias d ON ((p.id_dia = d.id_dia)));
vista_salud_dispositivos
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
  GROUP BY d.id_dispositivo, d.nombre_dispositivo, d.piso_dispositivo, d.cupo_minimo;
vista_planificacion_anio
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
     JOIN turnos t ON ((p.id_turno = t.id_turno)));
vista_demanda_planificada
 SELECT d.fecha,
    p.id_turno,
    t.tipo_turno AS nombre_turno,
    p.cant_residentes_plan AS cantidad_personas,
    p.plani_notas AS notas
   FROM ((planificacion p
     JOIN dias d ON ((p.id_dia = d.id_dia)))
     JOIN turnos t ON ((p.id_turno = t.id_turno)));
vista_agentes_capacitados
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
  ORDER BY disp.nombre_dispositivo, dp.apellido;
vista_convocatoria_mes_activo
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
  WHERE ((d.fecha >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) AND (d.fecha < (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval)));
vista_convocatoria_completa
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
     JOIN turnos t ON ((c.id_turno = t.id_turno)));
vista_dispositivos_ocupacion
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
  ORDER BY (count(DISTINCT m.id_menu)) DESC;
vista_cambios_pendientes
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
  ORDER BY ct.fecha_solicitud DESC;
vista_errores_recientes
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
  ORDER BY e."timestamp" DESC, e.severity DESC;
vista_patrones_errores
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
  ORDER BY occurrence_count DESC, last_occurrence DESC;
vista_salud_sistema
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
    CURRENT_TIMESTAMP AS fecha_reporte;
vista_errores_por_componente
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
  ORDER BY (count(*)) DESC;
vista_errores_timeline
 SELECT date("timestamp") AS fecha,
    error_type,
    severity,
    count(*) AS cantidad
   FROM system_errors
  WHERE ("timestamp" >= (CURRENT_TIMESTAMP - '30 days'::interval))
  GROUP BY (date("timestamp")), error_type, severity
  ORDER BY (date("timestamp")) DESC, (count(*)) DESC;
vista_cambios_turno
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
  ORDER BY c_nuevo.fecha_registro DESC;
vista_inasistencias_completa
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
     JOIN datos_personales p ON ((i.id_agente = p.id_agente)));
vista_dashboard_inasistencias
 SELECT EXTRACT(year FROM fecha_inasistencia) AS anio,
    EXTRACT(month FROM fecha_inasistencia) AS mes,
    motivo,
    estado,
    count(*) AS total
   FROM inasistencias
  GROUP BY (EXTRACT(year FROM fecha_inasistencia)), (EXTRACT(month FROM fecha_inasistencia)), motivo, estado;
vista_historial_capacitaciones
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
  ORDER BY d.fecha DESC, disp.nombre_dispositivo, dp.apellido;
vista_capacitaciones_dispositivos
 SELECT c.id_cap,
    d.fecha,
    t.tipo_turno,
    c.grupo AS grupo_capacitacion,
    c.tema,
    disp.id_dispositivo,
    disp.nombre_dispositivo,
    cd.tiempo_minutos
   FROM ((((capacitaciones c
     JOIN dias d ON ((c.id_dia = d.id_dia)))
     JOIN turnos t ON ((c.id_turno = t.id_turno)))
     LEFT JOIN capacitaciones_dispositivos cd ON ((c.id_cap = cd.id_cap)))
     LEFT JOIN dispositivos disp ON ((cd.id_dispositivo = disp.id_dispositivo)))
  ORDER BY d.fecha, t.tipo_turno, c.grupo;
vista_dashboard_saldos
 WITH horas_desglosadas AS (
         SELECT c.id_agente,
            d.anio,
            d.mes,
            sum(
                CASE
                    WHEN ((d.numero_dia_semana <> ALL (ARRAY[0, 6])) AND ((t.tipo_turno)::text = 'mañana'::text)) THEN t.cant_horas
                    ELSE (0)::numeric
                END) AS horas_manana_semana,
            sum(
                CASE
                    WHEN ((d.numero_dia_semana <> ALL (ARRAY[0, 6])) AND ((t.tipo_turno)::text = 'tarde'::text)) THEN t.cant_horas
                    ELSE (0)::numeric
                END) AS horas_tarde_semana,
            sum(
                CASE
                    WHEN (d.numero_dia_semana = ANY (ARRAY[0, 6])) THEN t.cant_horas
                    ELSE (0)::numeric
                END) AS horas_finde,
            sum(
                CASE
                    WHEN ((d.numero_dia_semana <> ALL (ARRAY[0, 6])) AND ((t.tipo_turno)::text <> ALL ((ARRAY['mañana'::character varying, 'tarde'::character varying])::text[]))) THEN t.cant_horas
                    ELSE (0)::numeric
                END) AS horas_otros_semana
           FROM (((convocatoria c
             JOIN planificacion p ON ((c.id_plani = p.id_plani)))
             JOIN dias d ON ((p.id_dia = d.id_dia)))
             JOIN turnos t ON ((p.id_turno = t.id_turno)))
          WHERE ((c.estado)::text = ANY ((ARRAY['vigente'::character varying, 'cumplida'::character varying])::text[]))
          GROUP BY c.id_agente, d.anio, d.mes
        )
 SELECT s.anio,
    s.mes,
    s.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS residente,
    dp.dni,
    s.horas_mes AS total_horas_convocadas,
    s.objetivo_mensual_48,
    s.objetivo_mensual_12w,
    (s.horas_mes - s.objetivo_mensual_48) AS diferencia_saldo_48,
    (s.horas_mes - s.objetivo_mensual_12w) AS diferencia_saldo_12w,
    s.horas_anuales AS acumulado_anual_horas,
    s.objetivo_anual_48 AS acumulado_anual_obj_48,
    s.objetivo_anual_12w AS acumulado_anual_obj_12w,
    COALESCE(hd.horas_manana_semana, (0)::numeric) AS horas_manana,
    COALESCE(hd.horas_tarde_semana, (0)::numeric) AS horas_tarde,
    COALESCE(hd.horas_finde, (0)::numeric) AS horas_finde,
    COALESCE(hd.horas_otros_semana, (0)::numeric) AS horas_otros
   FROM ((saldos s
     JOIN datos_personales dp ON ((s.id_agente = dp.id_agente)))
     LEFT JOIN horas_desglosadas hd ON (((s.id_agente = hd.id_agente) AND (s.anio = hd.anio) AND (s.mes = hd.mes))));
vista_certificados_completa
 SELECT c.id_certificado,
    c.id_inasistencia,
    c.id_agente,
    (((p.apellido)::text || ', '::text) || (p.nombre)::text) AS agente,
    p.dni,
    c.fecha_inasistencia_justifica,
    c.fecha_carga,
    c.observaciones
   FROM (certificados c
     JOIN datos_personales p ON ((c.id_agente = p.id_agente)));
vista_seguimiento_residentes
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
  ORDER BY ra.anio DESC, ra.mes DESC, dp.apellido;
vista_estado_calendario
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
  ORDER BY d.fecha DESC, p.id_turno;
vista_estado_cobertura
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
  ORDER BY d.fecha, t.tipo_turno;
vista_disponibilidad_visitas
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
  GROUP BY p.id_plani, d.fecha, d.mes, d.anio, d.numero_dia_semana, t.id_turno, t.tipo_turno, t.hora_inicio, t.hora_fin;
vista_planificacion_escuelas
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
  WHERE ((EXTRACT(isodow FROM c.fecha_convocatoria) = ANY (ARRAY[(4)::numeric, (5)::numeric])) AND ((c.estado)::text = ANY ((ARRAY['vigente'::character varying, 'confirmada'::character varying])::text[])));
## ================= FUNCTIONS ===============
actualizar_capacitacion_desde_planificacion
CREATE OR REPLACE FUNCTION public.actualizar_capacitacion_desde_planificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Solo actuar si hubieron cambios en las claves que unen ambas tablas (fecha, turno o grupo)
    IF (OLD.id_dia != NEW.id_dia OR OLD.id_turno != NEW.id_turno OR OLD.grupo IS DISTINCT FROM NEW.grupo) THEN
        UPDATE capacitaciones 
        SET id_dia = NEW.id_dia,
            id_turno = NEW.id_turno,
            grupo = NEW.grupo
        WHERE id_dia = OLD.id_dia 
          AND id_turno = OLD.id_turno 
          AND (grupo = OLD.grupo OR (grupo IS NULL AND OLD.grupo IS NULL));
    END IF;
    
    RETURN NEW;
END;
$function$

crear_capacitacion_desde_planificacion
CREATE OR REPLACE FUNCTION public.crear_capacitacion_desde_planificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Solo actuar si el grupo está definido (indica que es una capacitación)
    IF NEW.grupo IS NOT NULL THEN
        INSERT INTO capacitaciones (id_dia, id_turno, grupo, coordinador_cap, tema)
        VALUES (
            NEW.id_dia, 
            NEW.id_turno, 
            NEW.grupo,
            1,  -- Coordinador por defecto (ajustar según necesidad)
            'Capacitación Interna'  -- Tema por defecto
        )
        ON CONFLICT (id_dia, id_turno, grupo) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$

fn_asignacion_visita_historial
CREATE OR REPLACE FUNCTION public.fn_asignacion_visita_historial()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO asignaciones_visita_historial (id_asignacion, estado_anterior, estado_nuevo)
        VALUES (NEW.id_asignacion, OLD.estado, NEW.estado);
    END IF;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$

fn_limpiar_asignaciones_huerfanas
CREATE OR REPLACE FUNCTION public.fn_limpiar_asignaciones_huerfanas()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- CASO A: La convocatoria fue ELIMINADA completamente
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.menu WHERE id_convocatoria = OLD.id_convocatoria;
    DELETE FROM public.menu_semana WHERE id_convocatoria = OLD.id_convocatoria;
    RETURN OLD;
  END IF;

  -- CASO B: La convocatoria fue ACTUALIZADA (cambio de estado o turno/fecha)
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.estado IS DISTINCT FROM 'vigente' AND OLD.estado = 'vigente') OR 
       (NEW.id_plani IS DISTINCT FROM OLD.id_plani) THEN
      DELETE FROM public.menu WHERE id_convocatoria = OLD.id_convocatoria;
      DELETE FROM public.menu_semana WHERE id_convocatoria = OLD.id_convocatoria;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$

fn_registrar_capacitacion_servicio
CREATE OR REPLACE FUNCTION public.fn_registrar_capacitacion_servicio()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id_cap INTEGER;
BEGIN
    -- Solo actuar si es_capacitacion_servicio pasó a TRUE
    IF NEW.es_capacitacion_servicio = TRUE AND (TG_OP = 'INSERT' OR OLD.es_capacitacion_servicio = FALSE) THEN
        
        -- Obtener el id_cap asociado al dispositivo
        SELECT id_cap INTO v_id_cap
        FROM capacitaciones_dispositivos
        WHERE id_dispositivo = NEW.id_dispositivo
        LIMIT 1;

        -- Si el dispositivo requiere una capacitación formal, se evalúa el registro
        IF v_id_cap IS NOT NULL THEN
            -- Verificación Defensiva: ¿Ya tiene el agente esta capacitación cargada?
            IF NOT EXISTS (
                SELECT 1 FROM capacitaciones_participantes 
                WHERE id_cap = v_id_cap AND id_agente = NEW.id_agente
            ) THEN
                -- No la tiene -> Se hace el INSERT "Aprobado por Servicio"
                INSERT INTO capacitaciones_participantes (
                    id_cap, 
                    id_agente, 
                    asistio, 
                    observaciones
                ) VALUES (
                    v_id_cap, 
                    NEW.id_agente, 
                    TRUE, 
                    'Acreditación automática por capacitación en servicio (Trigger: ' || TG_TABLE_NAME || ')'
                );
            ELSE
                -- Ya la tiene -> Solo actualizamos la observación y marcamos asistio
                UPDATE capacitaciones_participantes
                SET asistio = TRUE,
                    observaciones = COALESCE(observaciones, '') || ' | Re-acreditado en servicio.'
                WHERE id_cap = v_id_cap AND id_agente = NEW.id_agente;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$

fn_sync_cap_participantes_on_grupo_change
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_grupo_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old_plani RECORD;
    v_new_plani RECORD;
    v_old_cap_id INTEGER;
    v_new_cap_id INTEGER;
BEGIN
    -- Only act if id_plani actually changed
    IF OLD.id_plani = NEW.id_plani THEN
        RETURN NEW;
    END IF;

    -- Get old and new planificacion details
    SELECT id_dia, id_turno, grupo INTO v_old_plani FROM planificacion WHERE id_plani = OLD.id_plani;
    SELECT id_dia, id_turno, grupo INTO v_new_plani FROM planificacion WHERE id_plani = NEW.id_plani;

    -- Only act if the grupo actually changed (same date scenario)
    IF v_old_plani.grupo IS NOT DISTINCT FROM v_new_plani.grupo THEN
        RETURN NEW;
    END IF;

    -- Find the old capacitacion (matching old plani's dia+turno+grupo)
    SELECT id_cap INTO v_old_cap_id
    FROM capacitaciones
    WHERE id_dia = v_old_plani.id_dia
      AND id_turno = v_old_plani.id_turno
      AND (grupo = v_old_plani.grupo OR (grupo IS NULL AND v_old_plani.grupo IS NULL))
    LIMIT 1;

    -- Find the new capacitacion (matching new plani's dia+turno+grupo)
    SELECT id_cap INTO v_new_cap_id
    FROM capacitaciones
    WHERE id_dia = v_new_plani.id_dia
      AND id_turno = v_new_plani.id_turno
      AND (grupo = v_new_plani.grupo OR (grupo IS NULL AND v_new_plani.grupo IS NULL))
    LIMIT 1;

    -- Remove from old cap (if exists)
    IF v_old_cap_id IS NOT NULL THEN
        DELETE FROM capacitaciones_participantes
        WHERE id_cap = v_old_cap_id
          AND id_agente = NEW.id_agente;
    END IF;

    -- Insert into new cap (if exists and not already there)
    IF v_new_cap_id IS NOT NULL THEN
        INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio, observaciones)
        VALUES (v_new_cap_id, NEW.id_agente, TRUE, 'Auto-movido por cambio de grupo')
        ON CONFLICT (id_cap, id_agente) DO UPDATE SET
            asistio = TRUE,
            observaciones = COALESCE(capacitaciones_participantes.observaciones, '') || ' | Re-asignado por cambio de grupo';
    END IF;

    RETURN NEW;
END;
$function$

fn_sync_cap_participantes_on_insert
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cap_id INTEGER;
    v_grupo_plani VARCHAR(50);
BEGIN
    -- Verificar si la planificación a la que fue convocado tiene una capacitación atada
    -- (Buscamos la capacitación por el día, turno y grupo exactos de esa planificación)
    SELECT c.id_cap, p.grupo 
    INTO v_cap_id, v_grupo_plani
    FROM planificacion p
    JOIN capacitaciones c 
      ON p.id_dia = c.id_dia 
     AND p.id_turno = c.id_turno 
     AND (p.grupo = c.grupo OR (p.grupo IS NULL AND c.grupo IS NULL))
    WHERE p.id_plani = NEW.id_plani
    LIMIT 1;

    -- Si existe una capacitación para esa planificación, anotamos al residente
    IF v_cap_id IS NOT NULL THEN
        INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio, observaciones)
        VALUES (v_cap_id, NEW.id_agente, TRUE, 'Auto-asignado por nueva convocatoria')
        ON CONFLICT (id_cap, id_agente) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$

fn_unificada_crear_capacitacion
CREATE OR REPLACE FUNCTION public.fn_unificada_crear_capacitacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_es_turno_cap BOOLEAN;
BEGIN
    -- Verificamos si el turno insertado es de tipo capacitación
    SELECT (tipo_turno = 'capacitacion') INTO v_es_turno_cap 
    FROM turnos WHERE id_turno = NEW.id_turno;

    -- Si es un turno de capacitación O si se definió explícitamente un grupo
    IF (v_es_turno_cap = TRUE) OR (NEW.grupo IS NOT NULL) THEN
        INSERT INTO capacitaciones (id_dia, id_turno, grupo, coordinador_cap, tema)
        VALUES (
            NEW.id_dia, 
            NEW.id_turno, 
            COALESCE(NEW.grupo, 'A'), -- Por defecto grupo A si viene null pero era turno_cap
            1, 
            'Capacitación Interna'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$

fn_update_asistencia_on_inasistencia
CREATE OR REPLACE FUNCTION public.fn_update_asistencia_on_inasistencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Buscar capacitaciones del agente en la fecha de la inasistencia
    -- y marcar asistio = FALSE
    
    WITH caps_del_dia AS (
        SELECT cp.id_participante
        FROM capacitaciones_participantes cp
        JOIN capacitaciones c ON cp.id_cap = c.id_cap
        JOIN dias d ON c.id_dia = d.id_dia
        WHERE cp.id_agente = NEW.id_agente
          AND d.fecha = NEW.fecha_inasistencia
    )
    UPDATE capacitaciones_participantes
    SET asistio = FALSE,
        observaciones = COALESCE(observaciones, '') || ' [Auto: Inasistencia ' || NEW.motivo || ']'
    WHERE id_participante IN (SELECT id_participante FROM caps_del_dia);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RAISE NOTICE 'Se actualizaron % capacitaciones a No Asistió debido a inasistencia.', v_updated_count;
    END IF;
    
    RETURN NEW;
END;
$function$

func_asignar_descanso_aprobado
CREATE OR REPLACE FUNCTION public.func_asignar_descanso_aprobado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
    INSERT INTO convocatoria (id_plani, id_agente, id_turno, fecha_convocatoria, estado)
    SELECT 
        p.id_plani,
        NEW.id_agente,
        t.id_turno,
        NEW.dia_solicitado,
        'vigente'
    FROM planificacion p
    JOIN dias d ON p.id_dia = d.id_dia
    JOIN turnos t ON p.id_turno = t.id_turno
    WHERE d.fecha = NEW.dia_solicitado
      AND lower(trim(t.tipo_turno)) = 'descanso'
    ORDER BY p.id_plani ASC
    LIMIT 1
    ON CONFLICT (id_plani, id_agente) DO NOTHING;
    
    UPDATE descansos
    SET fecha_respuesta = CURRENT_TIMESTAMP
    WHERE id_desc = NEW.id_desc;
    RETURN NEW;
END;
$function$

func_auto_requiere_certificado
CREATE OR REPLACE FUNCTION public.func_auto_requiere_certificado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.requiere_certificado IS NULL THEN
        IF NEW.motivo IN ('medico', 'estudio', 'otro_justificada') THEN
            NEW.requiere_certificado := TRUE;
            NEW.estado := 'pendiente';
        ELSIF NEW.motivo = 'imprevisto' THEN
            NEW.requiere_certificado := FALSE;
            NEW.estado := 'pendiente';
        ELSE
            NEW.requiere_certificado := FALSE;
            NEW.estado := 'injustificada';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$

func_certificado_aprobado
CREATE OR REPLACE FUNCTION public.func_certificado_aprobado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE inasistencias
    SET estado = 'justificada',
        fecha_actualizacion_estado = CURRENT_TIMESTAMP,
        usuario_actualizo_estado = NEW.usuario_reviso
    WHERE id_inasistencia = NEW.id_inasistencia;
    RETURN NEW;
END;
$function$

func_certificado_rechazado
CREATE OR REPLACE FUNCTION public.func_certificado_rechazado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE inasistencias
    SET estado = CASE
        WHEN (SELECT COUNT(*) FROM certificados 
              WHERE id_inasistencia = NEW.id_inasistencia 
              AND estado_certificado = 'aprobado') > 0
            THEN 'justificada'
        ELSE 'injustificada'
    END,
    fecha_actualizacion_estado = CURRENT_TIMESTAMP,
    usuario_actualizo_estado = NEW.usuario_reviso
    WHERE id_inasistencia = NEW.id_inasistencia;
    RETURN NEW;
END;
$function$

func_detectar_patron_error
CREATE OR REPLACE FUNCTION public.func_detectar_patron_error()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO error_patterns (
        pattern_signature, error_type, component, 
        first_occurrence, last_occurrence, occurrence_count,
        severity_max, affected_users_count
    )
    VALUES (
        NEW.error_type || ':' || NEW.component,
        NEW.error_type, NEW.component,
        NEW.TIMESTAMP, NEW.TIMESTAMP, 1,
        NEW.severity,
        CASE WHEN NEW.id_agente IS NOT NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT(pattern_signature) DO UPDATE SET
        last_occurrence = NEW.TIMESTAMP,
        occurrence_count = error_patterns.occurrence_count + 1,
        severity_max = CASE 
            WHEN NEW.severity = 'critical' THEN 'critical'
            WHEN NEW.severity = 'high' AND error_patterns.severity_max != 'critical' THEN 'high'
            WHEN NEW.severity = 'medium' AND error_patterns.severity_max NOT IN ('critical', 'high') THEN 'medium'
            ELSE error_patterns.severity_max
        END,
        affected_users_count = error_patterns.affected_users_count + 
            CASE WHEN NEW.id_agente IS NOT NULL THEN 1 ELSE 0 END;
    
    UPDATE system_errors
    SET is_recurring = TRUE
    WHERE id_error = NEW.id_error
    AND EXISTS (
        SELECT 1 FROM error_patterns 
        WHERE pattern_signature = NEW.error_type || ':' || NEW.component
        AND occurrence_count >= 3
    );
    RETURN NEW;
END;
$function$

func_error_resuelto
CREATE OR REPLACE FUNCTION public.func_error_resuelto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE system_errors
    SET resolution_date = CURRENT_TIMESTAMP
    WHERE id_error = NEW.id_error;
    RETURN NEW;
END;
$function$

func_prevent_duplicate_vigente
CREATE OR REPLACE FUNCTION public.func_prevent_duplicate_vigente()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM convocatoria
        WHERE id_agente = NEW.id_agente
        AND fecha_convocatoria = NEW.fecha_convocatoria
        AND estado = 'vigente'
    ) THEN
        RAISE EXCEPTION 'ERROR: El agente ya tiene una convocatoria vigente para esta fecha';
    END IF;
    RETURN NEW;
END;
$function$

func_registrar_historial_cambio
CREATE OR REPLACE FUNCTION public.func_registrar_historial_cambio()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO convocatoria_historial (
        id_convocatoria, id_agente_anterior, id_agente_nuevo,
        tipo_cambio, motivo
    )
    VALUES (
        NEW.id_convocatoria, OLD.id_agente, NEW.id_agente,
        'reasignacion', NEW.motivo_cambio
    );
    RETURN NEW;
END;
$function$

func_set_horario_planificacion
CREATE OR REPLACE FUNCTION public.func_set_horario_planificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_hora_inicio time;
    v_hora_fin time;
    v_cant_horas numeric;
    v_should_recalculate boolean;
BEGIN
    -- Determinar si debemos recalcular
    -- 1. Si cant_horas es NULL (caso original)
    -- 2. O si cambiaron los horarios (caso actualización)
    v_should_recalculate := (NEW.cant_horas IS NULL) 
                            OR (NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio) 
                            OR (NEW.hora_fin IS DISTINCT FROM OLD.hora_fin);

    -- CASO 1: Si viene con horario manual (desde Sheets/App)
    IF NEW.hora_inicio IS NOT NULL OR NEW.hora_fin IS NOT NULL THEN
        NEW.usa_horario_custom := true;
        IF NEW.motivo_horario_custom IS NULL THEN
            NEW.motivo_horario_custom := 'Carga manual / Actualización';
        END IF;
        
        -- Calcular cantidad de horas si es necesario
        IF v_should_recalculate AND NEW.hora_inicio IS NOT NULL AND NEW.hora_fin IS NOT NULL THEN
            NEW.cant_horas := ROUND((EXTRACT(EPOCH FROM (NEW.hora_fin - NEW.hora_inicio))/3600)::numeric, 2);
        END IF;
        
        RETURN NEW;
    END IF;

    -- CASO 2: Si viene sin horario (NULL), buscar default en turnos
    -- Solo si no es un update parcial donde se borran los horarios explícitamente
    -- (Asumimos que si se borran, se quiere volver al default)
    SELECT hora_inicio, hora_fin, cant_horas
    INTO v_hora_inicio, v_hora_fin, v_cant_horas
    FROM turnos
    WHERE id_turno = NEW.id_turno;

    -- Asignar valores por defecto
    NEW.hora_inicio := v_hora_inicio;
    NEW.hora_fin := v_hora_fin;
    NEW.cant_horas := v_cant_horas;
    NEW.usa_horario_custom := false;
    NEW.motivo_horario_custom := NULL;

    RETURN NEW;
END;
$function$

func_update_fecha_modificacion
CREATE OR REPLACE FUNCTION public.func_update_fecha_modificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.fecha_modificacion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$

func_update_requiere_certificado
CREATE OR REPLACE FUNCTION public.func_update_requiere_certificado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.motivo IN ('medico', 'estudio', 'otro_justificada') THEN
        NEW.requiere_certificado := TRUE;
    ELSIF NEW.motivo = 'imprevisto' THEN
        NEW.requiere_certificado := FALSE;
    ELSE
        NEW.requiere_certificado := FALSE;
    END IF;
    RETURN NEW;
END;
$function$

procesar_importacion_calendario
CREATE OR REPLACE FUNCTION public.procesar_importacion_calendario()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    r_dispositivo RECORD;
    v_item TEXT;
    v_parts TEXT[];
    v_id_disp INTEGER;
    v_cupo INTEGER;
BEGIN
    -- Solo procesar si es nuevo insert
    IF TG_OP = 'INSERT' THEN
        
        BEGIN
            -- 1. Limpiar asignaciones previas para esa fecha/turno (Opcional: decide política de reemplazo)
            -- Por seguridad, podriamos borrar lo que choque, o simplemente insertar/actualizar.
            -- Asumiremos que es carga aditiva o correctiva con UPSERT.
            
            -- 2. Parsear el string separado por comas
            FOREACH v_item IN ARRAY string_to_array(NEW.config_raw, ',')
            LOOP
                v_item := trim(v_item);
                IF v_item = '' THEN CONTINUE; END IF;
                
                -- Detectar formato "ID:Cupo" o solo "ID"
                IF position(':' in v_item) > 0 THEN
                    v_parts := string_to_array(v_item, ':');
                    v_id_disp := v_parts[1]::INTEGER;
                    v_cupo := v_parts[2]::INTEGER;
                ELSE
                    v_id_disp := v_item::INTEGER;
                    v_cupo := 1; -- Default
                END IF;
                
                -- 3. Validar existencia del dispositivo
                IF NOT EXISTS (SELECT 1 FROM dispositivos WHERE id_dispositivo = v_id_disp) THEN
                    RAISE EXCEPTION 'Dispositivo ID % no existe', v_id_disp;
                END IF;
                
                -- 4. Upsert en tabla real
                INSERT INTO calendario_dispositivos (fecha, id_turno, id_dispositivo, cupo_objetivo)
                VALUES (NEW.fecha, NEW.id_turno, v_id_disp, v_cupo)
                ON CONFLICT (fecha, id_turno, id_dispositivo) 
                DO UPDATE SET cupo_objetivo = EXCLUDED.cupo_objetivo;
                
            END LOOP;
            
            -- Marcar como procesado OK
            UPDATE stg_calendario_import 
            SET procesado = TRUE, error = NULL
            WHERE id = NEW.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Capturar error y guardarlo en la tabla staging
            UPDATE stg_calendario_import 
            SET procesado = FALSE, error = SQLERRM
            WHERE id = NEW.id;
        END;
        
    END IF;
    RETURN NEW;
END;
$function$

rpc_calcular_saldos_mes
CREATE OR REPLACE FUNCTION public.rpc_calcular_saldos_mes(p_anio integer, p_mes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_semanas_mes NUMERIC;
BEGIN
    -- Calcular la cantidad de semanas exactas en el mes
    v_semanas_mes := EXTRACT(DAY FROM (date_trunc('month', make_date(p_anio, p_mes, 1)) + interval '1 month' - interval '1 day'))::NUMERIC / 7.0;

    -- UPSERT agrupando desde convocatoria
    WITH horas_calculadas AS (
        SELECT 
            c.id_agente,
            SUM(t.cant_horas) AS total_horas_mes
        FROM convocatoria c
        JOIN planificacion p ON c.id_plani = p.id_plani
        JOIN dias d ON p.id_dia = d.id_dia
        JOIN turnos t ON p.id_turno = t.id_turno
        WHERE d.anio = p_anio 
          AND d.mes = p_mes
          AND c.estado IN ('vigente', 'cumplida')
        GROUP BY c.id_agente
    )
    INSERT INTO saldos (
        id_agente, mes, anio, horas_mes, 
        objetivo_mensual_48, objetivo_mensual_12w, fecha_actualizacion
    )
    SELECT 
        dp.id_agente,
        p_mes,
        p_anio,
        COALESCE(hc.total_horas_mes, 0),
        48.0, 
        (12.0 * v_semanas_mes),
        CURRENT_TIMESTAMP
    FROM datos_personales dp
    LEFT JOIN horas_calculadas hc ON dp.id_agente = hc.id_agente
    WHERE dp.activo = true
    ON CONFLICT (id_agente, mes, anio) DO UPDATE SET
        horas_mes = EXCLUDED.horas_mes,
        objetivo_mensual_48 = EXCLUDED.objetivo_mensual_48,
        objetivo_mensual_12w = EXCLUDED.objetivo_mensual_12w,
        fecha_actualizacion = EXCLUDED.fecha_actualizacion;

    -- Actualizar acumulados anuales (YTD: Year To Date)
    -- Sumamos solo los meses hasta el mes que estamos calculando
    WITH acumulado_anual AS (
        SELECT id_agente, SUM(horas_mes) AS t_horas, SUM(objetivo_mensual_48) AS t_o48, SUM(objetivo_mensual_12w) AS t_o12w
        FROM saldos 
        WHERE anio = p_anio AND mes <= p_mes 
        GROUP BY id_agente
    )
    UPDATE saldos s SET 
        horas_anuales = aa.t_horas,
        objetivo_anual_48 = aa.t_o48,
        objetivo_anual_12w = aa.t_o12w
    FROM acumulado_anual aa
    WHERE s.id_agente = aa.id_agente AND s.anio = p_anio AND s.mes = p_mes;
END;
$function$

rpc_guardar_matriz_dispositivos
CREATE OR REPLACE FUNCTION public.rpc_guardar_matriz_dispositivos(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    item JSONB;
    v_count INT := 0;
    v_tiempo INT;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        v_tiempo := COALESCE((item->>'tiempo')::INT, 0);
        IF v_tiempo > 0 THEN
            INSERT INTO capacitaciones_dispositivos (id_cap, id_dispositivo, tiempo_minutos)
            VALUES ((item->>'id_cap')::INT, (item->>'id_dispositivo')::INT, v_tiempo)
            ON CONFLICT (id_cap, id_dispositivo) 
            DO UPDATE SET tiempo_minutos = EXCLUDED.tiempo_minutos;
        ELSE
            DELETE FROM capacitaciones_dispositivos
            WHERE id_cap = (item->>'id_cap')::INT
              AND id_dispositivo = (item->>'id_dispositivo')::INT;
        END IF;
        
        v_count := v_count + 1;
    END LOOP;
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Procesados %s registros en matriz dispositivos', v_count)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$function$

rpc_guardar_participantes_grupo
CREATE OR REPLACE FUNCTION public.rpc_guardar_participantes_grupo(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_id_cap INT;
    item JSONB;
    v_inserted INT := 0;
BEGIN
    v_id_cap := (payload->>'id_cap')::INT;

    IF v_id_cap IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Falta id_cap');
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(payload->'participantes')
    LOOP
        IF COALESCE((item->>'asistio')::BOOLEAN, FALSE) = TRUE THEN
            -- Checkbox marcado: Insertar o actualizar como Asistió
            INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio)
            VALUES (v_id_cap, (item->>'id_agente')::INT, TRUE)
            ON CONFLICT (id_cap, id_agente) 
            DO UPDATE SET asistio = TRUE;
        ELSE
            -- Checkbox vacío: Eliminar el registro (limpieza de matriz)
            -- IMPORTANTE: NO eliminar si fue marcado por el trigger de Inasistencia Automática
            DELETE FROM capacitaciones_participantes
            WHERE id_cap = v_id_cap 
              AND id_agente = (item->>'id_agente')::INT 
              AND (observaciones IS NULL OR observaciones NOT LIKE '%[Auto: Inasistencia%');
        END IF;
        
        v_inserted := v_inserted + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Actualizados %s residentes en la cap %s', v_inserted, v_id_cap)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$function$

rpc_importar_calendario
CREATE OR REPLACE FUNCTION public.rpc_importar_calendario(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    r_item JSONB;
    v_fecha DATE;
    v_id_turno INTEGER;
    v_config_raw TEXT;
    
    -- Variables para parsing
    v_sub_item TEXT;
    v_parts TEXT[];
    v_id_disp INTEGER;
    v_cupo INTEGER;
    
    v_inserted_count INTEGER := 0;
    v_errors TEXT := '';
BEGIN
    -- Validar que sea un array
    IF payload IS NULL OR jsonb_typeof(payload) != 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El payload debe ser un JSON Array');
    END IF;

    -- Iterar sobre cada elemento del array (Bulk Processing)
    FOR r_item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            v_fecha := (r_item->>'fecha')::DATE;
            v_id_turno := (r_item->>'id_turno')::INTEGER;
            v_config_raw := r_item->>'config_raw';
            
            -- Validación básica
            IF v_fecha IS NULL OR v_id_turno IS NULL OR v_config_raw IS NULL THEN
                CONTINUE; -- Saltar registros inválidos
            END IF;

            -- Lógica de Desempaquetado (Similar al Trigger anterior)
            -- config_raw formato: "1:2, 5, 8:3"
            
            FOREACH v_sub_item IN ARRAY string_to_array(v_config_raw, ',')
            LOOP
                v_sub_item := trim(v_sub_item);
                IF v_sub_item = '' THEN CONTINUE; END IF;
                
                -- Parse "ID:Cupo"
                IF position(':' in v_sub_item) > 0 THEN
                    v_parts := string_to_array(v_sub_item, ':');
                    v_id_disp := v_parts[1]::INTEGER;
                    v_cupo := v_parts[2]::INTEGER;
                ELSE
                    v_id_disp := v_sub_item::INTEGER;
                    v_cupo := 1; -- Default
                END IF;

                -- Insert / Upsert directo a la tabla final
                -- Asumimos que los IDs de dispositivo ya existen. Si no, fallará y capturamos error.
                INSERT INTO calendario_dispositivos (fecha, id_turno, id_dispositivo, cupo_objetivo)
                VALUES (v_fecha, v_id_turno, v_id_disp, v_cupo)
                ON CONFLICT (fecha, id_turno, id_dispositivo) 
                DO UPDATE SET cupo_objetivo = EXCLUDED.cupo_objetivo;
                
                v_inserted_count := v_inserted_count + 1;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || 'Error en ' || v_fecha || '-' || v_id_turno || ': ' || SQLERRM || '; ';
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_items', v_inserted_count,
        'errors', v_errors
    );
END;
$function$

rpc_obtener_convocados_matriz
CREATE OR REPLACE FUNCTION public.rpc_obtener_convocados_matriz(anio_filtro integer)
 RETURNS TABLE(id_cap integer, id_agente integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH caps AS (
        SELECT c.id_cap, c.id_dia, c.id_turno, c.grupo
        FROM capacitaciones c
        JOIN dias d ON c.id_dia = d.id_dia
        WHERE EXTRACT(YEAR FROM d.fecha) = anio_filtro
    ),
    plani AS (
        SELECT p.id_plani, p.id_dia, p.id_turno, p.grupo
        FROM planificacion p
        JOIN dias d ON p.id_dia = d.id_dia
        WHERE EXTRACT(YEAR FROM d.fecha) = anio_filtro
    ),
    convs AS (
        SELECT p.id_dia, p.id_turno, p.grupo, c.id_agente
        FROM convocatoria c
        JOIN plani p ON c.id_plani = p.id_plani
    )
    SELECT 
        c.id_cap,
        dp.id_agente
    FROM caps c
    CROSS JOIN datos_personales dp
    LEFT JOIN capacitaciones_participantes cp ON c.id_cap = cp.id_cap AND dp.id_agente = cp.id_agente
    WHERE dp.activo = true AND dp.cohorte = anio_filtro
      AND COALESCE(cp.asistio, 
                 EXISTS(SELECT 1 FROM convs v WHERE v.id_dia = c.id_dia AND v.id_turno = c.id_turno AND (v.grupo = c.grupo OR (v.grupo IS NULL AND c.grupo IS NULL)) AND v.id_agente = dp.id_agente)
          ) = true;
END;
$function$

rpc_obtener_matriz_certificaciones
CREATE OR REPLACE FUNCTION public.rpc_obtener_matriz_certificaciones(anio_filtro integer DEFAULT NULL::integer)
 RETURNS TABLE(id_dispositivo integer, nombre_dispositivo character varying, id_agente integer, nombre_completo text, fecha_mas_reciente date, total_capacitaciones integer)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    WITH smart_participation AS (
        SELECT 
            c.id_cap,
            dp.id_agente,
            d.fecha
        FROM capacitaciones c
        JOIN dias d ON c.id_dia = d.id_dia
        CROSS JOIN datos_personales dp
        LEFT JOIN capacitaciones_participantes cp ON c.id_cap = cp.id_cap AND dp.id_agente = cp.id_agente
        WHERE dp.activo = true 
          AND (anio_filtro IS NULL OR d.anio = anio_filtro)
          AND COALESCE(cp.asistio, 
                 EXISTS(
                    SELECT 1 
                    FROM convocatoria conv
                    JOIN planificacion p ON conv.id_plani = p.id_plani
                    WHERE p.id_dia = c.id_dia 
                      AND p.id_turno = c.id_turno 
                      AND (p.grupo = c.grupo OR (p.grupo IS NULL AND c.grupo IS NULL))
                      AND conv.id_agente = dp.id_agente
                 )
          ) = true
    )
    SELECT 
        disp.id_dispositivo,
        disp.nombre_dispositivo,
        dp.id_agente,
        (dp.nombre || ' ' || dp.apellido) AS nombre_completo,
        MAX(sp.fecha) AS fecha_mas_reciente,
        COUNT(*)::INT AS total_capacitaciones
    FROM dispositivos disp
    JOIN capacitaciones_dispositivos cap_disp ON disp.id_dispositivo = cap_disp.id_dispositivo
    JOIN smart_participation sp ON cap_disp.id_cap = sp.id_cap
    JOIN datos_personales dp ON sp.id_agente = dp.id_agente
    GROUP BY 
        disp.id_dispositivo, 
        disp.nombre_dispositivo, 
        dp.id_agente, 
        dp.nombre, 
        dp.apellido
    ORDER BY disp.nombre_dispositivo, dp.apellido;
$function$

rpc_obtener_matriz_habilidades_hoy
CREATE OR REPLACE FUNCTION public.rpc_obtener_matriz_habilidades_hoy(anio_filtro integer DEFAULT NULL::integer)
 RETURNS TABLE(id_dispositivo integer, nombre_dispositivo character varying, id_agente integer, nombre_completo text, fecha_mas_reciente date)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    WITH smart_participation AS (
        SELECT 
            c.id_cap,
            dp.id_agente,
            d.fecha
        FROM capacitaciones c
        JOIN dias d ON c.id_dia = d.id_dia
        CROSS JOIN datos_personales dp
        LEFT JOIN capacitaciones_participantes cp ON c.id_cap = cp.id_cap AND dp.id_agente = cp.id_agente
        WHERE dp.activo = true 
          AND d.fecha <= CURRENT_DATE
          AND (anio_filtro IS NULL OR d.anio = anio_filtro)
          AND COALESCE(cp.asistio, 
                 EXISTS(
                    SELECT 1 
                    FROM convocatoria conv
                    JOIN planificacion p ON conv.id_plani = p.id_plani
                    WHERE p.id_dia = c.id_dia 
                      AND p.id_turno = c.id_turno 
                      AND (p.grupo = c.grupo OR (p.grupo IS NULL AND c.grupo IS NULL))
                      AND conv.id_agente = dp.id_agente
                 )
          ) = true
    )
    SELECT 
        disp.id_dispositivo,
        disp.nombre_dispositivo,
        dp.id_agente,
        (dp.nombre || ' ' || dp.apellido) AS nombre_completo,
        MAX(sp.fecha) AS fecha_mas_reciente
    FROM dispositivos disp
    JOIN capacitaciones_dispositivos cap_disp ON disp.id_dispositivo = cap_disp.id_dispositivo
    JOIN smart_participation sp ON cap_disp.id_cap = sp.id_cap
    JOIN datos_personales dp ON sp.id_agente = dp.id_agente
    GROUP BY 
        disp.id_dispositivo, 
        disp.nombre_dispositivo, 
        dp.id_agente, 
        dp.nombre, 
        dp.apellido
    ORDER BY disp.nombre_dispositivo, dp.apellido;
$function$

rpc_obtener_vista_capacitados
CREATE OR REPLACE FUNCTION public.rpc_obtener_vista_capacitados()
 RETURNS SETOF vista_agentes_capacitados
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT * FROM vista_agentes_capacitados;
$function$

trg_crear_capacitacion_desde_planificacion
CREATE OR REPLACE FUNCTION public.trg_crear_capacitacion_desde_planificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Solo actuar si el turno es de tipo 'capacitacion'
    IF EXISTS (
        SELECT 1 FROM turnos t 
        WHERE t.id_turno = NEW.id_turno 
        AND t.tipo_turno = 'capacitacion'
    ) THEN
        -- Crear capacitación si no existe para ese día
        INSERT INTO capacitaciones (id_dia, coordinador_cap, tema, grupo)
        VALUES (NEW.id_dia, 1, 'Capacitación Interna', 'A')
        ON CONFLICT DO NOTHING; -- Evita duplicados si ya existe
    END IF;
    
    RETURN NEW;
END;
$function$

## ================= TRIGGERS ===============
CREATE TRIGGER trg_asignar_descanso_aprobado AFTER UPDATE OF estado ON public.descansos FOR EACH ROW WHEN ((((new.estado)::text = 'asignado'::text) AND ((old.estado)::text = 'pendiente'::text))) EXECUTE FUNCTION func_asignar_descanso_aprobado()
CREATE TRIGGER trg_auto_requiere_certificado BEFORE INSERT ON public.inasistencias FOR EACH ROW EXECUTE FUNCTION func_auto_requiere_certificado()
CREATE TRIGGER trg_update_requiere_certificado BEFORE UPDATE OF motivo ON public.inasistencias FOR EACH ROW WHEN (((old.motivo)::text IS DISTINCT FROM (new.motivo)::text)) EXECUTE FUNCTION func_update_requiere_certificado()
CREATE TRIGGER trg_detectar_patron_error AFTER INSERT ON public.system_errors FOR EACH ROW EXECUTE FUNCTION func_detectar_patron_error()
CREATE TRIGGER trg_error_resuelto AFTER UPDATE OF resolved ON public.system_errors FOR EACH ROW WHEN (((new.resolved = true) AND (old.resolved = false))) EXECUTE FUNCTION func_error_resuelto()
CREATE TRIGGER trg_procesar_importacion AFTER INSERT ON public.stg_calendario_import FOR EACH ROW EXECUTE FUNCTION procesar_importacion_calendario()
CREATE TRIGGER trg_set_horario_planificacion BEFORE INSERT OR UPDATE ON public.planificacion FOR EACH ROW EXECUTE FUNCTION func_set_horario_planificacion()
CREATE TRIGGER trg_update_asistencia_on_inasistencia AFTER INSERT ON public.inasistencias FOR EACH ROW EXECUTE FUNCTION fn_update_asistencia_on_inasistencia()
CREATE TRIGGER trg_update_planificacion_a_capacitaciones AFTER UPDATE ON public.planificacion FOR EACH ROW EXECUTE FUNCTION actualizar_capacitacion_desde_planificacion()
CREATE TRIGGER trg_cap_servicio_asignaciones AFTER INSERT OR UPDATE ON public.asignaciones FOR EACH ROW EXECUTE FUNCTION fn_registrar_capacitacion_servicio()
CREATE TRIGGER trg_cap_servicio_menu AFTER INSERT OR UPDATE ON public.menu FOR EACH ROW EXECUTE FUNCTION fn_registrar_capacitacion_servicio()
CREATE TRIGGER trg_sync_cap_on_grupo_change BEFORE UPDATE ON public.convocatoria FOR EACH ROW EXECUTE FUNCTION fn_sync_cap_participantes_on_grupo_change()
CREATE TRIGGER trg_asignacion_visita_historial BEFORE UPDATE ON public.asignaciones_visita FOR EACH ROW EXECUTE FUNCTION fn_asignacion_visita_historial()
CREATE TRIGGER trg_limpiar_asignaciones_upd AFTER UPDATE ON public.convocatoria FOR EACH ROW EXECUTE FUNCTION fn_limpiar_asignaciones_huerfanas()
CREATE TRIGGER trg_limpiar_asignaciones_del AFTER DELETE ON public.convocatoria FOR EACH ROW EXECUTE FUNCTION fn_limpiar_asignaciones_huerfanas()
CREATE TRIGGER trg_sync_cap_on_insert AFTER INSERT ON public.convocatoria FOR EACH ROW EXECUTE FUNCTION fn_sync_cap_participantes_on_insert()
CREATE TRIGGER trg_unificado_crear_capacitacion AFTER INSERT ON public.planificacion FOR EACH ROW EXECUTE FUNCTION fn_unificada_crear_capacitacion()
