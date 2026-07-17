-- ============================================================
-- Fix: permitir borrar inasistencias con certificaciones_servicio
-- Agrega ON DELETE CASCADE a la FK de certificaciones_servicio
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- 1. Eliminar la FK existente (cualquiera de los nombres posibles)
ALTER TABLE certificaciones_servicio
  DROP CONSTRAINT IF EXISTS certificado_servicio_id_inasistencia_fkey,
  DROP CONSTRAINT IF EXISTS certificaciones_servicio_id_inasistencia_fkey;

-- 2. Recrear la FK con ON DELETE CASCADE
--    Buscar dinámicamente si hay otra FK con ese nombre
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'certificaciones_servicio'
    AND con.contype = 'f'
    AND con.confrelid = 'inasistencias'::regclass
  LIMIT 1;

  IF fk_name IS NOT NULL AND fk_name NOT IN ('certificado_servicio_id_inasistencia_fkey', 'certificaciones_servicio_id_inasistencia_fkey') THEN
    EXECUTE format('ALTER TABLE certificaciones_servicio DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- 3. Agregar la FK con CASCADE
ALTER TABLE certificaciones_servicio
  ADD CONSTRAINT certificaciones_servicio_id_inasistencia_fkey
    FOREIGN KEY (id_inasistencia)
    REFERENCES inasistencias(id_inasistencia)
    ON DELETE CASCADE;

-- 4. Verificar que se aplicó correctamente
SELECT
  tc.constraint_name,
  tc.constraint_type,
  ccu.table_name AS referenced_table,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.constraint_schema = ccu.constraint_schema
WHERE tc.table_name = 'certificaciones_servicio'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'inasistencias';
