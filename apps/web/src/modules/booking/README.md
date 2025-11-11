# Módulo de Reservas (Booking)

## Propósito

Gestiona el ciclo de vida completo de las reservas:
creación, estados, transiciones, cancelaciones y disputas.

## Responsabilidades

- Creación de reservas con validación de disponibilidad
- Gestión de estados (PENDIENTE_PAGO, CONFIRMADA, ON_SITE, COMPLETADA, CANCELADA, DISPUTA)
- Transiciones válidas entre estados
- Lógica de cancelación y reembolsos
- Gestión de disputas

## Estructura (a implementar)

```
booking/
├── services/
│   ├── bookingService.ts        # Lógica principal de reservas
│   ├── stateService.ts          # Gestión de estados y transiciones
│   ├── cancellationService.ts   # Lógica de cancelaciones
│   └── disputeService.ts        # Gestión de disputas
├── repositories/
│   └── bookingRepository.ts     # Acceso a datos
├── types/
│   ├── index.ts
│   └── states.ts                # Estados y transiciones
└── validators/
    └── bookingSchemas.ts
```

## TODOs

- [ ] Definir esquema Prisma para Booking y estados
- [ ] Implementar máquina de estados para transiciones
- [ ] Validación de disponibilidad al crear reserva
- [ ] Lógica de cancelación según ventanas de tiempo (BR-004)
- [ ] Sistema de disputas
- [ ] Auditoría de cambios de estado
- [ ] Tests de transiciones de estado

## Referencias

- **RF-005**: Reserva y checkout
- **RF-006**: Estados de reserva
- **BR-003**: Anticipo y liquidación
- **BR-004**: Política de cancelaciones
- **BR-005**: Disputas
- Ver `/openspec/specs/booking-checkout/spec.md` y `/openspec/specs/reservation-lifecycle-messaging/spec.md`
