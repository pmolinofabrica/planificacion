# Auditoría de Índices: Tabla `convocatoria`

## Estado Actual

| Índice | Definición | Análisis |
|--------|-----------|----------|
| `convocatoria_pkey` | `(id_convocatoria)` | ✅ OK — PK estándar |
| `convocatoria_unicidad` | `UNIQUE (id_plani, id_agente)` | ✅ OK — Garantiza un agente por planificación |
| `idx_conv_agente` | `(id_agente)` | ✅ OK — Filtrado por agente |
| `idx_conv_agente_fecha_estado` | `(id_agente, fecha_convocatoria, estado)` | ⚠️ PROBLEMATICO — Usa `fecha_convocatoria` que es la FECHA DE CREACIÓN, no la operativa |
| `idx_conv_estado` | `(estado)` | ✅ OK — Filtrado por estado |
| `idx_conv_fecha` | `(fecha_convocatoria)` | ⚠️ PROBLEMATICO — Indexa la fecha de creación, no la fecha operativa |
| `idx_conv_plani` | `(id_plani)` | ✅ OK — ESTE es el índice clave para llegar a la fecha operativa via planificación |

## Hallazgo Crítico

> 🔴 **REGLA DE ORO #1 en acción**

Los índices `idx_conv_fecha` e `idx_conv_agente_fecha_estado` indexan `fecha_convocatoria`, 
que es la **fecha de creación del registro**, NO la fecha del turno.

La fecha operativa real se obtiene vía:
```
convocatoria.id_plani → planificacion.id_dia → dias.fecha
```

### ¿Qué hacer?

**Opción 1 — No tocar (recomendado por ahora):**
- Los índices existentes no molestan, solo ocupan espacio
- El índice `idx_conv_plani` sobre `(id_plani)` ya existe y es el que realmente importa
- Las vistas ya hacen el JOIN correcto
- No agregar más índices sobre `fecha_convocatoria` pensando que es la fecha del turno

**Opción 2 — Limpiar (futuro):**
- Evaluar si `idx_conv_fecha` y `idx_conv_agente_fecha_estado` se usan en alguna query
- Si no se usan, eliminarlos para ahorrar espacio y overhead en inserts

## Conclusión
✅ El índice `idx_conv_plani` sobre `(id_plani)` **ya existe** y es el importante.
⚠️ Los dos índices sobre `fecha_convocatoria` no son errores graves pero son misleading y no deberían usarse para filtrar por "fecha de turno".
