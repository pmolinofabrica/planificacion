# Documentación de consultas SQL — Proceso disponibilidad

Fecha: 2026-08-11
Objetivo general: entender y ajustar la tabla `agentes_grupos_dias`, y crear una vista de disponibilidad eventual para un popup de consulta en la página de Convocatorias.

---

## 1. Inspeccionar las CHECK constraints de `agentes_grupos_dias`

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.agentes_grupos_dias'::regclass;
```

**Explicación técnica:** consulta el catálogo de sistema `pg_catalog.pg_constraint`, filtrando por `conrelid` (OID de la tabla `agentes_grupos_dias`). `pg_get_constraintdef(oid)` reconstruye el texto de la definición de cada constraint (CHECK, PRIMARY KEY, FOREIGN KEY) tal como fue creada.

**Objetivo:** descubrir qué reglas operan sobre la tabla, en particular la del check de la columna `grupo`. Resultado: `chk_grupo` = `CHECK (grupo IN ('manana','tarde'))`, más `chk_dia_semana`, la PK `(id_agente, dia_semana)` y el FK a `datos_personales`.

### Variante con `information_schema`

```sql
SELECT tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'agentes_grupos_dias'
  AND tc.constraint_type = 'CHECK';
```

**Explicación técnica:** `information_schema` es una capa estándar SQL (ISO) que expone las mismas restricciones de forma legible: `check_clause` contiene la expresión textual del CHECK.

**Objetivo:** alternativa más portátil a `pg_constraint` para ver la cláusula exacta de los CHECK.

---

## 2. Ampliar el check `chk_grupo` con 3 opciones nuevas

```sql
ALTER TABLE public.agentes_grupos_dias DROP CONSTRAINT chk_grupo;

ALTER TABLE public.agentes_grupos_dias
  ADD CONSTRAINT chk_grupo
  CHECK (grupo IN ('manana', 'tarde', '10 a 12', '12 a 14', '14 a 16'));
```

**Explicación técnica:** PostgreSQL no permite modificar un CHECK en el lugar; hay que eliminarlo (`DROP CONSTRAINT`) y volver a crearlo (`ADD CONSTRAINT`) con el mismo nombre y una lista ampliada. Si ya existieran filas con valores fuera de la lista nueva, el `ADD CONSTRAINT` fallaría por violación del check.

**Objetivo:** permitir que la columna `grupo` aceptara también los rangos horarios "10 a 12", "12 a 14" y "14 a 16".

> NOTA: este cambio se revirtió (ver sección 4) porque el caso resultó ser "eventual" y se resolvió con una tabla aparte `disponibilidad_eventual`.

---

## 3. Limpiar filas que quedarían fuera del check original

```sql
DELETE FROM public.agentes_grupos_dias
WHERE grupo IN ('10 a 12', '12 a 14', '14 a 16');
```

**Explicación técnica:** borra las filas cuyo `grupo` no está en la lista permitida. Es un prerequisito para poder recrear la constraint sin que falle por datos existentes.

**Objetivo:** dejar la tabla consistente antes de volver a aplicar el check original.

---

## 4. Revertir el check a su estado original

```sql
ALTER TABLE public.agentes_grupos_dias DROP CONSTRAINT chk_grupo;

ALTER TABLE public.agentes_grupos_dias
  ADD CONSTRAINT chk_grupo
  CHECK (grupo IN ('manana', 'tarde'));
```

**Explicación técnica:** idéntica mecánica a la sección 2 pero restaurando la lista original de dos valores.

**Objetivo:** devolver `grupo` a su regla original (`'manana' | 'tarde'`) tras decidir que la disponibilidad por rangos horarios va a una tabla nueva (`disponibilidad_eventual`).

---

## 5. Crear vista `vista_disponibilidad_eventual` (versión 1 — isodow)

```sql
CREATE OR REPLACE VIEW public.vista_disponibilidad_eventual AS
 SELECT de.id,
    d.fecha,
    (EXTRACT(isodow FROM d.fecha))::integer AS dia_semana,
        CASE (EXTRACT(isodow FROM d.fecha))
            WHEN 1 THEN 'lunes'::text
            WHEN 2 THEN 'martes'::text
            WHEN 3 THEN 'miércoles'::text
            WHEN 4 THEN 'jueves'::text
            WHEN 5 THEN 'viernes'::text
            WHEN 6 THEN 'sábado'::text
            WHEN 7 THEN 'domingo'::text
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
```

**Explicación técnica:**
- `CREATE OR REPLACE VIEW`: crea la vista o la reemplaza si ya existe.
- `LEFT JOIN` con `dias` (para resolver la fecha) y con `datos_personales` (para el nombre del residente): LEFT porque no se quiere perder filas aunque falte el día o el agente.
- `EXTRACT(isodow FROM d.fecha)`: número de día de semana ISO (1 = lunes … 7 = domingo).
- `CASE`: traduce ese número al nombre en español (`tipo_dia`).
- Nombre del agente concatenado como `"Apellido, Nombre"`, siguiendo la convención del proyecto.
- `GRANT SELECT` a los roles `anon`, `authenticated` y `service_role` para que la vista sea legible desde el frontend (que usa la clave anon).

**Objetivo:** exponer de forma legible la disponibilidad eventual (fecha, tipo de día, residente, grupo y observación) para mostrarla en un popup sin repetir la lógica de join en cada consulta.

> NOTA: esta versión usaba `isodow` (1-7). Se detectó que la tabla `dias.numero_dia_semana` usa la convención 0-6 (0 = domingo), por lo que el número `dia_semana` no era consistente con el resto del proyecto. Se corrigió en la sección 6.

---

## 6. Crear vista corregida `vista_disponibilidad_eventual` (versión 2 — `numero_dia_semana`)

```sql
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
```

**Explicación técnica:** igual a la sección 5, pero:
- `dias_semana` ahora toma directamente `d.numero_dia_semana` (0 = domingo … 6 = sábado), la convención que usa la tabla `dias` en todo el proyecto.
- El `CASE` se evalúa sobre `numero_dia_semana` y por eso el `WHEN 0` es 'domingo'.

**Objetivo:** que el campo numérico `dia_semana` de la vista sea consistente con `dias.numero_dia_semana` y con el resto del código (por ejemplo la generación de saldos que excluye `ARRAY[0,6]` como fines de semana).

---

## Notas de verificación (consultas ad-hoc vía REST/Supabase)

Durante el proceso también se ejecutaron consultas de verificación contra la API REST de Supabase (equivalente a `SELECT` simples), por ejemplo:

- `GET /rest/v1/agentes_grupos_dias?select=*&limit=3` → confirmar existencia y lectura de la tabla.
- `GET /rest/v1/vista_disponibilidad_eventual?select=*&limit=10` → validar que la vista devolvía fecha, tipo de día, agente y grupo correctos.
- `GET /rest/v1/dias?select=fecha,numero_dia_semana&fecha=gte.2025-01-19&fecha=lte.2025-01-25` → confirmar que `numero_dia_semana` va de 0 (domingo) a 6 (sábado), lo que motivó la corrección de la vista.

Estas no son SQL directo, pero sirvieron para validar el comportamiento de la base en cada paso.
