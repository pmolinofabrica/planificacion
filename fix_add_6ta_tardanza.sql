ALTER TABLE public.inasistencias
ADD COLUMN IF NOT EXISTS "6ta_tardanza" BOOLEAN NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.vista_inasistencias_completa CASCADE;

CREATE OR REPLACE VIEW public.vista_inasistencias_completa AS
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
    i."6ta_tardanza",
    i.observaciones,
    i.fecha_aviso
   FROM (inasistencias i
     JOIN datos_personales p ON ((i.id_agente = p.id_agente)));

GRANT SELECT ON public.vista_inasistencias_completa TO anon;
GRANT SELECT ON public.vista_inasistencias_completa TO authenticated;
GRANT SELECT ON public.vista_inasistencias_completa TO service_role;
