-- ============================================================
-- Fix: permisos + trigger auto-creacion certificaciones_servicio
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- 1. GRANTs faltantes
GRANT SELECT, INSERT, UPDATE, DELETE ON certificaciones_servicio TO authenticated;
GRANT SELECT ON certificaciones_servicio TO service_role;
GRANT SELECT ON certificaciones_servicio TO anon;

-- 2. CHECK constraint estado
ALTER TABLE certificaciones_servicio
  DROP CONSTRAINT IF EXISTS certificaciones_servicio_estado_check,
  DROP CONSTRAINT IF EXISTS certificado_servicio_estado_check,
  ADD CONSTRAINT certificaciones_servicio_estado_check
    CHECK (estado IN ('cancelado', 'pendiente', 'informado'));

-- 3. RLS
ALTER TABLE certificaciones_servicio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON certificaciones_servicio;
CREATE POLICY "Enable all for authenticated users" ON certificaciones_servicio
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Sequence grants
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_class WHERE relname = 'certificaciones_servicio_id_cert_serv_seq' AND relkind = 'S') THEN
    GRANT USAGE ON SEQUENCE certificaciones_servicio_id_cert_serv_seq TO authenticated, anon, service_role;
  END IF;
END $$;

-- 5. View (recrear)
DROP VIEW IF EXISTS vista_certificaciones_servicio;
CREATE VIEW vista_certificaciones_servicio AS
SELECT
  cs.id_cert_serv,
  cs.id_agente,
  dp.apellido || ', ' || dp.nombre AS agente,
  dp.dni,
  cs.id_inasistencia,
  i.fecha_inasistencia,
  i.motivo AS motivo_inasistencia,
  cs.horas_descontar,
  cs.mes_informado,
  cs.estado,
  cs.created_at,
  cs.updated_at,
  COALESCE((
    SELECT SUM(vcc.cant_horas)
    FROM vista_convocatoria_completa vcc
    WHERE vcc.id_agente = cs.id_agente
      AND vcc.fecha_turno = i.fecha_inasistencia
  ), 0) AS horas_convocatoria
FROM certificaciones_servicio cs
JOIN datos_personales dp ON cs.id_agente = dp.id_agente AND dp.activo = true
JOIN inasistencias i ON cs.id_inasistencia = i.id_inasistencia;

GRANT SELECT ON vista_certificaciones_servicio TO authenticated, anon;

-- 6. Función trigger: auto-crear fila en certificaciones_servicio
--    cuando se inserta una inasistencia que genera descuento
CREATE OR REPLACE FUNCTION public.fn_auto_certificacion_servicio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Solo para inasistencias que generan descuento (injustificadas / tardanzas 6ta)
  -- O cuando estado = 'injustificada' o genera_descuento = true
  IF NEW.genera_descuento = TRUE OR NEW.estado = 'injustificada' OR NEW.motivo = 'injustificada' THEN
    INSERT INTO certificaciones_servicio (
      id_agente,
      id_inasistencia,
      horas_descontar,
      mes_informado,
      estado
    ) VALUES (
      NEW.id_agente,
      NEW.id_inasistencia,
      0,
      EXTRACT(MONTH FROM NEW.fecha_inasistencia),
      'pendiente'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 7. Trigger AFTER INSERT en inasistencias
DROP TRIGGER IF EXISTS trg_auto_certificacion_servicio ON inasistencias;
CREATE TRIGGER trg_auto_certificacion_servicio
  AFTER INSERT ON inasistencias
  FOR EACH ROW
  WHEN (NEW.genera_descuento = TRUE OR NEW.estado = 'injustificada' OR NEW.motivo = 'injustificada')
  EXECUTE FUNCTION public.fn_auto_certificacion_servicio();

-- 8. Backfill: crear filas faltantes para inasistencias injustificadas existentes
INSERT INTO certificaciones_servicio (id_agente, id_inasistencia, horas_descontar, mes_informado, estado)
SELECT
  i.id_agente,
  i.id_inasistencia,
  0,
  EXTRACT(MONTH FROM i.fecha_inasistencia),
  'pendiente'
FROM inasistencias i
LEFT JOIN certificaciones_servicio cs ON cs.id_inasistencia = i.id_inasistencia
WHERE cs.id_inasistencia IS NULL
  AND (i.genera_descuento = TRUE OR i.estado = 'injustificada' OR i.motivo = 'injustificada')
ON CONFLICT DO NOTHING;
