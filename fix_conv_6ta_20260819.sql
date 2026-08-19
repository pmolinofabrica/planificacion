ALTER TABLE public.inasistencias
  ADD COLUMN IF NOT EXISTS conv_6ta BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conv_6ta_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.fn_touch_conv_6ta_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.conv_6ta IS DISTINCT FROM OLD.conv_6ta THEN
        NEW.conv_6ta_updated_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_touch_conv_6ta_updated_at ON public.inasistencias;

CREATE TRIGGER trg_touch_conv_6ta_updated_at
BEFORE INSERT OR UPDATE OF conv_6ta ON public.inasistencias
FOR EACH ROW EXECUTE FUNCTION public.fn_touch_conv_6ta_updated_at();

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
    i.certificado_presentado,
    i."6ta_tardanza",
    i.conv_6ta,
    i.conv_6ta_updated_at,
    i.observaciones,
    i.fecha_aviso
   FROM (inasistencias i
     JOIN datos_personales p ON ((i.id_agente = p.id_agente)));

GRANT SELECT ON public.vista_inasistencias_completa TO anon;
GRANT SELECT ON public.vista_inasistencias_completa TO authenticated;
GRANT SELECT ON public.vista_inasistencias_completa TO service_role;