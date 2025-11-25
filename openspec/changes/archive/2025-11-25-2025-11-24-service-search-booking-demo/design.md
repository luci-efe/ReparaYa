# Design Document: Service Search, Booking Flow, and Demo Simulation

**Change ID:** 2025-11-24-service-search-booking-demo
**Date:** 2025-11-24

## 1. Overview

This document captures architectural decisions and technical design for implementing the service search, booking flow, and demo simulation features in ReparaYa.

## 2. Architecture Decisions

### 2.1 Demo Simulation Approach

**Decision:** Use on-demand simulation triggered by API calls rather than background cron jobs.

**Rationale:**
- Vercel's serverless architecture limits long-running processes
- On-demand approach is simpler to implement and debug
- Users explicitly control when simulation runs
- Cron jobs can be added later for automatic triggering

**Implementation:**
- POST `/api/bookings/[id]/simulate` triggers simulation
- Simulation advances state immediately, then schedules next via setTimeout
- For Vercel, use Edge Functions with streaming for long-running simulations
- Alternative: Use Vercel Cron to check pending simulations every minute

### 2.2 Real-time Updates Strategy

**Decision:** Use polling (30-second interval) instead of WebSockets/SSE for MVP.

**Rationale:**
- Simpler implementation
- No additional infrastructure needed
- Matches demo simulation interval
- Sufficient for MVP demo purposes
- WebSockets/SSE can be added later for production

**Implementation:**
```typescript
// Client-side polling
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await fetchBookingDetail(bookingId);
    setBooking(data);
  }, 30000);
  return () => clearInterval(interval);
}, [bookingId]);
```

### 2.3 Payment Simulation Architecture

**Decision:** Create Payment records with simulated data, flagged in metadata.

**Rationale:**
- Maintains data model consistency with future Stripe integration
- Audit trail preserved
- Easy to identify simulated vs real payments
- Stripe fields (stripePaymentIntentId, etc.) remain null for simulated

**Implementation:**
```typescript
const payment = await prisma.payment.create({
  data: {
    bookingId,
    type: 'ANTICIPO',
    amount: booking.anticipoAmount,
    currency: 'mxn',
    status: 'SUCCEEDED', // Immediately succeed for simulation
    metadata: {
      simulated: true,
      simulatedAt: new Date().toISOString(),
    },
  },
});
```

### 2.4 State Machine Implementation

**Decision:** Pure function state machine without external library.

**Rationale:**
- Simple requirements don't warrant XState complexity
- Easier to test and debug
- No additional dependencies
- Can migrate to XState later if needed

**Implementation:**
```typescript
// bookingStateMachine.ts
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ON_ROUTE', 'CANCELLED'],
  ON_ROUTE: ['ON_SITE', 'CANCELLED'],
  ON_SITE: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: BookingStatus): BookingStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
```

## 3. Data Flow Diagrams

### 3.1 Booking Creation Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│  Client │────▶│ /search     │────▶│ /services/id │
└─────────┘     └─────────────┘     └──────────────┘
                                           │
                                           ▼
                                    Select Time Slot
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ BookingForm  │
                                    └──────────────┘
                                           │
                                           ▼
                                   POST /api/bookings
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
            Validate Slot          Calculate Pricing       Create Records
                    │                      │                      │
                    ▼                      ▼                      ▼
            Check Availability     anticipoAmount = 30%    Booking (PENDING_PAYMENT)
            (not already booked)   liquidacionAmount = 70% Availability (BOOKED)
                                   comisionAmount = 10%
                                           │
                                           ▼
                                    Return BookingDTO
                                           │
                                           ▼
                              Redirect to /clients/bookings/[id]
```

### 3.2 Payment & Simulation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     PENDING_PAYMENT                               │
└──────────────────────────────────────────────────────────────────┘
                              │
               POST /api/payments/simulate
               {bookingId, type: 'ANTICIPO'}
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Create Payment record (ANTICIPO, SUCCEEDED)                   │
│ 2. Update Booking status → CONFIRMED                            │
│ 3. Create BookingStateHistory entry                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       CONFIRMED                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
            Wait for scheduledDate OR POST /api/bookings/[id]/simulate
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Demo Simulation Service Loop                         │
├──────────────────────────────────────────────────────────────────┤
│  1. CONFIRMED → ON_ROUTE (immediate)                             │
│  2. Wait 30 seconds                                               │
│  3. ON_ROUTE → ON_SITE                                           │
│  4. Wait 30 seconds                                               │
│  5. ON_SITE → IN_PROGRESS                                        │
│  6. Wait 30 seconds                                               │
│  7. IN_PROGRESS → COMPLETED                                       │
│  8. Create Payment (LIQUIDACION, SUCCEEDED)                       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Manual Override Flow

```
┌─────────────┐     ┌────────────────────────┐
│ Contractor  │────▶│ /contractors/bookings/id│
└─────────────┘     └────────────────────────┘
                              │
                    Click "Avanzar Estado"
                              │
                              ▼
                   PATCH /api/bookings/[id]/status
                   {status: 'IN_PROGRESS'}
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Validate transition (canTransition)                           │
│ 2. Update Booking status                                         │
│ 3. Create BookingStateHistory (changedBy: contractor.id)        │
│ 4. Return updated BookingDTO                                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    UI updates immediately
                    Auto-simulation continues from new state
```

## 4. Component Architecture

### 4.1 Search Page Component Tree

```
/search (page.tsx)
├── SearchPageHeader
│   └── SearchInput (with autocomplete)
├── ServiceSearchFilters
│   ├── CategoryFilter (grid of icons)
│   └── PriceRangeFilter (slider)
├── ServiceGrid
│   ├── ServiceCard (repeated)
│   │   ├── ServiceImage
│   │   ├── ServiceInfo (title, category, price)
│   │   └── ContractorBadge (avatar, name)
│   └── LoadingSkeletons
├── Pagination
└── EmptyState (when no results)
```

### 4.2 Booking Detail Component Tree

```
/clients/bookings/[id] (page.tsx)
├── ClientDashboardShell
│   └── BookingDetailContent
│       ├── BookingHeader
│       │   ├── ServiceImage
│       │   ├── ServiceTitle
│       │   └── BookingStatusBadge
│       ├── BookingInfo
│       │   ├── ContractorCard
│       │   ├── ScheduledDateTime
│       │   └── ServiceAddress
│       ├── BookingTimeline
│       │   └── TimelineEntry (repeated)
│       ├── PaymentSummary
│       │   ├── AnticipoRow
│       │   └── LiquidacionRow
│       └── BookingNotes
```

### 4.3 Contractor Controls Component

```
ContractorBookingControls
├── StatusSection
│   ├── CurrentStatusBadge
│   └── NextValidStates (chips)
├── ActionButtons
│   ├── AdvanceStatusButton (primary)
│   └── StatusDropdown (all valid states)
├── SimulationToggle
│   ├── AutoSimulationSwitch
│   └── SimulationStatus (running/stopped)
└── ClientInfo
    ├── ClientName
    └── ClientPhone (if available)
```

## 5. API Design Details

### 5.1 POST /api/bookings

**Request:**
```typescript
interface CreateBookingRequest {
  serviceId: string;
  availabilitySlotId: string; // From slot picker
  addressId?: string; // Existing address
  newAddress?: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  notes?: string;
}
```

**Response (201 Created):**
```typescript
interface BookingDTO {
  id: string;
  service: {
    id: string;
    title: string;
    categoryName: string;
    imageUrl?: string;
  };
  contractor: {
    id: string;
    name: string;
    businessName: string;
    avatarUrl?: string;
  };
  status: BookingStatus;
  scheduledDate: string; // ISO 8601
  address: string;
  notes?: string;
  pricing: {
    basePrice: number;
    finalPrice: number;
    anticipoAmount: number;
    liquidacionAmount: number;
    comisionAmount: number;
    currency: string;
  };
  stateHistory: BookingStateHistoryEntry[];
  payments: PaymentSummary[];
  createdAt: string;
}
```

### 5.2 PATCH /api/bookings/[id]/status

**Request:**
```typescript
interface UpdateStatusRequest {
  status: BookingStatus;
  notes?: string;
}
```

**Response (200 OK):** Updated BookingDTO

**Error Responses:**
- 400: Invalid state transition
- 403: Not authorized (not the contractor)
- 404: Booking not found

### 5.3 POST /api/bookings/[id]/simulate

**Request:** Empty body or optional:
```typescript
interface SimulateRequest {
  skipToScheduledDate?: boolean; // Start immediately even if future
}
```

**Response (200 OK):**
```typescript
interface SimulateResponse {
  bookingId: string;
  currentStatus: BookingStatus;
  simulationStarted: boolean;
  estimatedCompletionTime: string; // ISO 8601
  message: string;
}
```

## 6. Database Queries Optimization

### 6.1 Booking List Query

```sql
-- Get client's bookings with service and contractor info
SELECT
  b.*,
  s.title as service_title,
  s."categoryId",
  sc.name as category_name,
  u."firstName" || ' ' || u."lastName" as contractor_name,
  cp."businessName"
FROM "Booking" b
JOIN "Service" s ON b."serviceId" = s.id
JOIN "ServiceCategory" sc ON s."categoryId" = sc.id
JOIN "User" u ON b."contractorId" = u.id
LEFT JOIN "ContractorProfile" cp ON u.id = cp."userId"
WHERE b."clientId" = $1
ORDER BY b."scheduledDate" DESC
LIMIT $2 OFFSET $3;
```

### 6.2 Available Slots Query

```sql
-- Get slots that are not yet booked
SELECT a.*
FROM "Availability" a
WHERE a."serviceId" = $1
  AND a.status = 'AVAILABLE'
  AND a.date >= CURRENT_DATE
  AND a.date <= CURRENT_DATE + INTERVAL '7 days'
  AND a."bookingId" IS NULL
ORDER BY a.date, a."startTime";
```

## 7. Error Handling Strategy

### 7.1 Custom Error Classes

```typescript
// src/modules/booking/errors/index.ts
export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Reserva no encontrada: ${bookingId}`);
    this.name = 'BookingNotFoundError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(from: BookingStatus, to: BookingStatus) {
    super(`Transición inválida: ${from} → ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class SlotNotAvailableError extends Error {
  constructor(slotId: string) {
    super(`El horario seleccionado ya no está disponible`);
    this.name = 'SlotNotAvailableError';
  }
}
```

### 7.2 API Error Mapping

| Error Class | HTTP Status | User Message |
|-------------|-------------|--------------|
| BookingNotFoundError | 404 | "Reserva no encontrada" |
| InvalidStateTransitionError | 400 | "Transición de estado no válida" |
| SlotNotAvailableError | 409 | "Este horario ya no está disponible" |
| UnauthorizedError | 401 | "Sesión expirada, por favor inicie sesión" |
| ForbiddenError | 403 | "No tiene permisos para esta acción" |

## 8. Security Considerations

### 8.1 Authorization Matrix

| Endpoint | CLIENT | CONTRACTOR | ADMIN |
|----------|--------|------------|-------|
| GET /api/services | ✅ Public | ✅ Public | ✅ |
| GET /api/services/[id] | ✅ Public | ✅ Public | ✅ |
| GET /api/services/[id]/slots | ✅ Public | ✅ Public | ✅ |
| POST /api/bookings | ✅ | ❌ | ✅ |
| GET /api/bookings/me | ✅ Own | ✅ Own | ✅ All |
| GET /api/bookings/[id] | ✅ Own | ✅ Own | ✅ |
| PATCH /api/bookings/[id]/status | ❌ | ✅ Own | ✅ |
| POST /api/bookings/[id]/simulate | ❌ | ✅ Own | ✅ |
| POST /api/payments/simulate | ✅ Own | ❌ | ✅ |

### 8.2 Input Validation

All inputs validated via Zod schemas:
- UUIDs for IDs
- ISO 8601 for dates
- Enum validation for status values
- String length limits

### 8.3 Audit Trail

All state changes recorded in `BookingStateHistory`:
- Who made the change (userId or "SYSTEM")
- When (createdAt timestamp)
- What changed (fromState, toState)
- Why (notes field)

## 9. Performance Considerations

### 9.1 Caching Strategy

- Service catalog: Cache for 5 minutes (revalidate on demand)
- Categories: Cache indefinitely (manual invalidation)
- Booking detail: No cache (real-time required)

### 9.2 Query Optimization

- Index on `Booking.clientId` for client list queries
- Index on `Booking.contractorId` for contractor list queries
- Index on `Availability.serviceId, date` for slot queries
- Compound index on `Booking.status, scheduledDate` for filtering

## 10. Future Considerations

### 10.1 Stripe Integration Path

When implementing real payments:
1. Replace `simulateAnticipo` with Stripe Checkout session
2. Add webhook handler for `checkout.session.completed`
3. Store `stripePaymentIntentId` and `stripeCheckoutSessionId`
4. Keep simulation mode as fallback for demos

### 10.2 Real-time Upgrade Path

When upgrading to WebSockets:
1. Add Pusher/Ably/Supabase Realtime integration
2. Push booking status changes to subscribed clients
3. Remove polling in favor of subscriptions
4. Keep polling as fallback for connection issues
