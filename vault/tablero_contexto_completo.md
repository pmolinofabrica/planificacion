# Tablero — Contexto Completo del Proyecto

## Qué es este sistema

"Tablero" es una **app Next.js (Vite + React + TypeScript)** que centraliza la gestión operativa de Residentes (RRHH) en un hospital. Reemplazó completamente el ecosistema anterior basado en Google Apps Script y Google Sheets, que tenía bugs de sincronización, triggers en conflicto y datos inconsistentes.

El backend es **Supabase** (PostgreSQL en sa-east-1). La app se despliega en **Netlify**, con variables de entorno seguras. No hay API propia: el frontend habla directamente con Supabase usando la `anon_key` pública protegida con RLS.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Styling | Tailwind CSS v4 |
| Router | React Router DOM v7 |
| Tablas | TanStack Table v8 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deploy | Netlify |
| DB Admin | psql / Supabase Studio |

---

## Módulos de la App (pestañas del menú)

### 📌 `/convocatorias` — Convocatorias (módulo estrella, alto tráfico)

**¿Para qué?**  
Registrar y gestionar los turnos de capacitación asignados a cada residente. Es el módulo más usado, con cientos de filas por mes.

**Flujo de uso:**
1. Seleccionás el mes y año en el filtro superior.
2. Usás el **Buscador de Planificaciones** (panel azul) para encontrar el `id_plani` correspondiente a una fecha/turno. Ingresás el día (número) y el mes, seleccionás el turno del desplegable, hacés click en Buscar → aparecen tarjetas con el ID. Hacés click en la tarjeta para copiar el ID al portapapeles.
3. Para cargar en masa: usás los botones **+ Grupo A** (18 filas con los 18 residentes del Grupo A), **+ Grupo B**, o **+36 (Todos)**.
4. Cada fila queda en estado borrador. Completás `id_plani` pegando el valor copiado. Guardás con el botón amarillo.
5. El `estado` de la convocatoria puede ser: `vigente`, `cumplida`, `cancelada`. Si cancelás una convocatoria, el trigger `trg_sync_cap_on_status_change` en Supabase actualiza automáticamente la asistencia en `capacitaciones_participantes`.

**⚠️ Decisión arquitectónica:** Las convocatorias nunca se borran físicamente. "Cancelar" = cambiar `estado` a `cancelada`. Esto preserva el historial sin romper el módulo de menú (asignación a dispositivos), que es un sistema independiente.

**Tablas Supabase:** `convocatoria`, `vista_convocatoria_completa`, `datos_personales`, `turnos`

---

### 📌 `/planificacion` — Planificación Base

**¿Para qué?**  
La matriz maestra de cupos por día y turno. Define cuántos residentes puede recibir cada turno en cada día del mes. Las convocatorias se relacionan con estas planificaciones a través del `id_plani`.

**Flujo de uso:**
1. Filtrás por Mes y Año.
2. Las columnas "Día" y "Turno" son selectores cargados desde los catálogos (`dias`, `turnos`) para el mes elegido. No tipear IDs.
3. El campo "Grupo" acepta solo A o B.
4. Podés clonar filas (📑) para armar rápidamente estructuras repetitivas.
5. Guardar con el botón amarillo.

**Tablas Supabase:** `planificacion`, `dias`, `turnos`, `vista_planificacion_anio`

---

### 📌 `/agentes` — Agentes

**¿Para qué?**  
Datos personales de los residentes. No filtra por año (hay residentes de múltiples cohortes activas simultáneamente).

**Tablas Supabase:** `datos_personales`  
**Columna clave:** `grupo_capacitacion` (A o B) — alimenta los botones de bulk en Convocatorias. `cohorte` define el año de ingreso.

---

### 📌 `/inasistencias` — Inasistencias

**¿Para qué?**  
Registrar las ausencias de los residentes en turnos de capacitación.

**Tablas Supabase:** `inasistencias`

---

### 📌 `/descansos` — Descansos

**¿Para qué?**  
Gestionar solicitudes de descanso compensado. El flujo completo es:
1. El residente carga su solicitud (entra como `pendiente`).
2. En la app, el supervisor tilta una o varias filas y hace click en **✅ Asignar Descanso → el trigger `trg_asignar_descanso_aprobado` de Supabase crea automáticamente la fila en `convocatoria` con el `id_turno` de descanso (20)**.
3. El campo `fecha_solicitud` (cuándo se cargó al sistema) es la fuente de filtro del selector de Mes en la barra superior. El `dia_solicitado` es el día que quiere tomar el descanso.

**Tablas Supabase:** `descansos`, `datos_personales`

---

### 📌 `/certificados` — Certificados

**¿Para qué?**  
Registro de certificados presentados por los residentes (licencias, justificaciones).

**Tablas Supabase:** `certificados`

---

### 📌 `/capacitaciones` — Capacitaciones (Módulo interno)

**¿Para qué?**  
Registro de las capacitaciones que el hospital dicta. Cada capacitación está vinculada a una planificación.

**Importante:** "Capacitación" y "menú" (asignación a dispositivos) son esquemas SEPARADOS. Una no debe afectar a la otra si se cancela.

**Tablas Supabase:** `capacitaciones`, `capacitaciones_participantes`

---

### 📌 `/caps_dispositivos` — Caps Asignadas

**¿Para qué?**  
Ver qué capacitaciones tienen asignados dispositivos y en qué fechas.

**Tablas Supabase:** `capacitaciones_dispositivos`

---

### 📌 `/dispositivos` — Dispositivos

**¿Para qué?**  
Catálogo de dispositivos (ej: salas, equipos) habilitados para recibir residentes.

**Tablas Supabase:** `dispositivos`

---

### 📌 `/turnos` — Turnos

**¿Para qué?**  
Catálogo de tipos de turno (Mañana, Tarde, Capacitación, Descanso, etc.). El `id_turno` de descanso es `20`.

**Tablas Supabase:** `turnos`

---

### 📌 `/saldos` — Saldos

**¿Para qué?**  
Dashboard de horas acumuladas por residente. Se calculan con el RPC `rpc_calcular_saldos_mes(p_anio, p_mes)`.

**⚠️ Corrección aplicada (Marzo 2026):** El RPC ahora filtra por `dp.cohorte = p_anio` para evitar calcular saldos de residentes de cohortes pasadas.

**Tablas Supabase:** `saldos`, `datos_personales`

---

## Componentes Clave del Frontend

### `DataTable.tsx` — Componente Maestro de Grilla

El corazón de la app. Todas las pestañas lo usan. Propiedades importantes:

| Prop | Tipo | Para qué |
|---|---|---|
| `tableName` | string | Nombre de la tabla Supabase destino del batch |
| `pkField` | keyof T | Campo PK para identificar filas |
| `initialData` | T[] | Datos iniciales |
| `columns` | ColumnDef[] | Definición de columnas (usar `editableColumn()`) |
| `buildNewRow` | () => T | Template de fila nueva |
| `enableClone` | boolean | Activa botones +18/+36 y clonado |
| `bulkRows` | T[] | Filas inyectadas desde el padre (Grupo A/B) |
| `onBulkRowsConsumed` | () => void | Callback después de consumir bulkRows |
| `extraToolbar` | ReactNode | JSX extra en la barra de herramientas |
| `customMassActions` | Array\<{label, onClick, className}\> | Botones que aparecen al seleccionar filas |

**Flujo de guardado:** Los cambios son locales hasta que el usuario hace click en el botón amarillo "Guardar Cambios (N)". Los INSERTs van a la tabla directamente, sin RPCs intermedios.

### `EditableCell.tsx` — Celda Editable

Soporta tipos: `text`, `number`, `select`, `boolean`, `date`, `time`.

**Bug crítico resuelto (Marzo 2026):** Había un bug donde al hacer click en una celda de un selector (ej: Agente) la pantalla quedaba en blanco. Causa: el `draft` state no se sincronizaba con el `value` externo cuando el componente padre recargaba con datos nuevos. Se corrigió con un `useEffect` de sincronización.

---

## Base de Datos — Arquitectura

### Tablas Principales
- `dias` — Calendario con `id_dia, fecha, mes, anio, es_feriado`
- `turnos` — Catálogo `id_turno, tipo_turno, cant_horas, activo`
- `planificacion` — Matriz `id_plani, id_dia, id_turno, cant_residentes_plan, grupo`
- `convocatoria` — Asignaciones `id_convocatoria, id_plani, id_agente, estado`
- `datos_personales` — Residentes `id_agente, nombre, apellido, dni, cohorte, activo, grupo_capacitacion`
- `descansos` — `id_desc, id_agente, dia_solicitado, fecha_solicitud, mes_solicitado, estado`
- `capacitaciones` — Eventos de capacitación internos
- `capacitaciones_participantes` — Asistencia real por capacitación
- `saldos` — Horas acumuladas por residente/mes/año

### Vistas en uso
- `vista_planificacion_anio` — Planificación con fecha/tipo de turno expandidos. Incluye `grupo`.
- `vista_convocatoria_completa` — Convocatorias con datos de agente, fecha, turno.

### Triggers Activos (Marzo 2026)
| Trigger | Evento | Efecto |
|---|---|---|
| `trg_sync_cap_on_status_change` | UPDATE en `convocatoria.estado` → `cancelada` | Marca `asistio=FALSE` en `capacitaciones_participantes` |
| `trg_asignar_descanso_aprobado` | UPDATE en `descansos.estado` → `asignado` | Crea fila en `convocatoria` con turno descanso |

### RPCs Disponibles
- `rpc_calcular_saldos_mes(p_anio, p_mes)` — Calcula y upsertea saldos del mes, solo para la cohorte del año dado.

---

## Variables de Entorno Requeridas

```
VITE_SUPABASE_URL=https://[proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key_publica]
```

El archivo `.env.local` **NUNCA se commitea** (está en `.gitignore`).

Para Netlify, estas variables se configuran en: **Site Settings → Environment Variables**.

---

## Preguntas que siempre surgen al inicio de una sesión nueva

1. **¿Hay conexión con la DB?** — Conectarse via psql directo usando la direct URL a Supabase.
2. **¿Cuáles son los 18 residentes del Grupo A y Grupo B?** — Consultar `datos_personales` con `activo=true AND cohorte=[año actual] ORDER BY apellido` y `grupo_capacitacion`.
3. **¿Qué triggers están activos?** — Consultar `pg_trigger` en Supabase.
4. **¿Hay `.env.local` en `frontend/`?** — Verificar antes de cualquier prueba local.
5. **¿El `id_turno` de Descanso sigue siendo 20?** — Verificar en tabla `turnos`.

---

## Reglas de Oro (no negociables)

1. **Nunca borrar convocatorias.** Solo cancelar cambiando `estado`.
2. **El menú (asignación de dispositivos) es un esquema independiente.** No tocar cuando se modifica una convocatoria.
3. **No agregar filtro de año en Agentes.** El módulo muestra todos los activos de todas las cohortes.
4. **Los secrets van siempre en `.env.local`**, jamás hardcodeados en código.
5. **Siempre verificar el build** (`npm run build`) antes de pushear.
6. **El RPC de saldos filtra por cohorte = p_anio.** No modificar esa lógica.

---

## Estado del Proyecto (Marzo 2026)

- ✅ Backend limpio (triggers redundantes del legacy GAS eliminados)
- ✅ Frontend funcional en todos los módulos
- ✅ Bug de pantalla en blanco en EditableCell corregido
- ✅ Convocatorias: bulk Grupo A/B, buscador de planificaciones, selectores de turno
- ✅ Planificación: filtro mensual, selectores relacionales en memoria
- ✅ Descansos: bulk "Asignar Descanso" con trigger automático en backend
- ✅ RPC saldos corregido para filtrar por cohorte
- ✅ Deploy configurado en Netlify
