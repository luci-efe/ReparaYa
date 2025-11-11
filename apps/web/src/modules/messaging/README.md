# Módulo de Mensajería (Messaging)

## Propósito

Sistema de mensajería entre cliente y contratista en el contexto de una reserva.
MVP con polling periódico, diseñado para evolucionar a SSE/WebSockets.

## Responsabilidades

- Envío y recepción de mensajes ligados a reserva
- Retención de mensajes (mínimo 7 días post-cierre)
- Notificaciones por email de nuevos mensajes
- Validación y sanitización de contenido (anti-XSS)

## Estructura (a implementar)

```
messaging/
├── services/
│   ├── messageService.ts        # Lógica de envío/recepción
│   ├── notificationService.ts   # Notificaciones por email (SES)
│   └── sanitizationService.ts   # Sanitización de contenido
├── repositories/
│   └── messageRepository.ts     # Acceso a datos
├── adapters/
│   └── sesAdapter.ts            # Cliente AWS SES
├── types/
│   └── index.ts
└── validators/
    └── messageSchemas.ts
```

## TODOs

- [ ] Definir esquema Prisma para Message (FK a Booking)
- [ ] Implementar envío y listado de mensajes
- [ ] Sanitización de contenido (prevenir XSS)
- [ ] Integración con AWS SES para notificaciones
- [ ] Sistema de retención de mensajes
- [ ] API polling para cliente (MVP)
- [ ] Preparar diseño para SSE/WebSocket futuro
- [ ] Tests de sanitización y notificaciones

## Referencias

- **RF-008**: Mensajería
- **RNF-3.5.3**: Seguridad (XSS)
- Ver `/openspec/specs/reservation-lifecycle-messaging/spec.md`
