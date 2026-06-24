-- ===== TABLE: certificaciones_servicio =====
-- Already exists in Supabase with columns:
--   id_cert_serv, id_agente, id_inasistencia, horas_descontar, cuerpo_texto,
--   created_at, updated_at, mes_informado, estado

-- ===== ADD CHECK constraint for estado =====
ALTER TABLE certificaciones_servicio
  DROP CONSTRAINT IF EXISTS certificaciones_servicio_estado_check,
  DROP CONSTRAINT IF EXISTS certificado_servicio_estado_check,
  ADD CONSTRAINT certificaciones_servicio_estado_check
    CHECK (estado IN ('cancelado', 'pendiente', 'informado'));

-- ===== GRANT permissions =====
GRANT SELECT, INSERT, UPDATE, DELETE ON certificaciones_servicio TO authenticated;
GRANT SELECT ON certificaciones_servicio TO anon;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_class WHERE relname = 'certificaciones_servicio_id_cert_serv_seq' AND relkind = 'S') THEN
    GRANT USAGE ON SEQUENCE certificaciones_servicio_id_cert_serv_seq TO authenticated, anon;
  END IF;
END $$;

ALTER TABLE certificaciones_servicio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON certificaciones_servicio;
CREATE POLICY "Enable all for authenticated users" ON certificaciones_servicio
  FOR ALL USING (auth.role() = 'authenticated');

-- ===== VIEW: vista_certificaciones_servicio =====
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
