# Especificación: Pagos y Webhooks

## Propósito y alcance

Integración completa con Stripe para procesar pagos (anticipos, liquidaciones, reembolsos)
y gestionar webhooks con idempotencia.

## Requisitos relacionados

- **RF-007**: Webhooks de pago
- **RF-010**: Liquidación
- **BR-001**: Precios y recargos
- **BR-002**: Comisiones
- **BR-003**: Anticipo y liquidación
- **RNF-3.5.1**: Performance (webhook P95 ≤ 0.8s)

## Interfaces y contratos

### Webhook Endpoint

**POST `/api/webhooks/stripe`**

Eventos procesados:
- `payment_intent.succeeded`: Actualizar reserva a CONFIRMADA
- `payment_intent.payment_failed`: Marcar pago como fallido
- `charge.refunded`: Registrar reembolso
- `account.updated`: Actualizar estado de cuenta Connect

Características:
- Verificación de firma con `stripe.webhooks.constructEvent`
- Idempotencia por `event.id` (almacenar en tabla `processed_webhook_events`)
- Manejo de errores con retry exponencial

### Servicios internos

**`createCheckoutSession(bookingId: string)`**
- Crea Payment Intent en Stripe
- Monto: Anticipo (A% de Pc)
- Metadata: `booking_id`, `service_id`, `client_id`

**`createPayout(bookingId: string)`**
- Trigger al marcar reserva como COMPLETADA
- Calcula monto contratista (Ic = B - C%)
- Crea Transfer/Payout a cuenta Stripe Connect

**`processRefund(bookingId: string, amount: number)`**
- Crea Refund en Stripe
- Registra en tabla Payment

## Modelo de datos

### Entidad: Payment

```typescript
{
  id: string
  booking_id: string (FK Booking)
  type: 'anticipo' | 'liquidacion' | 'reembolso'
  amount: number
  currency: string (default: 'mxn')
  stripe_payment_intent_id?: string
  stripe_transfer_id?: string
  status: 'pending' | 'succeeded' | 'failed'
  created_at: timestamp
  updated_at: timestamp
}
```

### Entidad: ProcessedWebhookEvent

```typescript
{
  id: string
  stripe_event_id: string (unique)
  event_type: string
  processed_at: timestamp
}
```

## Integraciones externas

- **Stripe SDK**: Pagos, webhooks, Connect
- **Stripe Connect Express**: Cuentas de contratistas

## Consideraciones de seguridad

- Verificar firma de webhooks
- No exponer claves secretas de Stripe
- Almacenar solo IDs/tokens de Stripe, nunca datos de tarjeta
- Logs de auditoría para todos los pagos

## Testing & QA

### Tipos de pruebas

1. **Integración**:
   - Webhook con payload de prueba
   - Idempotencia (enviar mismo evento 2 veces)
   - Stripe Test Mode

2. **E2E**:
   - Flujo completo: checkout → pago → confirmación → liquidación

### Casos de prueba relacionados

- `TC-RF-007-01`: Webhook procesa payment_intent.succeeded
- `TC-RF-007-02`: Idempotencia en webhooks
- `TC-RF-010-01`: Liquidación correcta según BR-002
- `TC-BR-002-01`: Cálculo de comisiones

## TODOs

- [ ] Definir esquemas Prisma (Payment, ProcessedWebhookEvent)
- [ ] Implementar webhook handler
- [ ] Lógica de idempotencia
- [ ] Integración Stripe Connect
- [ ] Cálculo de comisiones según BR-001 y BR-002
- [ ] Tests con Stripe Test Mode
