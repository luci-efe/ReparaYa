#### 4.1.11 Disponibilidad de Contratistas (Contractor Availability)

**Referencia de spec:** `/openspec/specs/contractor-availability/spec.md`
**Propuesta relacionada:** `/openspec/changes/2025-11-20-contractor-availability/proposal.md`

**Criterios de aceptación generales:**
- Cobertura de código ≥ 70% en módulo `src/modules/contractors/availability`
- Todos los tests unitarios e integración deben pasar (25 casos)
- Tests E2E de flujo de gestión de disponibilidad ejecutados
- Performance: generación de slots P95 ≤ 800ms, P99 ≤ 1.2s
- Pruebas de A11y: 0 violaciones con axe-core
- Timezone conversions correctas incluyendo DST
- Race conditions en bookings manejadas correctamente

**Resumen de ejecución (última actualización: Pendiente):**
- ⏳ Tests unitarios: 0/15 ejecutados
- ⏳ Tests de integración: 0/8 ejecutados
- ⏳ Tests E2E: 0/2 ejecutados

**Casos de prueba:**

| ID | Descripción | Tipo | Requisito | Prioridad | Estado | Resultado |
|----|-------------|------|-----------|-----------|--------|-----------|
| TC-RF-CTR-AVAIL-001 | Crear horario semanal con intervalos válidos | Integración | RF-CTR-AVAIL-001 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-002 | Rechazar intervalos superpuestos en el mismo día | Unitaria | RF-CTR-AVAIL-001 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-003 | Rechazar formatos de tiempo y rangos inválidos | Unitaria | RF-CTR-AVAIL-001 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-004 | Crear excepción de cierre de día completo | Integración | RF-CTR-AVAIL-002 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-005 | Crear excepción de día festivo recurrente | Integración | RF-CTR-AVAIL-002 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-006 | Crear excepción de cierre parcial | Integración | RF-CTR-AVAIL-002 | Media | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-007 | Crear bloqueo manual exitosamente | Integración | RF-CTR-AVAIL-003 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-008 | Rechazar bloqueo que superpone reserva confirmada | Integración | RF-CTR-AVAIL-003 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-009 | Rechazar bloqueo en el pasado | Unitaria | RF-CTR-AVAIL-003 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-010 | Generar slots desde horario semanal | Unitaria | RF-CTR-AVAIL-004 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-011 | Generar slots excluyendo excepciones | Integración | RF-CTR-AVAIL-004 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-012 | Generar slots excluyendo bloqueos | Integración | RF-CTR-AVAIL-004 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-013 | Generar slots excluyendo reservas existentes | Integración | RF-CTR-AVAIL-004 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-014 | Convertir zona horaria local a UTC correctamente | Unitaria | RF-CTR-AVAIL-005 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-015 | Manejar transiciones de horario de verano correctamente | Unitaria | RF-CTR-AVAIL-005 | Media | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-016 | Verificar propiedad - dueño puede gestionar disponibilidad | Integración | RF-CTR-AVAIL-006 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-017 | Bloquear acceso entre contratistas | Integración | RF-CTR-AVAIL-006 | Alta | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-018 | Admin puede leer disponibilidad de cualquier contratista | Integración | RF-CTR-AVAIL-006 | Media | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-019 | Validar compatibilidad de slots con duraciones de servicios | Unitaria | RF-CTR-AVAIL-007 | Media | ⏳ Pendiente | - |
| TC-RF-CTR-AVAIL-020 | Advertir al contratista sobre duraciones incompatibles | Integración | RF-CTR-AVAIL-007 | Baja | ⏳ Pendiente | - |
| TC-RNF-CTR-AVAIL-001 | Performance - generación de slots P95 <= 800ms | Performance | RNF-CTR-AVAIL-001 | Alta | ⏳ Pendiente | - |
| TC-RNF-CTR-AVAIL-002 | Prevenir condición de carrera en reservas concurrentes | Integración | RNF-CTR-AVAIL-002 | Alta | ⏳ Pendiente | - |
| TC-RNF-CTR-AVAIL-003 | A11y - navegación por teclado en UI de calendario | E2E | RNF-CTR-AVAIL-003 | Alta | ⏳ Pendiente | - |
| TC-RNF-CTR-AVAIL-004 | A11y - etiquetas ARIA y soporte de lector de pantalla | E2E | RNF-CTR-AVAIL-003 | Alta | ⏳ Pendiente | - |
| TC-RNF-CTR-AVAIL-005 | Responsive móvil - vista de calendario en viewport 375px | E2E | RNF-CTR-AVAIL-004 | Media | ⏳ Pendiente | - |

---

**Procedimientos de prueba detallados:**

##### TC-RF-CTR-AVAIL-001: Crear horario semanal con intervalos válidos

**Objetivo:** Validar que un contratista puede crear su horario semanal con intervalos de tiempo válidos y sin superposiciones.

**Precondiciones:**
- Contratista autenticado con perfil verificado
- No tiene horario semanal configurado previamente
- Zona horaria del contratista configurada en ContractorServiceLocation

**Procedimiento:**
1. Autenticarse como contratista
2. Llamar a POST `/api/contractors/me/availability/schedule` con:
```json
{
  "timezone": "America/Mexico_City",
  "slotGranularityMinutes": 30,
  "weeklyRules": [
    {
      "dayOfWeek": "MONDAY",
      "intervals": [
        { "startTime": "08:00", "endTime": "12:00" },
        { "startTime": "14:00", "endTime": "18:00" }
      ]
    },
    {
      "dayOfWeek": "TUESDAY",
      "intervals": [
        { "startTime": "09:00", "endTime": "17:00" }
      ]
    }
  ]
}
```
3. Verificar respuesta HTTP 201
4. Verificar que el horario se guardó en la base de datos
5. Verificar que timezone y granularidad son correctos

**Datos de prueba:**
- Contractor ID: obtenido del usuario autenticado
- Timezone: "America/Mexico_City"
- Granularity: 30 minutos
- Lunes: 08:00-12:00, 14:00-18:00
- Martes: 09:00-17:00

**Resultado esperado:**
- ✅ Respuesta HTTP 201 Created
- ✅ Horario creado en tabla ContractorWeeklySchedule
- ✅ JSON weeklyRules almacenado correctamente
- ✅ Timezone y granularidad correctos
- ✅ No hay errores de validación

**Estado:** Pendiente
**Cobertura:** N/A

---

##### TC-RF-CTR-AVAIL-002: Rechazar intervalos superpuestos en el mismo día

**Objetivo:** Validar que el sistema rechaza horarios con intervalos superpuestos en el mismo día.

**Precondiciones:**
- Contratista autenticado

**Procedimiento:**
1. Autenticarse como contratista
2. Intentar crear horario con intervalos superpuestos:
```json
{
  "timezone": "America/Mexico_City",
  "weeklyRules": [
    {
      "dayOfWeek": "MONDAY",
      "intervals": [
        { "startTime": "08:00", "endTime": "12:00" },
        { "startTime": "11:00", "endTime": "15:00" }
      ]
    }
  ]
}
```
3. Verificar respuesta HTTP 400 Bad Request
4. Verificar mensaje de error específico

**Datos de prueba:**
- Intervalos con superposición: 08:00-12:00 y 11:00-15:00 (overlap en 11:00-12:00)

**Resultado esperado:**
- ✅ Respuesta HTTP 400 Bad Request
- ✅ Mensaje de error: "Overlapping intervals detected within the same day"
- ✅ No se crea horario en base de datos

**Estado:** Pendiente
**Cobertura:** Validador Zod

---

##### TC-RF-CTR-AVAIL-004: Crear excepción de cierre de día completo

**Objetivo:** Validar que un contratista puede crear una excepción de día completo (feriado o cierre).

**Precondiciones:**
- Contratista autenticado con horario semanal configurado

**Procedimiento:**
1. Autenticarse como contratista
2. Crear excepción de cierre completo:
```json
{
  "type": "ONE_OFF",
  "date": "2025-12-25",
  "isFullDayClosure": true,
  "reason": "Navidad"
}
```
3. Verificar respuesta HTTP 201
4. Verificar que excepción se guardó en base de datos
5. Generar slots para diciembre 25 y verificar que está vacío

**Datos de prueba:**
- Tipo: ONE_OFF
- Fecha: 2025-12-25
- Cierre completo: true
- Razón: "Navidad"

**Resultado esperado:**
- ✅ Respuesta HTTP 201 Created
- ✅ Excepción creada en ContractorAvailabilityException
- ✅ Al generar slots para esa fecha, retorna array vacío
- ✅ Fecha excluida correctamente del calendario

**Estado:** Pendiente
**Cobertura:** N/A

---

##### TC-RF-CTR-AVAIL-007: Crear bloqueo manual exitosamente

**Objetivo:** Validar que un contratista puede crear un bloqueo manual (ad-hoc) sin conflictos.

**Precondiciones:**
- Contratista autenticado con horario semanal configurado
- No hay reservas confirmadas en el rango de tiempo a bloquear

**Procedimiento:**
1. Autenticarse como contratista
2. Crear bloqueo manual:
```json
{
  "date": "2025-11-28",
  "startTime": "14:00",
  "endTime": "16:00",
  "reason": "Emergencia familiar"
}
```
3. Verificar respuesta HTTP 201
4. Verificar que bloqueo se guardó en base de datos
5. Generar slots para noviembre 28 y verificar que 14:00-16:00 está excluido

**Datos de prueba:**
- Fecha: 2025-11-28 (futura)
- Hora inicio: 14:00
- Hora fin: 16:00
- Razón: "Emergencia familiar"

**Resultado esperado:**
- ✅ Respuesta HTTP 201 Created
- ✅ Bloqueo creado en ContractorAvailabilityBlockout
- ✅ Al generar slots, rango 14:00-16:00 excluido
- ✅ No afecta otros días ni horarios

**Estado:** Pendiente
**Cobertura:** N/A

---

##### TC-RF-CTR-AVAIL-008: Rechazar bloqueo que superpone reserva confirmada

**Objetivo:** Validar que el sistema rechaza bloqueos que superponen reservas confirmadas.

**Precondiciones:**
- Contratista autenticado
- Existe una reserva confirmada en noviembre 28, 14:00-15:00

**Procedimiento:**
1. Crear reserva confirmada para noviembre 28, 14:00-15:00
2. Autenticarse como contratista
3. Intentar crear bloqueo:
```json
{
  "date": "2025-11-28",
  "startTime": "13:30",
  "endTime": "15:30",
  "reason": "Intento de bloqueo"
}
```
4. Verificar respuesta HTTP 409 Conflict
5. Verificar mensaje de error específico con ID de booking

**Datos de prueba:**
- Booking existente: 14:00-15:00
- Bloqueo intentado: 13:30-15:30 (superpone 14:00-15:00)

**Resultado esperado:**
- ✅ Respuesta HTTP 409 Conflict
- ✅ Mensaje de error: "Cannot block time range 14:00-15:00: confirmed booking exists (ID: xyz)"
- ✅ Bloqueo NO se crea en base de datos
- ✅ Reserva existente no se afecta

**Estado:** Pendiente
**Cobertura:** blockoutService validation

---

##### TC-RF-CTR-AVAIL-010: Generar slots desde horario semanal

**Objetivo:** Validar que el algoritmo de generación de slots crea intervalos correctos basados en horario semanal.

**Precondiciones:**
- Horario semanal configurado: Lunes 08:00-12:00 y 14:00-18:00
- Granularidad: 30 minutos
- Timezone: America/Mexico_City

**Procedimiento:**
1. Llamar a GET `/api/contractors/me/availability/slots?startDate=2025-11-24&endDate=2025-11-24`
2. Verificar que se generan slots cada 30 minutos
3. Verificar conversión a UTC
4. Verificar que slots respetan horario semanal (08:00-12:00, 14:00-18:00)

**Datos de prueba:**
- Fecha: 2025-11-24 (lunes)
- Horario base: 08:00-12:00, 14:00-18:00
- Granularidad: 30 min

**Resultado esperado:**
- ✅ Slots generados cada 30 minutos:
  - 08:00-08:30, 08:30-09:00, ..., 11:30-12:00
  - 14:00-14:30, 14:30-15:00, ..., 17:30-18:00
- ✅ Cada slot tiene startTime, endTime (local) y startTimeUTC, endTimeUTC
- ✅ Timezone en respuesta: "America/Mexico_City"
- ✅ Total: 16 slots (8 en mañana + 8 en tarde)

**Estado:** Pendiente
**Cobertura:** slotGenerator utility

---

##### TC-RNF-CTR-AVAIL-001: Performance - generación de slots P95 <= 800ms

**Objetivo:** Validar que la generación de slots cumple requisitos de performance.

**Precondiciones:**
- Contratista con horario semanal completo (lunes-domingo)
- Excepciones y bloqueos realistas (10-15 entradas)
- Bookings existentes (20-30 reservas en rango)

**Procedimiento:**
1. Configurar k6 test script
2. Ejecutar 100 requests concurrentes de generación de slots (8 semanas)
3. Medir P95, P99 y latencia promedio
4. Analizar resultados

**Datos de prueba:**
- Rango: próximas 8 semanas
- 100 requests concurrentes
- Horario completo (lunes-domingo, 8 horas/día)
- 10 excepciones
- 5 bloqueos
- 25 bookings existentes

**Resultado esperado:**
- ✅ P95 latency <= 800ms
- ✅ P99 latency <= 1200ms
- ✅ Average latency < 500ms
- ✅ 0 errores HTTP 500
- ✅ Todas las respuestas HTTP 200

**Estado:** Pendiente
**Cobertura:** k6 performance test

---

##### TC-RNF-CTR-AVAIL-003: A11y - navegación por teclado en UI de calendario

**Objetivo:** Validar que la interfaz de calendario es completamente navegable por teclado.

**Precondiciones:**
- UI de calendario renderizada
- Usuario sin mouse (solo teclado)

**Procedimiento:**
1. Navegar a /contractors/availability
2. Usar Tab para navegar entre elementos
3. Usar flechas para navegar días del calendario
4. Usar Enter/Space para seleccionar fechas
5. Verificar que todos los botones y controles son accesibles
6. Verificar que focus es visible (outline 2px)

**Datos de prueba:**
- N/A (prueba de accesibilidad)

**Resultado esperado:**
- ✅ Tab navega secuencialmente: tabs → calendario → botones
- ✅ Flechas navegan dentro del calendario (arriba/abajo/izq/derecha)
- ✅ Enter/Space activan acciones (seleccionar fecha, abrir modal)
- ✅ Focus visible en todo momento (outline azul 2px)
- ✅ No hay "trampas de teclado" (keyboard traps)
- ✅ Skip links funcionan correctamente

**Estado:** Pendiente
**Cobertura:** Playwright E2E test

---

**Notas de implementación:**
- Los tests TC-RF-CTR-AVAIL-001 a TC-RF-CTR-AVAIL-020 se implementarán en `src/modules/contractors/availability/__tests__/`
- Los tests de performance (TC-RNF-CTR-AVAIL-001) usarán k6 en `tests/performance/availability-slot-generation.js`
- Los tests E2E (TC-RNF-CTR-AVAIL-003 a 005) usarán Playwright en `tests/e2e/contractor-availability.spec.ts`
- Todos los tests deben pasar ANTES de archivar la propuesta con `/openspec:archive`
