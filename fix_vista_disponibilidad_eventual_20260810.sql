CREATE OR REPLACE VIEW public.vista_disponibilidad_eventual AS
 SELECT de.id,
    d.fecha,
    d.numero_dia_semana AS dia_semana,
        CASE d.numero_dia_semana
            WHEN 0 THEN 'domingo'::text
            WHEN 1 THEN 'lunes'::text
            WHEN 2 THEN 'martes'::text
            WHEN 3 THEN 'miércoles'::text
            WHEN 4 THEN 'jueves'::text
            WHEN 5 THEN 'viernes'::text
            WHEN 6 THEN 'sábado'::text
            ELSE NULL::text
        END AS tipo_dia,
    dp.id_agente,
    (((dp.apellido)::text || ', '::text) || (dp.nombre)::text) AS agente,
    de.grupo,
    de.observaciones
   FROM ((public.disponibilidad_eventual de
     LEFT JOIN public.dias d ON ((d.id_dia = de.id_dia)))
     LEFT JOIN public.datos_personales dp ON ((dp.id_agente = de.id_agente)));

GRANT SELECT ON public.vista_disponibilidad_eventual TO anon;
GRANT SELECT ON public.vista_disponibilidad_eventual TO authenticated;
GRANT SELECT ON public.vista_disponibilidad_eventual TO service_role;
