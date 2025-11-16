# Implementation Tasks

## 1. Setup de Infraestructura Prisma

- [x] 1.1 Crear directorio `apps/web/prisma/`
- [x] 1.2 Crear archivo `apps/web/prisma/schema.prisma` con configuración base (datasource + generator)
- [x] 1.3 Agregar scripts a `apps/web/package.json`:
  - `"prisma:generate": "prisma generate"`
  - `"prisma:migrate": "prisma migrate dev"`
  - `"prisma:studio": "prisma studio"`
  - `"prisma:validate": "prisma validate"`
  - `"prisma:format": "prisma format"`
- [x] 1.4 Crear `apps/web/src/lib/db.ts` con cliente Prisma singleton

## 2. Definición de Enums

- [x] 2.1 Crear enum `UserRole` (CLIENT, CONTRACTOR, ADMIN)
- [x] 2.2 Crear enum `UserStatus` (ACTIVE, BLOCKED, PENDING_VERIFICATION)
- [x] 2.3 Crear enum `ServiceStatus` (ACTIVE, INACTIVE, UNDER_REVIEW)
- [x] 2.4 Crear enum `AvailabilityStatus` (AVAILABLE, BOOKED, BLOCKED)
- [x] 2.5 Crear enum `BookingStatus` (PENDING_PAYMENT, CONFIRMED, ON_ROUTE, ON_SITE, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED)
- [x] 2.6 Crear enum `PaymentType` (ANTICIPO, LIQUIDACION, REEMBOLSO)
- [x] 2.7 Crear enum `PaymentStatus` (PENDING, SUCCEEDED, FAILED, REFUNDED)
- [x] 2.8 Crear enum `ModerationStatus` (PENDING, APPROVED, REJECTED)
- [x] 2.9 Crear enum `DisputeStatus` (OPEN, RESOLVED_REFUND_CLIENT, RESOLVED_PAYOUT_CONTRACTOR, RESOLVED_PARTIAL)

## 3. Modelos de Dominio Auth & Users

- [x] 3.1 Crear modelo `User` con campos:
  - id (UUID PK)
  - clerkUserId (String unique)
  - email (String unique)
  - firstName, lastName
  - phone (opcional)
  - avatarUrl (opcional)
  - role (UserRole enum)
  - status (UserStatus enum)
  - createdAt, updatedAt
  - Índices: @@index([clerkUserId]), @@index([email]), @@index([role, status])
- [x] 3.2 Crear modelo `ContractorProfile` con campos:
  - id (UUID PK)
  - userId (FK a User, unique)
  - businessName, description
  - specialties (String[], array de categorías)
  - verified (Boolean)
  - verificationDocuments (Json, S3 keys)
  - stripeConnectAccountId (opcional)
  - createdAt, updatedAt
  - Relación: user User @relation (1:1)
- [x] 3.3 Crear modelo `Address` con campos:
  - id (UUID PK)
  - userId (FK a User)
  - addressLine1, addressLine2 (opcional)
  - city, state, postalCode, country
  - lat, lng (Decimal, para geocodificación)
  - isDefault (Boolean)
  - createdAt, updatedAt
  - Relación: user User @relation (N:1)
  - Índice: @@index([userId, isDefault])

## 4. Modelos de Dominio Services

- [x] 4.1 Crear modelo `Category` con campos:
  - id (UUID PK)
  - name, description
  - slug (String unique)
  - iconUrl (opcional)
  - parentId (FK a Category, self-reference para jerarquía)
  - createdAt, updatedAt
  - Relaciones: parent, children, services
- [x] 4.2 Crear modelo `Service` con campos:
  - id (UUID PK)
  - contractorId (FK a User)
  - categoryId (FK a Category)
  - title, description
  - basePrice (Decimal)
  - locationLat, locationLng (Decimal)
  - locationAddress (String)
  - coverageRadiusKm (Int)
  - images (String[], array de URLs S3)
  - status (ServiceStatus enum)
  - createdAt, updatedAt
  - Relaciones: contractor, category, availabilities, bookings, ratings
  - Índices: @@index([contractorId]), @@index([categoryId, status]), @@index([locationLat, locationLng])
- [x] 4.3 Crear modelo `Availability` con campos:
  - id (UUID PK)
  - serviceId (FK a Service)
  - date (DateTime)
  - startTime (DateTime)
  - endTime (DateTime)
  - status (AvailabilityStatus enum)
  - bookingId (FK a Booking, opcional)
  - createdAt, updatedAt
  - Relaciones: service, booking (opcional)
  - Índices: @@index([serviceId, date, status]), @@index([bookingId])

## 5. Modelos de Dominio Booking

- [x] 5.1 Crear modelo `Booking` con campos:
  - id (UUID PK)
  - serviceId (FK a Service)
  - clientId (FK a User)
  - contractorId (FK a User)
  - availabilityId (FK a Availability)
  - status (BookingStatus enum)
  - scheduledDate (DateTime)
  - address (String, puede ser diferente de Address predeterminada)
  - notes (opcional, Text)
  - basePrice (Decimal, snapshot del precio al momento de reserva)
  - finalPrice (Decimal, con recargos y markup)
  - anticipoAmount (Decimal)
  - liquidacionAmount (Decimal)
  - comisionAmount (Decimal)
  - contractorPayoutAmount (Decimal)
  - createdAt, updatedAt
  - Relaciones: service, client, contractor, availability, payments, messages, rating, dispute, stateHistory
  - Índices: @@index([clientId, status]), @@index([contractorId, status]), @@index([status, scheduledDate])
- [x] 5.2 Crear modelo `BookingStateHistory` con campos:
  - id (UUID PK)
  - bookingId (FK a Booking)
  - fromState (BookingStatus enum)
  - toState (BookingStatus enum)
  - changedBy (FK a User)
  - notes (opcional, Text)
  - createdAt
  - Relación: booking, user (changedBy)
  - Índice: @@index([bookingId, createdAt])

## 6. Modelos de Dominio Payments

- [x] 6.1 Crear modelo `Payment` con campos:
  - id (UUID PK)
  - bookingId (FK a Booking)
  - type (PaymentType enum)
  - amount (Decimal)
  - currency (String, default "mxn")
  - stripePaymentIntentId (opcional)
  - stripeCheckoutSessionId (opcional)
  - stripeTransferId (opcional, para payouts)
  - status (PaymentStatus enum)
  - metadata (Json, info adicional)
  - createdAt, updatedAt
  - Relación: booking
  - Índices: @@index([bookingId]), @@index([type, status]), @@index([stripePaymentIntentId])
- [x] 6.2 Crear modelo `ProcessedWebhookEvent` con campos:
  - id (UUID PK)
  - stripeEventId (String unique)
  - eventType (String)
  - processedAt (DateTime @default(now()))
  - Índice: @@index([stripeEventId])

## 7. Modelos de Dominio Messaging

- [x] 7.1 Crear modelo `Message` con campos:
  - id (UUID PK)
  - bookingId (FK a Booking)
  - senderId (FK a User)
  - text (String, max 2000 chars)
  - createdAt
  - Relaciones: booking, sender
  - Índice: @@index([bookingId, createdAt])

## 8. Modelos de Dominio Ratings

- [x] 8.1 Crear modelo `Rating` con campos:
  - id (UUID PK)
  - bookingId (FK a Booking, unique - una calificación por reserva)
  - serviceId (FK a Service)
  - clientId (FK a User)
  - stars (Int, constraint 1-5)
  - comment (opcional, String max 500 chars)
  - moderationStatus (ModerationStatus enum)
  - moderationNotes (opcional, Text)
  - createdAt, updatedAt
  - Relaciones: booking, service, client
  - Índices: @@index([serviceId, moderationStatus]), @@index([moderationStatus])
- [x] 8.2 Crear modelo `ServiceRatingStats` con campos:
  - serviceId (String PK, FK a Service)
  - average (Decimal)
  - totalRatings (Int)
  - updatedAt
  - Relación: service (1:1)

## 9. Modelos de Dominio Admin

- [x] 9.1 Crear modelo `Dispute` con campos:
  - id (UUID PK)
  - bookingId (FK a Booking, unique)
  - openedBy (FK a User)
  - reason (Text)
  - evidence (Json, URLs de S3)
  - status (DisputeStatus enum)
  - resolution (opcional, Text)
  - resolutionNotes (opcional, Text)
  - resolvedBy (FK a User, opcional)
  - createdAt, resolvedAt (opcional)
  - Relaciones: booking, openedByUser, resolvedByUser
  - Índices: @@index([status, createdAt]), @@index([bookingId])
- [x] 9.2 Crear modelo `AdminAuditLog` con campos:
  - id (UUID PK)
  - adminId (FK a User)
  - action (String, ej: "approve_service", "block_user")
  - targetType (String, ej: "service", "user", "rating")
  - targetId (String, UUID del objeto afectado)
  - metadata (Json, detalles de la acción)
  - createdAt
  - Relación: admin
  - Índice: @@index([adminId, createdAt]), @@index([targetType, targetId])

## 10. Validación y Formateo

- [x] 10.1 Ejecutar `npx prisma validate` para verificar sintaxis
- [x] 10.2 Ejecutar `npx prisma format` para formateo consistente
- [x] 10.3 Revisar que todos los modelos tengan relaciones bidireccionales correctas
- [x] 10.4 Verificar que todos los índices estén en campos de búsqueda frecuente

## 11. Corrección de CodeRabbit

- [x] 11.1 Leer configuración actual de `.coderabbit.yaml`
- [x] 11.2 Agregar schema validator en primera línea: `# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json`
- [x] 11.3 Reorganizar estructura según schema v2:
  - Mover `base_branches` → `reviews.auto_review.base_branches`
  - Convertir `path_filters` → `reviews.path_instructions`
  - Mover `project_context` + `review_instructions` → `tone_instructions`
  - Eliminar propiedades no válidas: `checks`, `labels`, `ignore`
- [x] 11.4 Agregar `reviews.auto_review.enabled: true`
- [x] 11.5 Validar con schema online de CodeRabbit

## 12. Documentación y Actualización del STP

- [x] 12.1 Actualizar `/docs/md/STP-ReparaYa.md` con casos de prueba TC-DB-*
- [x] 12.2 Agregar sección "4.1.8 Pruebas de Base de Datos" con:
  - Casos de conexión y migración
  - Casos de integridad referencial
  - Casos de índices y performance
- [x] 12.3 Documentar en STP los criterios de aceptación del schema

## 13. Verificación Final

- [x] 13.1 Verificar que `package.json` tiene todos los scripts Prisma
- [x] 13.2 Verificar que `.env.example` documenta `DATABASE_URL`
- [x] 13.3 Crear archivo `apps/web/prisma/seed.ts` (esqueleto para futuros datos de prueba)
- [x] 13.4 Ejecutar validación de OpenSpec: `openspec validate setup-prisma-database-schema --strict`

---

## ✅ IMPLEMENTACIÓN COMPLETADA

Todos los requisitos del proposal han sido implementados y validados exitosamente.
