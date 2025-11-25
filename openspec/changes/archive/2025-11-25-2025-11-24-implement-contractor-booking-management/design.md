# Design: Contractor Booking Management

## Context

ReparaYa is a home services marketplace connecting clients with contractors. The booking lifecycle is the core transactional flow. Database schema is already defined with `Booking`, `BookingStateHistory`, `Payment`, and related tables in Supabase.

**Current state:**
- Prisma schema defines BookingStatus enum: `PENDING_PAYMENT`, `CONFIRMED`, `ON_ROUTE`, `ON_SITE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `DISPUTED`
- Client and Contractor dashboards exist with sidebar navigation to `/bookings`
- `/clients/bookings` and `/contractors/bookings` routes exist but are placeholders
- No booking module implementation exists (`src/modules/booking/` only has README)

**Constraints:**
- No Stripe integration for demo phase (mock payment flow)
- Must support both manual state advancement and auto-demo mode (30s auto-advance)
- Authorization must enforce role-based access (clients see their bookings, contractors see theirs)

## Goals / Non-Goals

**Goals:**
- Implement complete booking module backend (service + repository + types + validators)
- Create contractor booking list page with status tab filtering
- Create contractor booking detail page with state advancement actions
- Implement client booking list page (replace placeholder)
- Create client booking detail page with payment button and status tracking
- Add booking widgets to both dashboards
- Maintain audit trail via `BookingStateHistory`

**Non-Goals:**
- Real Stripe payment processing
- Email/push notifications
- In-app messaging for bookings
- Dispute resolution workflow
- Admin booking management interface
- Performance optimization (k6 tests)

## Decisions

### 1. State Machine Implementation

**Decision:** Implement state transitions in `bookingService.advanceState()` with explicit validation

**Rationale:**
- Booking states follow a linear progression with specific rules
- Each transition must be validated and logged
- State machine logic centralized in service layer for testability

**Valid Transitions:**
```
PENDING_PAYMENT → CONFIRMED (when payment received, or demo auto-advance)
CONFIRMED → ON_ROUTE (optional, contractor marks en route)
ON_ROUTE → ON_SITE (contractor arrived)
CONFIRMED → ON_SITE (direct, skip ON_ROUTE)
ON_SITE → IN_PROGRESS (optional, work started)
IN_PROGRESS → COMPLETED (work finished)
ON_SITE → COMPLETED (direct, skip IN_PROGRESS)
Any except COMPLETED → CANCELLED
Any → DISPUTED
```

**Simplified for Demo:**
```
PENDING_PAYMENT → CONFIRMED → ON_SITE → COMPLETED
```

### 2. API Structure

**Decision:** Use Next.js App Router API routes with shared booking module

```
app/api/
├── bookings/
│   ├── route.ts              # GET (list for current user), POST (create)
│   └── [id]/
│       ├── route.ts          # GET (detail), DELETE (cancel)
│       └── state/
│           └── route.ts      # PATCH (advance state)
└── contractors/
    └── bookings/
        └── route.ts          # GET (contractor-specific list with filters)
```

**Rationale:**
- Follows existing API patterns in codebase
- `/api/bookings` for user-agnostic operations
- `/api/contractors/bookings` for contractor-specific views with enhanced filtering

### 3. Authorization Model

**Decision:** Role-based access with ownership verification

| Endpoint | CLIENT | CONTRACTOR | ADMIN |
|----------|--------|------------|-------|
| GET /api/bookings | Own bookings | Own bookings | All |
| GET /api/bookings/:id | If clientId matches | If contractorId matches | Yes |
| PATCH /api/bookings/:id/state | Limited (cancel only) | Full advancement | Yes |
| GET /api/contractors/bookings | 403 | Own bookings | All |

### 4. Component Architecture

**Decision:** Server Components with Client Components for interactivity

```
app/contractors/bookings/
├── page.tsx                    # Server: fetch bookings, render BookingsList
└── [id]/
    └── page.tsx                # Server: fetch booking, render BookingDetail

src/components/contractors/
├── bookings/
│   ├── BookingsList.tsx        # Client: tabs, filtering, list rendering
│   ├── BookingCard.tsx         # Client: single booking card
│   ├── BookingDetail.tsx       # Client: full detail with actions
│   ├── BookingStateActions.tsx # Client: state advancement buttons
│   └── BookingTimeline.tsx     # Client: visual state history
└── UpcomingBookingsWidget.tsx  # Client: dashboard widget (update existing)
```

### 5. Demo Mode Integration

**Decision:** Support both manual and automatic state advancement

The existing (in-progress) demo auto-advance feature uses a separate mechanism. Manual advancement via API should:
1. Check for demo mode flag (environment variable or feature flag)
2. If demo mode: allow any valid forward transition without payment verification
3. If production mode: enforce payment verification before CONFIRMED state

**Integration note for development agents:** Look for existing booking demo code that auto-advances states. The manual advancement here should use the same state transition logic.

## Risks / Trade-offs

### Risk: Demo mode vs Production mode confusion
**Mitigation:** Clear environment variable `NEXT_PUBLIC_DEMO_MODE` flag, visual indicator in UI

### Risk: State machine complexity with multiple optional states
**Mitigation:** Start with simplified 4-state flow for demo, expand later

### Risk: Race conditions on state transitions
**Mitigation:** Use Prisma transactions with optimistic locking on `updatedAt`

### Trade-off: No real payments in demo
**Accepted:** Payment button shown but triggers mock confirmation. Real Stripe integration deferred.

## Data Model Reference

Already defined in Prisma schema (`apps/web/prisma/schema.prisma`):

```prisma
model Booking {
  id                     String                @id @default(uuid())
  serviceId              String
  clientId               String
  contractorId           String
  availabilityId         String                @unique
  status                 BookingStatus         @default(PENDING_PAYMENT)
  scheduledDate          DateTime
  address                String
  notes                  String?
  basePrice              Decimal               @db.Decimal(12, 2)
  finalPrice             Decimal               @db.Decimal(12, 2)
  anticipoAmount         Decimal               @db.Decimal(12, 2)
  liquidacionAmount      Decimal               @db.Decimal(12, 2)
  comisionAmount         Decimal               @db.Decimal(12, 2)
  contractorPayoutAmount Decimal               @db.Decimal(12, 2)
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  // Relations...
}

enum BookingStatus {
  PENDING_PAYMENT
  CONFIRMED
  ON_ROUTE
  ON_SITE
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DISPUTED
}
```

## Migration Plan

No database migrations required - schema already exists.

**Implementation order:**
1. Backend: booking module (types, validators, repository, service)
2. Backend: API routes
3. Frontend: Contractor pages and components
4. Frontend: Client pages and components
5. Frontend: Dashboard widget updates
6. Integration: Connect with existing demo auto-advance (if found)

## Open Questions

1. **Demo auto-advance integration:** Where is the existing demo code? Development agents should search for it.
2. **Payment button behavior:** Should clicking "Pay" in demo mode auto-advance to CONFIRMED, or show a mock payment modal?
3. **Status display:** Should we use Spanish labels (Pendiente, Confirmada, En Sitio, Completada) or English?

**Recommendation:** Use Spanish labels consistent with existing UI (ClientSidebar shows "Mis Reservas", etc.)
