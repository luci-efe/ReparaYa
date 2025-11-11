# Módulo de Pagos (Payments)

## Propósito

Integración completa con Stripe para procesar pagos de anticipos, liquidaciones,
reembolsos y payouts a contratistas vía Stripe Connect.

## Responsabilidades

- Creación de Payment Intents (anticipos)
- Procesamiento de webhooks de Stripe (idempotencia)
- Liquidación a contratistas (Stripe Connect Express)
- Gestión de reembolsos
- Cálculo de comisiones y fees (BR-001, BR-002)
- Auditoría de transacciones

## Estructura (a implementar)

```
payments/
├── services/
│   ├── stripeService.ts         # Cliente Stripe
│   ├── checkoutService.ts       # Creación de sesiones de pago
│   ├── webhookService.ts        # Procesamiento webhooks
│   ├── payoutService.ts         # Liquidaciones a contratistas
│   └── commissionService.ts     # Cálculo de comisiones
├── repositories/
│   └── paymentRepository.ts     # Acceso a datos
├── types/
│   └── index.ts
└── validators/
    └── webhookSchemas.ts
```

## TODOs

- [ ] Definir esquema Prisma para Payment
- [ ] Configurar Stripe SDK (modo test)
- [ ] Implementar creación de Payment Intent
- [ ] Handler de webhooks con verificación de firma
- [ ] Idempotencia en procesamiento de webhooks (RF-007)
- [ ] Integración Stripe Connect para contratistas
- [ ] Lógica de liquidación según BR-002 y BR-003
- [ ] Sistema de reembolsos
- [ ] Tests con Stripe Test Mode

## Referencias

- **RF-005**: Checkout y anticipo
- **RF-007**: Webhooks de pago
- **RF-010**: Liquidación
- **BR-001**: Precios y recargos
- **BR-002**: Comisiones
- **BR-003**: Anticipo y liquidación
- Ver `/openspec/specs/payments-webhooks/spec.md`
