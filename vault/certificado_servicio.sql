-- ===== TABLE: certificado_servicio =====
CREATE TABLE IF NOT EXISTS certificado_servicio (
  id_cert_serv BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_agente BIGINT NOT NULL REFERENCES datos_personales(id_agente),
  id_inasistencia BIGINT NOT NULL REFERENCES inasistencias(id_inasistencia),
  horas_descontar NUMERIC(5,1) DEFAULT 0,
  cuerpo_texto TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificado_servicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON certificado_servicio
  FOR ALL USING (auth.role() = 'authenticated');

-- ===== VIEW: vista_cert_servicio =====
CREATE OR REPLACE VIEW vista_cert_servicio AS
SELECT
  cs.id_cert_serv,
  cs.id_agente,
  dp.apellido || ', ' || dp.nombre AS agente,
  dp.dni,
  cs.id_inasistencia,
  i.fecha_inasistencia,
  i.motivo AS motivo_inasistencia,
  cs.horas_descontar,
  cs.cuerpo_texto,
  cs.created_at,
  COALESCE((
    SELECT SUM(vcc.cant_horas)
    FROM vista_convocatoria_completa vcc
    WHERE vcc.id_agente = cs.id_agente
      AND vcc.anio = EXTRACT(YEAR FROM i.fecha_inasistencia)
  ), 0) AS horas_convocatoria
FROM certificado_servicio cs
JOIN datos_personales dp ON cs.id_agente = dp.id_agente AND dp.activo = true
JOIN inasistencias i ON cs.id_inasistencia = i.id_inasistencia;
