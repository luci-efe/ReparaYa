# Tasks: Implement Contractor Booking Management

## Prerequisites

- [ ] 0.1 Search for existing booking demo auto-advance code in the codebase
- [ ] 0.2 Review Prisma schema for Booking, BookingStateHistory, Payment tables
- [ ] 0.3 Verify database tables exist in Supabase

## 1. Backend - Booking Module Core

### 1.1 Types and Validators
- [ ] 1.1.1 Create `src/modules/booking/types/index.ts` with BookingDTO, CreateBookingDTO, BookingListDTO, BookingStateDTO
- [ ] 1.1.2 Create `src/modules/booking/validators/bookingSchemas.ts` with Zod schemas for validation
- [ ] 1.1.3 Create `src/modules/booking/errors/index.ts` with BookingNotFoundError, InvalidStateTransitionError, UnauthorizedBookingAccessError

### 1.2 Repository Layer
- [ ] 1.2.1 Create `src/modules/booking/repositories/bookingRepository.ts` with:
  - findById(id) - with relations (service, client, contractor, stateHistory)
  - findByClientId(clientId, filters) - paginated, filterable by status
  - findByContractorId(contractorId, filters) - paginated, filterable by status
  - updateStatus(id, status, changedBy, notes) - atomic with history
  - getBookingCounts(userId, role) - counts by status
- [ ] 1.2.2 Write unit tests for bookingRepository (`src/modules/booking/__tests__/bookingRepository.test.ts`)

### 1.3 Service Layer
- [ ] 1.3.1 Create `src/modules/booking/services/bookingService.ts` with:
  - getBookingById(id, userId) - with authorization check
  - getBookingsForUser(userId, role, filters) - delegates to repository
  - advanceState(bookingId, newState, userId) - state machine logic
  - canAdvanceState(booking, newState, userRole) - validation helper
  - getValidTransitions(currentStatus) - returns allowed next states
- [ ] 1.3.2 Implement state machine rules in `src/modules/booking/services/stateMachine.ts`
- [ ] 1.3.3 Write unit tests for bookingService (`src/modules/booking/__tests__/bookingService.test.ts`)
- [ ] 1.3.4 Write unit tests for stateMachine (`src/modules/booking/__tests__/stateMachine.test.ts`)

### 1.4 Module Export
- [ ] 1.4.1 Create `src/modules/booking/index.ts` barrel export

## 2. Backend - API Routes

### 2.1 Core Booking Endpoints
- [ ] 2.1.1 Create `app/api/bookings/route.ts` - GET (list bookings for current user)
- [ ] 2.1.2 Create `app/api/bookings/[id]/route.ts` - GET (booking detail)
- [ ] 2.1.3 Create `app/api/bookings/[id]/state/route.ts` - PATCH (advance state)
- [ ] 2.1.4 Write integration tests for booking API routes

### 2.2 Contractor-Specific Endpoints
- [ ] 2.2.1 Create `app/api/contractors/bookings/route.ts` - GET (contractor bookings with counts)
- [ ] 2.2.2 Write integration tests for contractor bookings API

## 3. Frontend - Contractor Booking Pages

### 3.1 Contractor Bookings List Page
- [ ] 3.1.1 Create `app/contractors/bookings/page.tsx` - Server component
- [ ] 3.1.2 Create `src/components/contractors/bookings/BookingsList.tsx` - Client component with tabs
- [ ] 3.1.3 Create `src/components/contractors/bookings/BookingCard.tsx` - Booking card component
- [ ] 3.1.4 Create `src/components/contractors/bookings/BookingStatusBadge.tsx` - Status badge
- [ ] 3.1.5 Create `src/components/contractors/bookings/EmptyBookingsState.tsx` - Empty state

### 3.2 Contractor Booking Detail Page
- [ ] 3.2.1 Create `app/contractors/bookings/[id]/page.tsx` - Server component
- [ ] 3.2.2 Create `src/components/contractors/bookings/BookingDetail.tsx` - Client component
- [ ] 3.2.3 Create `src/components/contractors/bookings/BookingStateActions.tsx` - Action buttons
- [ ] 3.2.4 Create `src/components/contractors/bookings/BookingTimeline.tsx` - State history timeline
- [ ] 3.2.5 Create `src/components/contractors/bookings/BookingInfoCard.tsx` - Info sections

### 3.3 Dashboard Integration
- [ ] 3.3.1 Update `src/components/contractors/MetricsOverview.tsx` to fetch real booking data
- [ ] 3.3.2 Create `src/components/contractors/UpcomingBookingsWidget.tsx` - Dashboard widget
- [ ] 3.3.3 Update `app/contractors/dashboard/page.tsx` to include UpcomingBookingsWidget

## 4. Frontend - Client Booking Pages

### 4.1 Client Bookings List Page
- [ ] 4.1.1 Update `app/clients/bookings/page.tsx` - Replace placeholder with real implementation
- [ ] 4.1.2 Create `src/components/clients/bookings/ClientBookingsList.tsx` - Client component
- [ ] 4.1.3 Create `src/components/clients/bookings/ClientBookingCard.tsx` - Booking card
- [ ] 4.1.4 Reuse BookingStatusBadge component (move to shared if needed)

### 4.2 Client Booking Detail Page
- [ ] 4.2.1 Create `app/clients/bookings/[id]/page.tsx` - Server component
- [ ] 4.2.2 Create `src/components/clients/bookings/ClientBookingDetail.tsx` - Client component
- [ ] 4.2.3 Create `src/components/clients/bookings/PaymentSection.tsx` - Payment button and status
- [ ] 4.2.4 Create `src/components/clients/bookings/DemoPaymentDialog.tsx` - Mock payment dialog
- [ ] 4.2.5 Reuse BookingTimeline component (move to shared if needed)

### 4.3 Dashboard Integration
- [ ] 4.3.1 Update `src/components/clients/UpcomingBookings.tsx` to fetch real data
- [ ] 4.3.2 Update `src/components/clients/ClientMetricsOverview.tsx` with booking counts

## 5. Shared Components

- [ ] 5.1 Create `src/components/shared/bookings/` directory for shared booking components
- [ ] 5.2 Move BookingStatusBadge to shared if used by both client and contractor
- [ ] 5.3 Move BookingTimeline to shared if used by both client and contractor
- [ ] 5.4 Create booking status utility functions in `src/lib/bookingUtils.ts`

## 6. Testing

### 6.1 Unit Tests
- [ ] 6.1.1 Test bookingRepository - all methods
- [ ] 6.1.2 Test bookingService - all methods including state machine
- [ ] 6.1.3 Test stateMachine - all valid/invalid transitions
- [ ] 6.1.4 Verify coverage ≥70% for booking module

### 6.2 Integration Tests
- [ ] 6.2.1 Test GET /api/bookings - authentication, authorization, filtering
- [ ] 6.2.2 Test GET /api/bookings/:id - access control
- [ ] 6.2.3 Test PATCH /api/bookings/:id/state - state transitions
- [ ] 6.2.4 Test GET /api/contractors/bookings - contractor-specific logic

### 6.3 Component Tests
- [ ] 6.3.1 Test BookingsList component - rendering, filtering
- [ ] 6.3.2 Test BookingDetail component - state actions
- [ ] 6.3.3 Test PaymentSection component - demo payment flow

## 7. Documentation

- [ ] 7.1 Update STP-ReparaYa.md with booking test cases (TC-BK-001 to TC-BK-025)
- [ ] 7.2 Add booking module to openspec/specs/ after implementation

## 8. Demo Mode Integration

- [ ] 8.1 Check for existing demo auto-advance code and document findings
- [ ] 8.2 Ensure manual state advancement coexists with auto-advance
- [ ] 8.3 Add NEXT_PUBLIC_DEMO_MODE environment variable check

---

## Testing Plan

### Test Cases for STP-ReparaYa.md

| ID | Description | Type | Requirement | Priority |
|----|-------------|------|-------------|----------|
| TC-BK-001 | Contractor views bookings list with status tabs | E2E | Contractor Bookings List | Alta |
| TC-BK-002 | Contractor filters bookings by pending status | E2E | Contractor Bookings List | Alta |
| TC-BK-003 | Contractor views booking detail page | E2E | Contractor Booking Detail | Alta |
| TC-BK-004 | Contractor advances booking to ON_SITE | E2E | Booking State Transition | Alta |
| TC-BK-005 | Contractor completes booking | E2E | Booking State Transition | Alta |
| TC-BK-006 | Contractor dashboard shows upcoming bookings widget | E2E | Dashboard Widget | Media |
| TC-BK-007 | Contractor metrics show real booking counts | E2E | Metrics Update | Media |
| TC-BK-008 | Contractor cannot access other contractor's booking | Integración | Authorization | Alta |
| TC-BK-009 | Booking timeline displays state history | E2E | State Timeline | Media |
| TC-BK-010 | Invalid state transition returns error | Integración | State Machine | Alta |
| TC-BK-011 | Client views bookings list | E2E | Client Bookings List | Alta |
| TC-BK-012 | Client views booking detail page | E2E | Client Booking Detail | Alta |
| TC-BK-013 | Client sees payment button when pending | E2E | Payment Section | Alta |
| TC-BK-014 | Client mock payment advances to CONFIRMED | E2E | Demo Payment | Alta |
| TC-BK-015 | Client sees waiting message after confirmation | E2E | Status Display | Media |
| TC-BK-016 | Client dashboard shows upcoming bookings | E2E | Dashboard Widget | Media |
| TC-BK-017 | Client cannot access other client's booking | Integración | Authorization | Alta |
| TC-BK-018 | Client booking list empty state | E2E | Empty State | Baja |
| TC-BK-019 | bookingRepository.findByContractorId returns correct bookings | Unitaria | Repository | Alta |
| TC-BK-020 | bookingRepository.updateStatus creates history record | Unitaria | Repository | Alta |
| TC-BK-021 | bookingService.advanceState validates transitions | Unitaria | Service | Alta |
| TC-BK-022 | State machine allows PENDING_PAYMENT→CONFIRMED | Unitaria | State Machine | Alta |
| TC-BK-023 | State machine rejects COMPLETED→CONFIRMED | Unitaria | State Machine | Alta |
| TC-BK-024 | GET /api/bookings returns user's bookings only | Integración | API | Alta |
| TC-BK-025 | PATCH /api/bookings/:id/state updates status | Integración | API | Alta |

### Acceptance Criteria

- ✅ Cobertura de código ≥ 70% en módulo `src/modules/booking`
- ✅ Todos los casos de prueba TC-BK-* pasan
- ✅ Contractor puede ver, filtrar y gestionar sus reservas
- ✅ Client puede ver sus reservas y simular pago en demo mode
- ✅ State machine enforce valid transitions only
- ✅ Authorization verifica ownership en todos los endpoints
- ✅ CI/CD pasa sin errores
