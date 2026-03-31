# Estrategia de Trabajo: Tablero Supabase

Última actualización: 2026-03-27

## Stack Definido (FINAL)
- **Frontend:** React + Vite + TanStack Table + TypeScript
- **Backend:** Supabase (Plan Free) — Auth, Postgres, REST API
- **Edición masiva:** Lógica custom sobre TanStack Table (NO AG Grid)
- **Filosofía:** Frontend simple → Supabase con inteligencia moderada

## Origen y Contexto
El sistema anterior vivía en Google Apps Script (`historico/`), con lógica relacional pesada en JS puro sincronizando bidireccionalmente entre Google Sheets y Supabase.

La decisión de migrar responde a:
1. Eliminar la lógica pesada del frontend
2. Centralizar operaciones complejas en RPCs SQL (solo donde sea necesario)
3. Usar vistas para simplificar la lectura
4. Iniciar simple e ir agregando complejidad paulatinamente

## Material Compilado en el Vault

| Archivo | Estado | Contenido |
|---------|--------|-----------|
| `schema.md` | ✅ Extraído | Tablas, columnas, tipos (public) |
| `triggers.sql` | ✅ Extraído | 31 triggers activos |
| `reglas_de_oro.md` | ✅ Creado | 6 reglas inquebrantables del proyecto |
| `functions_rpc.md` | ✅ Extraído | 35 funciones (27 trigger functions + 7 RPCs + 1 extra) |
| `indexes.md` | ✅ Extraído | Todos los índices de 27 tablas |
| `views_definitions.sql` | ✅ Extraído | SQL completo de todas las vistas |
| `auditoria_indices_convocatoria.md` | ✅ Creado | Análisis de índices problemáticos en convocatoria (Regla de Oro #1) |

## Decisiones Clave Tomadas

### Triggers → Mínimo uso
- Solo mantener triggers livianos
- Preferir RPCs explícitas sobre automatización
- Auditoría pendiente de los 31 triggers existentes

### Batching → Frontend con control de errores
- Max 100 registros por request
- NO usar RPCs para bulk inserts (difícil debug, menos flexibilidad)
- Control de errores **por fila** (identificar cuáles fallaron, retry)
- Orden de ejecución: Inserts → Updates → Deletes

### Tipado → TypeScript obligatorio
- Interfaces para cada tabla
- Mapping explícito frontend ↔ DB
- Manejo de nulls como caso esperado

## Pendientes Inmediatos
1. Extraer funciones, índices y vistas desde Dashboard de Supabase (pooler con latencia)
2. Auditar triggers (clasificar: mantener / migrar a RPC / eliminar)
3. Inicializar proyecto React + Vite + TS
4. Generar tipos TS desde schema
5. Primer CRUD funcional: tabla `turnos` (la más simple)
