-- Fix para el trigger de capacitaciones
-- Actualiza la función fn_unificada_crear_capacitacion para que use ILIKE y detecte correctamente
-- los tipos de turno "Capacitación interna" y "Capacitación general".

CREATE OR REPLACE FUNCTION public.fn_unificada_crear_capacitacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 DECLARE
     v_es_turno_cap BOOLEAN;
 BEGIN
     -- Verificamos si el turno insertado es de tipo capacitación
     -- Usamos ILIKE para coincidir con "Capacitación interna", "Capacitación general", etc.
     SELECT (tipo_turno ILIKE '%capacitaci%n%') INTO v_es_turno_cap
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
$function$;
