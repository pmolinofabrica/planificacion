# Reglas de Oro — Proyecto Tablero Supabase

Estas reglas son **inquebrantables**. Cualquier decisión técnica debe validarse contra ellas.

---

## 🥇 #1 — `fecha_convocatoria` NO es la fecha operativa

- `convocatoria.fecha_convocatoria` = **fecha de creación del registro** (timestamp administrativo)
- La fecha del turno viene de `id_planificacion` → `planificacion.id_dia` → `dias.fecha`
- **TODO filtrado, indexado y visualización** debe usar la fecha de planificación
- **NUNCA** usar `fecha_convocatoria` como si fuera la fecha del turno

---

## 🥇 #2 — NO replicar lógica pesada en frontend

- La complejidad de Apps Script fue un error de arquitectura
- El nuevo sistema arranca **simple** y agrega complejidad **paulatinamente**
- Los archivos `.gs` (en `historico/`) sirven como **memoria histórica**, no como blueprint
- Si algo puede resolverse con una vista SQL simple, NO escribir lógica en React

---

## 🥇 #3 — Triggers: mínimo imprescindible

- Cada INSERT = 1 ejecución de trigger
- Batch de 100 = **100 ejecuciones**
- Plan free de Supabase → puede matar el rendimiento
- **Usar triggers SOLO si:**
  - Son livianos (no hacen queries adicionales pesadas)
  - No insertan/actualizan otras tablas
- **Preferir RPCs controladas** sobre triggers automáticos
- Antes de crear un trigger, preguntarse: "¿puedo hacer esto en un RPC que llamo explícitamente?"

---

## 🥇 #4 — Batch con control de errores por fila

- Si fallan 3 de 100 inserts, **no romper todo**
- Identificar **cuáles** fallaron
- Los exitosos se mantienen
- Permitir **retry** de las filas con error
- Orden de ejecución: **Inserts → Updates → Deletes**

---

## 🥇 #5 — Simplificar siempre

- Priorizar: **EFICIENCIA > perfección teórica**
- NO sobre-ingeniería
- Si funciona con una query simple, no crear una función SQL
- Si funciona con un insert directo, no crear un RPC
- RPCs solo para lógica que **necesita** cruzar datos entre tablas

---

## 🥇 #6 — Plan Free de Supabase es el límite

- Máximo 3 usuarios (1 frecuente)
- Minimizar cantidad de requests
- Evitar overfetching (solo columnas necesarias)
- Usar batching (≤100 por request)
- Mantener cache local en frontend
- Evitar queries por fila individual
- Trabajar SOLO con datos del año en curso
