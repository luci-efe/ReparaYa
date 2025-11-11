# Tabla de Trazabilidad de Requisitos - ReparaYa

Esta tabla vincula cada requisito funcional (RF) y regla de negocio (BR) con:
- Módulo responsable
- Prioridad
- Casos de prueba (STP)
- Estado de implementación

## Requisitos Funcionales (RF)

| ID | Nombre | Descripción breve | Módulo | Prioridad | Referencia STP | Estado |
|----|--------|-------------------|--------|-----------|----------------|--------|
| RF-001 | Búsqueda y listado | Buscar servicios por ubicación/categoría con orden y paginación | catalog-search | Alta | TC-RF-001-* | Pendiente |
| RF-002 | Detalle del servicio | Mostrar descripción, precio, fotos, ubicación, disponibilidad y calificaciones | catalog-search | Alta | TC-RF-002-* | Pendiente |
| RF-003 | Registro e inicio de sesión | Email + contraseña y/o proveedor social, verificación de email | auth, users | Alta | TC-RF-003-* | Pendiente |
| RF-004 | Publicación y disponibilidad | Alta de servicio(s), agenda, activar/desactivar publicación | services-publishing | Alta | TC-RF-004-* | Pendiente |
| RF-005 | Reserva y checkout | Creación de reserva y cobro de anticipo mediante pasarela | booking-checkout | Alta | TC-RF-005-* | Pendiente |
| RF-006 | Estados de reserva | Gestión de estados y transiciones válidas | booking-checkout | Alta | TC-RF-006-* | Pendiente |
| RF-007 | Webhooks de pago | Procesamiento idempotente de eventos de pasarela | payments-webhooks | Alta | TC-RF-007-* | Pendiente |
| RF-008 | Mensajería | Mensajes dentro del contexto de una reserva | reservation-lifecycle-messaging | Media | TC-RF-008-* | Pendiente |
| RF-009 | Calificaciones | Calificación de 1-5 estrellas por reserva | ratings-reviews | Media | TC-RF-009-* | Pendiente |
| RF-010 | Liquidación | Liberar pago al contratista tras completar servicio | payments-webhooks | Alta | TC-RF-010-* | Pendiente |
| RF-011 | Admin básico | Moderación, categorías, bloqueo, disputas | admin-moderation | Media | TC-RF-011-* | Pendiente |
| RF-012 | Notificaciones | Correos transaccionales de eventos importantes | messaging (SES) | Media | TC-RF-012-* | Pendiente |

## Reglas de Negocio (BR)

| ID | Nombre | Descripción breve | Módulo | Prioridad | Referencia STP | Estado |
|----|--------|-------------------|--------|-----------|----------------|--------|
| BR-001 | Precios y recargos | Pc = B × (1 + R) | payments | Alta | TC-BR-001-* | Pendiente |
| BR-002 | Comisiones | Ic = B - (C% × B) | payments | Alta | TC-BR-002-* | Pendiente |
| BR-003 | Anticipo y liquidación | Anticipo A% de Pc; liquidación tras COMPLETADA | payments, booking | Alta | TC-BR-003-* | Pendiente |
| BR-004 | Cancelaciones | Política por ventanas de tiempo | booking | Media | TC-BR-004-* | Pendiente |
| BR-005 | Disputas | Apertura por cualquier parte, resolución admin | admin | Media | TC-BR-005-* | Pendiente |
| BR-006 | Facturación | Emisión de comprobantes según legislación local | payments (futuro) | Baja | N/A | Fuera de MVP |
| BR-007 | KYC/Verificación | Verificación mínima de contratistas | users | Alta | TC-RF-003-* | Pendiente |

## Requisitos No Funcionales Clave (RNF)

| ID | Nombre | Descripción breve | Módulo | Prioridad | Referencia STP | Estado |
|----|--------|-------------------|--------|-----------|----------------|--------|
| RNF-3.5.1 | Performance | P95/P99 por flujo según tabla del SRS | todos | Alta | TC-RNF-* | Pendiente |
| RNF-3.5.3 | Seguridad | Autenticación, autorización, sanitización | auth, todos | Alta | TC-SEC-* | Pendiente |
| RNF-3.5.4 | Privacidad | ARCO, retención de datos | users, messaging | Alta | TC-PRIV-* | Pendiente |

## Matriz de Trazabilidad Módulo → Requisitos

| Módulo | Requisitos Principales | Specs |
|--------|------------------------|-------|
| auth | RF-003, RNF-3.5.3 | `/openspec/specs/auth/spec.md` |
| users | RF-003, BR-007 | `/openspec/specs/users/spec.md` |
| catalog-search | RF-001, RF-002, RNF-3.5.1 | `/openspec/specs/catalog-search/spec.md` |
| services-publishing | RF-004 | `/openspec/specs/services-publishing/spec.md` |
| booking-checkout | RF-005, RF-006, BR-003, BR-004 | `/openspec/specs/booking-checkout/spec.md` |
| payments-webhooks | RF-007, RF-010, BR-001, BR-002, BR-003 | `/openspec/specs/payments-webhooks/spec.md` |
| reservation-lifecycle-messaging | RF-008, RF-012 | `/openspec/specs/reservation-lifecycle-messaging/spec.md` |
| ratings-reviews | RF-009 | `/openspec/specs/ratings-reviews/spec.md` |
| admin-moderation | RF-011, BR-005 | `/openspec/specs/admin-moderation/spec.md` |

## Notas

- Esta tabla se actualizará conforme avance la implementación.
- Cada caso de prueba en el STP debe tener un vínculo hacia esta tabla.
- El campo "Estado" puede ser: Pendiente, En Progreso, Implementado, Probado.
