# Módulo de Pagos (Payments)

## Propósito

Integración completa con Stripe para procesar pagos de anticipos, liquidaciones,
reembolsos y payouts a contratistas vía Stripe Connect.

## Implementación Completada ✅

El módulo de pagos está completamente implementado según `/openspec/specs/payments-webhooks/spec.md`.

### Responsabilidades

- ✅ Cálculo de comisiones según reglas de negocio (BR-001, BR-002, BR-003)
- ✅ Creación de Stripe Checkout Sessions para anticipos (30%)
- ✅ Procesamiento de webhooks con idempotencia
- ✅ Liquidaciones a contratistas vía Stripe Connect Express (85% del precio final)
- ✅ Gestión de reembolsos
- ✅ Auditoría completa de transacciones

## Estructura

```
payments/
├── services/
│   ├── stripeService.ts         # Cliente Stripe singleton
│   ├── commissionService.ts     # Cálculo de comisiones (BR-001, BR-002, BR-003)
│   ├── checkoutService.ts       # Creación de sesiones de pago
│   ├── webhookService.ts        # Procesamiento webhooks con idempotencia
│   ├── payoutService.ts         # Liquidaciones a contratistas
│   └── refundService.ts         # Gestión de reembolsos
├── repositories/
│   ├── paymentRepository.ts     # CRUD de pagos
│   └── webhookEventRepository.ts # Idempotencia de webhooks
├── types/
│   └── index.ts                 # DTOs, interfaces, errores
├── validators/
│   └── index.ts                 # Validación con Zod
└── index.ts                     # Exports públicos del módulo
```

## Reglas de Negocio

### BR-001: Precio Final
- **Precio Final** = Precio Base × 1.10 (10% markup al cliente)
- Ejemplo: Servicio de $100 → Cliente paga $110

### BR-002: Comisiones
- **Comisión Plataforma** = Precio Final × 0.15 (15%)
- **Pago a Contratista** = Precio Final - Comisión = 85% del precio final
- Ejemplo: $110 total → $16.50 comisión → $93.50 al contratista

### BR-003: Anticipo y Liquidación
- **Anticipo** = 30% del Precio Final (pagado al reservar)
- **Liquidación** = 70% del Precio Final (pagado al completar servicio)
- Ejemplo: $110 total → $33 anticipo → $77 liquidación

## Uso

### 1. Crear Checkout Session (Anticipo)

```typescript
import { getCheckoutService } from '@/modules/payments';
import { prisma } from '@/lib/prisma';

const checkoutService = getCheckoutService(prisma);

const { sessionId, checkoutUrl, payment } =
  await checkoutService.createCheckoutSession(bookingId);

// Redirigir usuario a checkoutUrl
```

### 2. Procesar Webhook (Automático)

Los webhooks se procesan automáticamente en `/api/webhooks/stripe`.

Eventos soportados:
- `payment_intent.succeeded` → Actualiza pago y booking a CONFIRMED
- `payment_intent.payment_failed` → Marca pago como FAILED
- `charge.refunded` → Crea registro de reembolso
- `account.updated` → Actualiza estado de cuenta Connect

### 3. Crear Payout a Contratista

```typescript
import { getPayoutService } from '@/modules/payments';
import { prisma } from '@/lib/prisma';

const payoutService = getPayoutService(prisma);

// Cuando booking está COMPLETED
const { payment, stripeTransferId } =
  await payoutService.createPayout(bookingId);
```

### 4. Procesar Reembolso

```typescript
import { getRefundService } from '@/modules/payments';
import { prisma } from '@/lib/prisma';

const refundService = getRefundService(prisma);

const { payment, stripeRefundId } = await refundService.processRefund({
  bookingId,
  reason: 'Cliente canceló con más de 24h de anticipación',
  amount: undefined // undefined = reembolso completo
});
```

### 5. Onboarding de Contratista (Stripe Connect)

```typescript
import { getStripeConnectService } from '@/modules/contractors/services/stripeConnectService';
import { prisma } from '@/lib/prisma';

const connectService = getStripeConnectService(prisma);

// Crear cuenta Connect
const { accountId } = await connectService.createConnectAccount(contractorId);

// Generar link de onboarding para KYC
const { url } = await connectService.createOnboardingLink(contractorId);

// Redirigir contratista a url para completar verificación
```

## Testing

### Configuración de Test

1. Usar Stripe Test Mode (claves con prefijo `sk_test_`)
2. Configurar webhook local con Stripe CLI:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```
3. Copiar webhook secret (whsec_...) a `.env.local`

### Tarjetas de Prueba

- **Éxito**: `4242 4242 4242 4242`
- **Rechazada**: `4000 0000 0000 9995`
- **3D Secure**: `4000 0027 6000 3184`

### Ejecutar Tests

```bash
# Tests unitarios del módulo
npm run test -- src/modules/payments

# Tests de integración
npm run test -- tests/integration/payments

# Cobertura
npm run test:coverage
```

**Objetivo de cobertura**: ≥ 75%

## Variables de Entorno Requeridas

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

PLATFORM_MARKUP_PERCENTAGE="10"
PLATFORM_COMMISSION_PERCENTAGE="15"
BOOKING_ADVANCE_PERCENTAGE="30"
```

## Seguridad

- ✅ Verificación de firmas de webhook con `stripe.webhooks.constructEvent()`
- ✅ Idempotencia garantizada (tabla `ProcessedWebhookEvent`)
- ✅ Sanitización de metadata antes de almacenar
- ✅ Secrets nunca expuestos en logs o responses
- ✅ Uso de Stripe SDK oficial (versión latest)

## Próximos Pasos

1. **Escribir tests** (unitarios + integración) para alcanzar ≥75% cobertura
2. **Integrar con módulo booking** cuando esté implementado
3. **Implementar política de cancelación** (BR-004) para reembolsos parciales
4. **Performance testing** con k6 para validar webhook P95 ≤ 0.8s

## Referencias

- **Spec**: `/openspec/specs/payments-webhooks/spec.md`
- **Propuesta**: `/openspec/changes/implement-stripe-payments/proposal.md`
- **Tests (STP)**: `/docs/md/STP-ReparaYa.md` (sección 4.1.6)
- **Stripe Docs**: https://stripe.com/docs/payments/checkout
- **Stripe Connect**: https://stripe.com/docs/connect
