# Especificación: Reservas y Checkout

## Propósito y alcance

Gestiona el flujo completo de creación de reservas, checkout con anticipo,
y gestión de estados del ciclo de vida de la reserva.

## Requisitos relacionados

- **RF-005**: Reserva y checkout
- **RF-006**: Estados de reserva
- **BR-003**: Anticipo y liquidación
- **BR-004**: Cancelaciones
- **RNF-3.5.1**: Performance (crear reserva + pago P95 ≤ 1.5s)

## Interfaces y contratos

### Endpoints

**POST `/api/bookings`**

Body:
```json
{
  "service_id": "...",
  "availability_id": "...",
  "address": "...",
  "notes": "..."
}
```

Acción:
1. Validar disponibilidad
2. Crear reserva (status: PENDIENTE_PAGO)
3. Crear Payment Intent en Stripe (anticipo)
4. Retornar URL de checkout

Respuesta:
```json
{
  "booking_id": "...",
  "checkout_url": "..."
}
```

**GET `/api/bookings/:id`**
- Autorización: Cliente o contratista de la reserva
- Respuesta: Detalle completo de la reserva

**PATCH `/api/bookings/:id/state`**

Body:
```json
{
  "new_state": "ON_SITE" | "COMPLETADA" | "CANCELADA"
}
```

Validaciones:
- Transiciones válidas según máquina de estados (RF-006)
- Solo roles autorizados pueden cambiar estados

**POST `/api/bookings/:id/cancel`**
- Autorización: Cliente o contratista
- Acción: Aplicar política de cancelación (BR-004)

## Modelo de datos

### Entidad: Booking

```typescript
{
  id: string
  service_id: string (FK Service)
  client_id: string (FK User)
  contractor_id: string (FK User)
  availability_id: string (FK Availability)
  status: 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'ON_SITE' | 'COMPLETADA' | 'CANCELADA' | 'DISPUTA'
  scheduled_date: timestamp
  address: string
  notes?: string
  created_at: timestamp
  updated_at: timestamp
}
```

### Entidad: BookingStateHistory

```typescript
{
  id: string
  booking_id: string (FK Booking)
  from_state: string
  to_state: string
  changed_by: string (FK User)
  notes?: string
  created_at: timestamp
}
```

## Máquina de estados

```
PENDIENTE_PAGO → (pago exitoso) → CONFIRMADA
CONFIRMADA → (llega contratista) → ON_SITE
ON_SITE → (termina trabajo) → COMPLETADA
[Cualquier estado antes de COMPLETADA] → CANCELADA
[Cualquier estado] → DISPUTA
```

## Integraciones externas

- **Stripe**: Payment Intent y Checkout
- **AWS SES**: Notificaciones de cambio de estado

## Consideraciones de seguridad

- Validar que el availability no esté ya reservado (race condition)
- Auditoría de todos los cambios de estado
- Solo cliente puede cancelar antes de ON_SITE
- Solo contratista puede marcar ON_SITE y COMPLETADA

## Testing & QA

### Casos de prueba relacionados

- `TC-RF-005-01`: Creación de reserva exitosa
- `TC-RF-005-02`: Validación de disponibilidad
- `TC-RF-006-01`: Transiciones válidas de estado
- `TC-RF-006-02`: Rechazo de transiciones inválidas
- `TC-BR-004-01`: Cancelación con política de reembolso

## TODOs

- [ ] Definir esquemas Prisma (Booking, BookingStateHistory)
- [ ] Implementar máquina de estados
- [ ] Integración con Stripe
- [ ] Validación atómica de disponibilidad
- [ ] Tests de concurrencia
