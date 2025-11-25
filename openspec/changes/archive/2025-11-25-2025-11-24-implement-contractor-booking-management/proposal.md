# Change: Implement Contractor Booking Management

## Why

Contractors need to view, manage, and advance bookings through their lifecycle. Currently, the contractor dashboard exists but lacks booking management functionality. The client dashboard also has a placeholder for "Mis Reservas" that needs implementation. This feature is critical for the core marketplace flow: client creates booking → contractor confirms → service is delivered → booking completes.

Additionally, a "demo mode" feature is being developed separately that auto-advances booking states every 30 seconds. This proposal should integrate with that existing work.

## What Changes

### Backend (Booking Module)
- Implement `bookingService` with state machine logic for booking lifecycle
- Implement `bookingRepository` for Prisma data access
- Create API endpoints for booking CRUD and state transitions:
  - `GET /api/bookings` - List bookings (filtered by role: client sees their bookings, contractor sees theirs)
  - `GET /api/bookings/:id` - Get booking details
  - `PATCH /api/bookings/:id/state` - Advance booking to next state
  - `GET /api/contractors/bookings` - Contractor-specific booking list with status filters

### Frontend - Contractor Side
- Create `/contractors/bookings` page with status tabs (Pending, Active, Completed, Cancelled)
- Create `/contractors/bookings/[id]` detail page with state advancement actions
- Add `UpcomingBookingsWidget` component to contractor dashboard
- Update `MetricsOverview` to show real booking counts

### Frontend - Client Side
- Implement `/clients/bookings` page (replace placeholder) with booking list
- Create `/clients/bookings/[id]` detail page showing:
  - Booking status and timeline
  - Payment button (visible only when status is CONFIRMED and payment pending)
  - Blocking message when waiting for contractor confirmation

### State Machine Logic
```
PENDING_PAYMENT → (client pays) → CONFIRMED
CONFIRMED → (contractor marks) → ON_SITE
ON_SITE → (contractor marks) → COMPLETED
[Any state] → CANCELLED (with cancellation policy)
[Any state] → DISPUTED
```

**Demo Mode Note:** A separate implementation handles auto-advancing states every 30 seconds. The manual advancement implemented here should coexist with that feature. Development agents should look for and integrate with any existing booking state auto-advance code.

## Impact

- **Affected specs:**
  - `contractor-bookings` (NEW)
  - `client-bookings` (NEW)
  - `booking-module` (NEW - backend)
  - `booking-checkout` (existing, reference)

- **Affected code:**
  - `src/modules/booking/` - New module implementation
  - `app/api/bookings/` - New API routes
  - `app/api/contractors/bookings/` - Contractor booking endpoints
  - `app/contractors/bookings/` - New pages
  - `app/clients/bookings/` - Update existing placeholder
  - `src/components/contractors/` - New booking components
  - `src/components/clients/` - Update UpcomingBookings component

- **Database:** No schema changes (Booking table already exists in Supabase)

- **External integrations:**
  - No Stripe integration for demo (payment button shown but mock/placeholder)
  - State transitions logged to `BookingStateHistory` table

## Out of Scope

- Stripe payment processing (deferred - button shown but no real payment)
- Email notifications for state changes
- Messaging/chat within booking context
- Dispute handling workflow
- Admin booking management

## Testing Plan

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-BK-001-01 | Contractor can view paginated bookings list | RF | High | contractor-bookings |
| TC-RF-BK-002-01 | Contractor can filter bookings by status | RF | High | contractor-bookings |
| TC-RF-BK-003-01 | Contractor can approve a pending booking | RF | High | contractor-bookings |
| TC-RF-BK-004-01 | Contractor can advance booking to ON_ROUTE | RF | High | booking-module |
| TC-RF-BK-005-01 | Contractor can advance booking to ON_SITE | RF | High | booking-module |
| TC-RF-BK-006-01 | Contractor can advance booking to IN_PROGRESS | RF | High | booking-module |
| TC-RF-BK-007-01 | Contractor can complete a booking | RF | High | booking-module |
| TC-RF-BK-008-01 | Client can view their bookings list | RF | High | client-bookings |
| TC-RF-BK-009-01 | Client can view booking detail with timeline | RF | High | client-bookings |
| TC-RF-BK-010-01 | State history is recorded for each transition | RF | Medium | booking-module |
| TC-RNF-BK-011-01 | Booking list loads within 2 seconds | RNF | Medium | contractor-bookings |

See `tasks.md` for additional test cases TC-BK-011 to TC-BK-025.

**Coverage target:** ≥70% for booking module
