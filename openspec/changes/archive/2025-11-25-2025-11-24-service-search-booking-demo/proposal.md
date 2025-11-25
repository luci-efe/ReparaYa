# Proposal: Service Search, Booking Flow, and Demo Simulation

**Change ID:** 2025-11-24-service-search-booking-demo
**Author:** Claude Code
**Date:** 2025-11-24
**Status:** Draft

## Why

ReparaYa's core value proposition depends on clients being able to find and book home repair services. Currently:
- The `/search` page does not exist (referenced in `ClientQuickAccessTiles.tsx` but returns 404)
- The `/clients/bookings` page is a placeholder showing "Coming Soon"
- No booking module implementation exists (only README.md placeholder)
- No mechanism exists for demonstrating the complete booking lifecycle

This change addresses **RF-004** (Service Search), **RF-005** (Booking Creation), and **RF-006** (Booking States) from the SRS, completing the critical client journey from discovery to service completion.

## What Changes

1. **Service Search & Discovery** (NEW)
   - Public service search page (`/search`) with filters (category, price, search term)
   - Service detail page (`/services/[id]`) with contractor info, availability slots
   - Enhanced client dashboard with prominent "Buscar Servicios" tile

2. **Booking Creation Flow**
   - Select available time slot from contractor's availability
   - Enter service address (from saved addresses or new)
   - Add optional notes
   - Simulated payment (ANTICIPO) - Stripe integration deferred

3. **Booking Management**
   - Client booking list (`/clients/bookings`) with status tracking
   - Contractor booking list with manual status controls
   - Real-time status updates via polling (30-second interval)
   - Booking detail pages for both client and contractor

4. **Demo Simulation System**
   - Automatic status progression when `scheduledDate` arrives
   - 30-second intervals between status transitions
   - Simulated payment processing (ANTICIPO and LIQUIDACION)
   - BookingStateHistory audit trail

5. **Backend Infrastructure**
   - Booking module (service, repository, validators, types)
   - Payment module (simulated for now, Stripe-ready)
   - API endpoints for all CRUD operations
   - Demo simulation background service

### Out of Scope

- Real Stripe payment integration (future proposal)
- Real-time WebSocket/SSE updates (polling-based MVP)
- Messaging system (separate proposal)
- Rating system (separate proposal)
- Dispute management (separate proposal)
- Cancellation with refund logic (simplified for demo)

## Technical Design

### Database Schema Alignment

The implementation uses existing Supabase tables:
- `Booking` - Core booking record with status, pricing, dates
- `BookingStateHistory` - Audit trail for state transitions
- `Payment` - Payment records (ANTICIPO, LIQUIDACION, REEMBOLSO)
- `Availability` - Time slots linked to bookings
- `Service`, `ServiceCategory`, `User`, `Address` - Referenced entities

**Enums used:**
- `BookingStatus`: PENDING_PAYMENT, CONFIRMED, ON_ROUTE, ON_SITE, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED
- `PaymentStatus`: PENDING, SUCCEEDED, FAILED, REFUNDED
- `PaymentType`: ANTICIPO, LIQUIDACION, REEMBOLSO

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│ /search                    Service search with filters           │
│ /services/[id]             Service detail + availability         │
│ /clients/bookings          Client booking list                   │
│ /clients/bookings/[id]     Client booking detail                 │
│ /contractors/bookings      Contractor booking list               │
│ /contractors/bookings/[id] Contractor booking detail + controls  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Routes                                │
├─────────────────────────────────────────────────────────────────┤
│ GET  /api/services                 Public catalog (existing)     │
│ GET  /api/services/[id]            Service detail (existing)     │
│ GET  /api/services/[id]/slots      Available time slots (new)    │
│ POST /api/bookings                 Create booking (new)          │
│ GET  /api/bookings/me              User's bookings (new)         │
│ GET  /api/bookings/[id]            Booking detail (new)          │
│ PATCH /api/bookings/[id]/status    Update status (new)           │
│ POST /api/bookings/[id]/simulate   Trigger demo simulation (new) │
│ POST /api/payments/simulate        Simulate payment (new)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Domain Modules                               │
├─────────────────────────────────────────────────────────────────┤
│ src/modules/booking/                                             │
│   ├── services/                                                  │
│   │   ├── bookingService.ts         Booking CRUD + business     │
│   │   ├── bookingStateMachine.ts    State transitions           │
│   │   └── demoSimulationService.ts  Auto-progression logic      │
│   ├── repositories/                                              │
│   │   └── bookingRepository.ts      Prisma queries              │
│   ├── types/                                                     │
│   ├── validators/                                                │
│   └── errors/                                                    │
├─────────────────────────────────────────────────────────────────┤
│ src/modules/payments/                                            │
│   ├── services/                                                  │
│   │   └── paymentService.ts         Payment simulation          │
│   ├── repositories/                                              │
│   └── types/                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Demo Simulation Flow

```
                    User books service
                           │
                           ▼
              ┌────────────────────────┐
              │   PENDING_PAYMENT      │ ← Booking created
              └────────────────────────┘
                           │
                   Simulate ANTICIPO payment
                           │
                           ▼
              ┌────────────────────────┐
              │      CONFIRMED         │ ← Payment succeeded
              └────────────────────────┘
                           │
               Wait for scheduledDate
                           │
                           ▼
              ┌────────────────────────┐
              │   [AUTO] ON_ROUTE      │ ← +0s (at scheduledDate)
              └────────────────────────┘
                           │ +30s
                           ▼
              ┌────────────────────────┐
              │   [AUTO] ON_SITE       │ ← Contractor arrived
              └────────────────────────┘
                           │ +30s
                           ▼
              ┌────────────────────────┐
              │   [AUTO] IN_PROGRESS   │ ← Service started
              └────────────────────────┘
                           │ +30s
                           ▼
              ┌────────────────────────┐
              │   [AUTO] COMPLETED     │ ← Service done
              └────────────────────────┘
                           │
               Simulate LIQUIDACION payment
                           │
                           ▼
                    Flow complete
```

**Manual Override:** Contractor can advance status at any time using dashboard controls, bypassing automatic progression.

### State Machine Valid Transitions

```typescript
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ON_ROUTE', 'CANCELLED'],
  ON_ROUTE: ['ON_SITE', 'CANCELLED'],
  ON_SITE: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
};
```

### Pricing Model

Following existing schema fields in `Booking` table:
- `basePrice`: Service base price
- `finalPrice`: Final price after adjustments (same as base for MVP)
- `anticipoAmount`: 30% of finalPrice (configurable)
- `liquidacionAmount`: 70% of finalPrice
- `comisionAmount`: 10% platform fee
- `contractorPayoutAmount`: finalPrice - comisionAmount

## UI/UX Design

### Enhanced Client Dashboard

The "Buscar Servicios" tile will be enhanced:
- Larger tile size (spans 2 columns on desktop)
- Gradient background (emerald to teal)
- Animated search icon
- More prominent call-to-action text

### Service Search Page (`/search`)

- Search bar with autocomplete
- Category filter (icons grid)
- Price range filter
- Service cards with:
  - Cover image
  - Title, category
  - Contractor name and avatar
  - Rating (if available)
  - Base price
  - "Ver Detalles" button

### Service Detail Page (`/services/[id]`)

- Image gallery (carousel)
- Service description
- Contractor profile card
- Available time slots (next 7 days)
- "Reservar" button → booking flow

### Booking List Page (`/clients/bookings`)

- Tabs: Activas | Completadas | Canceladas
- Booking cards with:
  - Service title and image
  - Scheduled date/time
  - Status badge (color-coded)
  - Contractor info
  - "Ver Detalles" button

### Booking Detail Page (`/clients/bookings/[id]`)

- Service and contractor info
- Booking timeline (status history)
- Address and notes
- Payment summary
- Real-time status badge with polling

### Contractor Booking Management (`/contractors/bookings/[id]`)

- Same as client view plus:
  - Manual status control buttons
  - "Avanzar Estado" button (next valid state)
  - Toggle for auto-simulation
  - Client contact info

## Impact

- Affected specs: service-search, booking-flow, demo-simulation
- Affected code: `src/modules/booking/`, `src/modules/payments/`, `apps/web/app/search/`, `apps/web/app/services/`, `apps/web/app/clients/bookings/`, `apps/web/app/contractors/bookings/`
- Affected APIs: `/api/bookings/*`, `/api/services/[id]/slots`, `/api/payments/simulate`
- Database: Uses existing Booking, Payment, BookingStateHistory, Availability tables

## Affected Files

### New Files

**Pages:**
- `apps/web/app/search/page.tsx`
- `apps/web/app/services/[id]/page.tsx`
- `apps/web/app/clients/bookings/[id]/page.tsx`
- `apps/web/app/contractors/bookings/page.tsx`
- `apps/web/app/contractors/bookings/[id]/page.tsx`

**API Routes:**
- `apps/web/app/api/services/[id]/slots/route.ts`
- `apps/web/app/api/bookings/route.ts`
- `apps/web/app/api/bookings/me/route.ts`
- `apps/web/app/api/bookings/[id]/route.ts`
- `apps/web/app/api/bookings/[id]/status/route.ts`
- `apps/web/app/api/bookings/[id]/simulate/route.ts`
- `apps/web/app/api/payments/simulate/route.ts`

**Modules:**
- `apps/web/src/modules/booking/services/bookingService.ts`
- `apps/web/src/modules/booking/services/bookingStateMachine.ts`
- `apps/web/src/modules/booking/services/demoSimulationService.ts`
- `apps/web/src/modules/booking/repositories/bookingRepository.ts`
- `apps/web/src/modules/booking/types/index.ts`
- `apps/web/src/modules/booking/validators/index.ts`
- `apps/web/src/modules/booking/errors/index.ts`
- `apps/web/src/modules/payments/services/paymentService.ts`
- `apps/web/src/modules/payments/repositories/paymentRepository.ts`
- `apps/web/src/modules/payments/types/index.ts`

**Components:**
- `apps/web/src/components/search/ServiceSearchFilters.tsx`
- `apps/web/src/components/search/ServiceCard.tsx`
- `apps/web/src/components/search/ServiceGrid.tsx`
- `apps/web/src/components/services/ServiceDetail.tsx`
- `apps/web/src/components/services/ServiceImageGallery.tsx`
- `apps/web/src/components/services/AvailabilitySlotPicker.tsx`
- `apps/web/src/components/bookings/BookingCard.tsx`
- `apps/web/src/components/bookings/BookingTimeline.tsx`
- `apps/web/src/components/bookings/BookingStatusBadge.tsx`
- `apps/web/src/components/bookings/BookingForm.tsx`
- `apps/web/src/components/bookings/ContractorBookingControls.tsx`

### Modified Files

- `apps/web/src/components/clients/ClientQuickAccessTiles.tsx` - Enhanced search tile
- `apps/web/app/clients/bookings/page.tsx` - Replace placeholder with real implementation
- `apps/web/src/components/contractors/QuickAccessTiles.tsx` - Add bookings tile

## Testing Plan

### Casos de prueba a agregar al STP

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-004-01 | Búsqueda de servicios por categoría | Integración | Alta | RF-004 |
| TC-RF-004-02 | Búsqueda de servicios por término de búsqueda | Integración | Alta | RF-004 |
| TC-RF-004-03 | Filtrado de servicios por rango de precio | Integración | Media | RF-004 |
| TC-RF-004-04 | Paginación de resultados de búsqueda | Integración | Media | RF-004 |
| TC-RF-004-05 | Vista de detalle de servicio muestra información completa | E2E | Alta | RF-004 |
| TC-RF-005-01 | Creación de reserva con slot disponible | Integración | Alta | RF-005 |
| TC-RF-005-02 | Validación de slot no disponible (ya reservado) | Integración | Alta | RF-005 |
| TC-RF-005-03 | Cálculo correcto de precios (anticipo, liquidación, comisión) | Unitaria | Alta | RF-005 |
| TC-RF-005-04 | Simulación de pago ANTICIPO cambia estado a CONFIRMED | Integración | Alta | RF-005 |
| TC-RF-006-01 | Transición CONFIRMED → ON_ROUTE válida | Unitaria | Alta | RF-006 |
| TC-RF-006-02 | Transición PENDING_PAYMENT → ON_ROUTE inválida | Unitaria | Alta | RF-006 |
| TC-RF-006-03 | BookingStateHistory registra cada transición | Integración | Alta | RF-006 |
| TC-RF-006-04 | Demo simulation avanza estados automáticamente | Integración | Alta | RF-006 |
| TC-RF-006-05 | Manual override detiene simulación automática | Integración | Media | RF-006 |
| TC-DEMO-01 | Simulación respeta intervalo de 30 segundos | Integración | Alta | Demo |
| TC-DEMO-02 | Simulación inicia al llegar scheduledDate | Integración | Alta | Demo |
| TC-DEMO-03 | Simulación genera Payment LIQUIDACION al completar | Integración | Alta | Demo |
| TC-UI-001 | Tile "Buscar Servicios" es más prominente en dashboard | E2E | Media | UI |
| TC-UI-002 | Cliente puede ver historial de reservas | E2E | Alta | RF-006 |
| TC-UI-003 | Contratista puede avanzar estado manualmente | E2E | Alta | RF-006 |

### Criterios de aceptación

- ✅ Cobertura de código ≥ 70% en módulos booking y payments
- ✅ Todos los casos de prueba TC-RF-004-*, TC-RF-005-*, TC-RF-006-* pasan
- ✅ Demo simulation funciona end-to-end con intervalos de 30s
- ✅ Estado de booking visible en tiempo real (polling cada 30s)
- ✅ Contractor puede override manual en cualquier momento
- ✅ CI/CD pasa sin errores

### Estrategia de implementación de tests

**Archivos de test a crear:**
- `src/modules/booking/__tests__/bookingService.test.ts`
- `src/modules/booking/__tests__/bookingStateMachine.test.ts`
- `src/modules/booking/__tests__/bookingRepository.test.ts`
- `src/modules/booking/__tests__/demoSimulationService.test.ts`
- `src/modules/payments/__tests__/paymentService.test.ts`
- `tests/integration/api/bookings.test.ts`
- `tests/integration/api/services-slots.test.ts`

**Mocks y fixtures:**
- Mock de Prisma client para unit tests
- Fixtures de servicios, usuarios, bookings de prueba
- Mock de setTimeout/setInterval para simulation tests

## Dependencies

- Existing service search API (`GET /api/services`)
- Existing slot generation (`slotGeneratorService`)
- Existing auth middleware (`requireRole`, `requireAuth`)
- Existing UI components (`Card`, `Button`, `Badge`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Polling creates server load | Medium | Use 30s interval, implement caching |
| Demo simulation drift | Low | Use server timestamps, not client |
| Manual/auto race condition | Medium | Lock booking during state change |
| Scheduled job reliability | Medium | Fallback to on-demand simulation trigger |

## Timeline Estimate

This proposal is estimated to require significant implementation effort across multiple phases:

1. **Phase 1:** Backend module infrastructure (booking, payments modules)
2. **Phase 2:** API endpoints implementation
3. **Phase 3:** Service search and detail pages
4. **Phase 4:** Booking flow pages (client and contractor)
5. **Phase 5:** Demo simulation system
6. **Phase 6:** Testing and polish

## Open Questions

1. Should cancelled bookings be soft-deleted or kept with CANCELLED status? **Recommendation:** Keep with status for audit trail.
2. Should demo simulation run as a cron job or on-demand API call? **Recommendation:** On-demand with option to enable auto-check.
3. How should we handle timezone for scheduledDate? **Recommendation:** Store in UTC, display in contractor's timezone.

## Approval

- [ ] Technical review
- [ ] User approval
- [ ] Ready for implementation
