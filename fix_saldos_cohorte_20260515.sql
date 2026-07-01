-- CORREGIDO: Incluye horas_convocadas y horas_canceladas
-- Corrige el RPC de saldos para que opere solo sobre la cohorte del anio solicitado,
-- use las horas reales de planificacion y no pierda overrides de convocatoria.
-- Ademas corrige la vista mensual para clasificar manana, tarde y Apertura al publico
-- usando prefijos y unificando todos los turnos que empiecen con "Apertura al público".
--
-- 2026-07-01: Agregado horas_convocadas (todas), horas_canceladas (solo canceladas),
--             horas_mes se mantiene como horas reales (no canceladas).

-- ===== ACTUALIZADO 2026-07-01: agrega horas_convocadas y horas_canceladas =====

ALTER TABLE saldos
  ADD COLUMN IF NOT EXISTS horas_convocadas NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_canceladas NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION public.rpc_calcular_saldos_mes(p_anio integer, p_mes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_semanas_mes NUMERIC;
BEGIN
    v_semanas_mes := EXTRACT(DAY FROM (date_trunc('month', make_date(p_anio, p_mes, 1)) + interval '1 month' - interval '1 day'))::NUMERIC / 7.0;

    DELETE FROM saldos s
    USING datos_personales dp
    WHERE s.id_agente = dp.id_agente
      AND s.anio = p_anio
      AND s.mes = p_mes
      AND dp.cohorte <> p_anio;

    WITH horas_calculadas AS (
        SELECT
            c.id_agente,
            SUM(COALESCE(p.cant_horas, t.cant_horas, 0))
                FILTER (WHERE c.estado IN ('vigente', 'cumplida'))
                AS total_horas_mes,
            SUM(COALESCE(p.cant_horas, t.cant_horas, 0))
                FILTER (WHERE c.estado IN ('vigente', 'cumplida') AND COALESCE(c.turno_cancelado, false) = false)
                AS horas_reales_mes,
            SUM(COALESCE(p.cant_horas, t.cant_horas, 0))
                FILTER (WHERE c.estado = 'cancelada' OR COALESCE(c.turno_cancelado, false) = true)
                AS horas_canceladas_mes
        FROM convocatoria c
        JOIN planificacion p ON c.id_plani = p.id_plani
        JOIN dias d ON p.id_dia = d.id_dia
        LEFT JOIN turnos t ON COALESCE(c.id_turno, p.id_turno) = t.id_turno
        JOIN datos_personales dp ON c.id_agente = dp.id_agente
        WHERE d.anio = p_anio
          AND d.mes = p_mes
          AND dp.activo = true
          AND dp.cohorte = p_anio
          AND (t.tipo_turno IS NULL OR LOWER(t.tipo_turno) <> 'descanso')
        GROUP BY c.id_agente
    )
    INSERT INTO saldos (
        id_agente, mes, anio, horas_mes,
        horas_convocadas, horas_canceladas,
        objetivo_mensual_48, objetivo_mensual_12w, fecha_actualizacion
    )
    SELECT
        dp.id_agente,
        p_mes,
        p_anio,
        COALESCE(hc.horas_reales_mes, 0),
        COALESCE(hc.total_horas_mes, 0),
        COALESCE(hc.horas_canceladas_mes, 0),
        48.0,
        (12.0 * v_semanas_mes),
        CURRENT_TIMESTAMP
    FROM datos_personales dp
    LEFT JOIN horas_calculadas hc ON dp.id_agente = hc.id_agente
    WHERE dp.activo = true
      AND dp.cohorte = p_anio
    ON CONFLICT (id_agente, mes, anio) DO UPDATE SET
        horas_mes = EXCLUDED.horas_mes,
        horas_convocadas = EXCLUDED.horas_convocadas,
        horas_canceladas = EXCLUDED.horas_canceladas,
        objetivo_mensual_48 = EXCLUDED.objetivo_mensual_48,
        objetivo_mensual_12w = EXCLUDED.objetivo_mensual_12w,
        fecha_actualizacion = EXCLUDED.fecha_actualizacion;

    WITH acumulado_anual AS (
        SELECT id_agente,
               SUM(horas_mes) AS t_horas,
               SUM(horas_convocadas) AS t_convocadas,
               SUM(horas_canceladas) AS t_canceladas,
               SUM(objetivo_mensual_48) AS t_o48,
               SUM(objetivo_mensual_12w) AS t_o12w
        FROM saldos
        WHERE anio = p_anio AND mes <= p_mes
        GROUP BY id_agente
    )
    UPDATE saldos s SET
        horas_anuales = aa.t_horas,
        objetivo_anual_48 = aa.t_o48,
        objetivo_anual_12w = aa.t_o12w
    FROM acumulado_anual aa
    JOIN datos_personales dp ON dp.id_agente = aa.id_agente
    WHERE s.id_agente = aa.id_agente
      AND s.anio = p_anio
      AND s.mes = p_mes
      AND dp.cohorte = p_anio;
END;
$function$;

DROP VIEW IF EXISTS public.vista_dashboard_saldos CASCADE;

CREATE OR REPLACE VIEW public.vista_dashboard_saldos AS
WITH horas_desglosadas AS (
    SELECT
        c.id_agente,
        d.anio,
        d.mes,
        SUM(
            CASE
                WHEN d.numero_dia_semana <> ALL (ARRAY[0, 6])
                  AND (
                    t.tipo_turno ILIKE '%mañana%'
                    OR t.tipo_turno ILIKE '%manana%'
                  )
                THEN COALESCE(p.cant_horas, t.cant_horas, 0)
                ELSE 0
            END
        ) AS horas_manana_semana,
        SUM(
            CASE
                WHEN d.numero_dia_semana <> ALL (ARRAY[0, 6])
                  AND t.tipo_turno ILIKE '%tarde%'
                THEN COALESCE(p.cant_horas, t.cant_horas, 0)
                ELSE 0
            END
        ) AS horas_tarde_semana,
        SUM(
            CASE
                WHEN d.numero_dia_semana <> ALL (ARRAY[0, 6])
                  AND (
                    t.tipo_turno ILIKE 'Apertura al público%'
                    OR t.tipo_turno ILIKE 'Apertura al publico%'
                  )
                THEN COALESCE(p.cant_horas, t.cant_horas, 0)
                ELSE 0
            END
        ) AS horas_apertura_publico_semana,
        SUM(
            CASE
                WHEN d.numero_dia_semana = ANY (ARRAY[0, 6])
                THEN COALESCE(p.cant_horas, t.cant_horas, 0)
                ELSE 0
            END
        ) AS horas_finde,
        SUM(
            CASE
                WHEN d.numero_dia_semana <> ALL (ARRAY[0, 6])
                  AND NOT (
                    t.tipo_turno ILIKE '%mañana%'
                    OR t.tipo_turno ILIKE '%manana%'
                    OR t.tipo_turno ILIKE '%tarde%'
                    OR t.tipo_turno ILIKE 'Apertura al público%'
                    OR t.tipo_turno ILIKE 'Apertura al publico%'
                  )
                THEN COALESCE(p.cant_horas, t.cant_horas, 0)
                ELSE 0
            END
        ) AS horas_otros_semana
    FROM convocatoria c
    JOIN planificacion p ON c.id_plani = p.id_plani
    JOIN dias d ON p.id_dia = d.id_dia
    LEFT JOIN turnos t ON COALESCE(c.id_turno, p.id_turno) = t.id_turno
    WHERE c.estado = ANY (ARRAY['vigente', 'cumplida'])
      AND COALESCE(c.turno_cancelado, false) = false
      AND (t.tipo_turno IS NULL OR LOWER(t.tipo_turno) <> 'descanso')
    GROUP BY c.id_agente, d.anio, d.mes
)
SELECT
    s.anio,
    s.mes,
    s.id_agente,
    ((dp.apellido)::text || ', '::text) || (dp.nombre)::text AS residente,
    dp.dni,
    s.horas_mes AS total_horas_convocadas,
    s.horas_convocadas,
    s.horas_canceladas,
    s.objetivo_mensual_48,
    s.objetivo_mensual_12w,
    (s.horas_mes - s.objetivo_mensual_48) AS diferencia_saldo_48,
    (s.horas_mes - s.objetivo_mensual_12w) AS diferencia_saldo_12w,
    s.horas_anuales AS acumulado_anual_horas,
    s.objetivo_anual_48 AS acumulado_anual_obj_48,
    s.objetivo_anual_12w AS acumulado_anual_obj_12w,
    COALESCE(hd.horas_manana_semana, 0) AS horas_manana,
    COALESCE(hd.horas_tarde_semana, 0) AS horas_tarde,
    COALESCE(hd.horas_apertura_publico_semana, 0) AS horas_apertura_publico,
    COALESCE(hd.horas_finde, 0) AS horas_finde,
    COALESCE(hd.horas_otros_semana, 0) AS horas_otros
FROM saldos s
JOIN datos_personales dp ON s.id_agente = dp.id_agente
LEFT JOIN horas_desglosadas hd
    ON s.id_agente = hd.id_agente
   AND s.anio = hd.anio
    AND s.mes = hd.mes;

GRANT SELECT ON public.vista_dashboard_saldos TO anon;
GRANT SELECT ON public.vista_dashboard_saldos TO authenticated;
GRANT SELECT ON public.vista_dashboard_saldos TO service_role;
