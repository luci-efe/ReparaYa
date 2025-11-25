# Implementation Tasks

**Change ID:** 2025-11-24-service-search-booking-demo
**Total Estimated Tasks:** 45

## Phase 1: Backend Module Infrastructure

### 1.1 Booking Module Setup
- [ ] **T-001** Create booking module directory structure
  - `src/modules/booking/services/`
  - `src/modules/booking/repositories/`
  - `src/modules/booking/types/`
  - `src/modules/booking/validators/`
  - `src/modules/booking/errors/`
  - `src/modules/booking/__tests__/`
  - **Verification:** `ls -la src/modules/booking/`

- [ ] **T-002** Implement booking types and DTOs
  - Create `types/index.ts` with BookingDTO, CreateBookingDTO, UpdateBookingStatusDTO
  - Include BookingStatus, PaymentStatus, PaymentType enums (aligned with Prisma)
  - **Verification:** TypeScript compiles without errors

- [ ] **T-003** Implement booking validators (Zod schemas)
  - `validators/index.ts` with createBookingSchema, updateStatusSchema
  - Validate scheduledDate is in future, valid address, etc.
  - **Verification:** Unit tests pass

- [ ] **T-004** Implement booking errors
  - BookingNotFoundError, InvalidStateTransitionError, SlotNotAvailableError
  - DuplicateBookingError, UnauthorizedBookingAccessError
  - **Verification:** Error classes export correctly

- [ ] **T-005** Implement booking repository
  - CRUD operations: create, findById, findByClientId, findByContractorId
  - Update status, add state history
  - **Verification:** Unit tests with mock Prisma pass

- [ ] **T-006** Implement booking state machine
  - `services/bookingStateMachine.ts`
  - VALID_TRANSITIONS constant
  - `canTransition(from, to)` and `getValidTransitions(from)` functions
  - **Verification:** Unit tests cover all state combinations

- [ ] **T-007** Implement booking service
  - `services/bookingService.ts`
  - createBooking, getBookingById, getBookingsByUser, updateBookingStatus
  - Business logic for pricing calculation
  - **Verification:** Unit tests with mocked repository pass

### 1.2 Payments Module Setup
- [ ] **T-008** Create payments module directory structure
  - `src/modules/payments/services/`
  - `src/modules/payments/repositories/`
  - `src/modules/payments/types/`
  - `src/modules/payments/__tests__/`
  - **Verification:** `ls -la src/modules/payments/`

- [ ] **T-009** Implement payment types
  - PaymentDTO, CreatePaymentDTO
  - PaymentType, PaymentStatus enums
  - **Verification:** TypeScript compiles

- [ ] **T-010** Implement payment repository
  - create, findByBookingId, updateStatus
  - **Verification:** Unit tests pass

- [ ] **T-011** Implement payment service (simulation)
  - `services/paymentService.ts`
  - simulateAnticipo, simulateLiquidacion
  - Mark payments as simulated in metadata
  - **Verification:** Unit tests pass

### 1.3 Demo Simulation Service
- [ ] **T-012** Implement demo simulation service
  - `src/modules/booking/services/demoSimulationService.ts`
  - checkAndAdvanceBookings, advanceToNextState
  - getNextDemoState helper
  - 30-second interval logic
  - **Verification:** Unit tests with mocked timers pass

---

## Phase 2: API Endpoints

### 2.1 Service Slots API
- [ ] **T-013** Implement GET /api/services/[id]/slots
  - Return available time slots for next 7 days
  - Use existing slotGeneratorService
  - Filter out already booked slots
  - **Verification:** Integration test passes

### 2.2 Booking CRUD APIs
- [ ] **T-014** Implement POST /api/bookings
  - Create booking with validation
  - Calculate pricing breakdown
  - Create Availability record
  - Return BookingDTO
  - **Verification:** Integration test passes

- [ ] **T-015** Implement GET /api/bookings/me
  - Return current user's bookings
  - Support filtering by status (active, completed, cancelled)
  - Include service and contractor info
  - **Verification:** Integration test passes

- [ ] **T-016** Implement GET /api/bookings/[id]
  - Return booking detail with state history
  - Verify ownership (client or contractor)
  - Include service, contractor, and payment info
  - **Verification:** Integration test passes

- [ ] **T-017** Implement PATCH /api/bookings/[id]/status
  - Update booking status (contractor only)
  - Validate state transition
  - Create BookingStateHistory record
  - **Verification:** Integration test passes

### 2.3 Simulation APIs
- [ ] **T-018** Implement POST /api/bookings/[id]/simulate
  - Trigger simulation start for booking
  - Require CONTRACTOR or ADMIN role
  - Return estimated completion time
  - **Verification:** Integration test passes

- [ ] **T-019** Implement POST /api/payments/simulate
  - Simulate ANTICIPO payment
  - Update booking status to CONFIRMED
  - Return payment record
  - **Verification:** Integration test passes

---

## Phase 3: Service Search & Detail Pages

### 3.1 Search Page
- [ ] **T-020** Create ServiceSearchFilters component
  - Category dropdown/grid
  - Price range slider
  - Search text input
  - Apply filters button
  - **Verification:** Component renders, filters emit values

- [ ] **T-021** Create ServiceCard component
  - Service image, title, category
  - Contractor avatar and name
  - Base price display
  - "Ver Detalles" link
  - **Verification:** Component renders with mock data

- [ ] **T-022** Create ServiceGrid component
  - Grid layout (responsive)
  - Pagination controls
  - Loading skeleton
  - Empty state
  - **Verification:** Component renders service list

- [ ] **T-023** Implement /search page
  - Integrate filters, grid, pagination
  - Call GET /api/services with filters
  - URL query params for sharing/bookmarking
  - **Verification:** Page loads, search works E2E

### 3.2 Service Detail Page
- [ ] **T-024** Create ServiceImageGallery component
  - Carousel/gallery for service images
  - Fullscreen view option
  - **Verification:** Component renders images

- [ ] **T-025** Create AvailabilitySlotPicker component
  - Display slots grouped by date
  - Select single slot
  - Show "Sin disponibilidad" when empty
  - **Verification:** Component renders slots, selection works

- [ ] **T-026** Create ServiceDetail component
  - Service info, contractor card, image gallery
  - Availability picker
  - "Reservar" button (disabled if not authenticated)
  - **Verification:** Component renders complete view

- [ ] **T-027** Implement /services/[id] page
  - Fetch service detail
  - Fetch available slots
  - Handle non-existent service (404)
  - **Verification:** Page loads, shows service info

---

## Phase 4: Booking Flow Pages

### 4.1 Booking Creation
- [ ] **T-028** Create BookingForm component
  - Address selection (from saved or new)
  - Notes textarea
  - Pricing summary display
  - Submit button
  - **Verification:** Form validates, submits correctly

- [ ] **T-029** Implement booking creation flow on service detail
  - Modal or inline form after slot selection
  - Show simulated payment button
  - Redirect to booking detail on success
  - **Verification:** E2E booking creation works

### 4.2 Client Booking Pages
- [ ] **T-030** Create BookingCard component
  - Service thumbnail, title
  - Contractor name
  - Scheduled date/time
  - Status badge
  - "Ver Detalles" link
  - **Verification:** Component renders correctly

- [ ] **T-031** Create BookingStatusBadge component
  - Color-coded by status
  - Spanish labels
  - **Verification:** All statuses render correctly

- [ ] **T-032** Create BookingTimeline component
  - Display BookingStateHistory entries
  - Show timestamps and who changed
  - Current status highlighted
  - **Verification:** Timeline renders history

- [ ] **T-033** Implement /clients/bookings page (replace placeholder)
  - Tab navigation (Activas, Completadas, Canceladas)
  - Booking list with cards
  - Empty states
  - Real-time polling (30s)
  - **Verification:** Page loads, shows user's bookings

- [ ] **T-034** Implement /clients/bookings/[id] page
  - Full booking detail view
  - Timeline, payment summary
  - Real-time status polling
  - **Verification:** Page loads, updates on poll

### 4.3 Contractor Booking Pages
- [ ] **T-035** Create ContractorBookingControls component
  - "Avanzar Estado" button with next valid state
  - Manual status selector dropdown
  - Auto-simulation toggle
  - **Verification:** Controls work, state updates

- [ ] **T-036** Implement /contractors/bookings page
  - List all bookings for contractor's services
  - Sort by scheduledDate
  - Filter by status
  - **Verification:** Page loads contractor's bookings

- [ ] **T-037** Implement /contractors/bookings/[id] page
  - Booking detail + contractor controls
  - Client info display
  - Manual status advancement
  - **Verification:** Page loads, controls work

---

## Phase 5: Dashboard Enhancement

- [ ] **T-038** Enhance ClientQuickAccessTiles "Buscar Servicios"
  - Larger tile (span 2 columns)
  - Gradient background (emerald-teal)
  - More prominent text
  - **Verification:** Visual inspection confirms enhancement

- [ ] **T-039** Add "Reservas" tile to ContractorQuickAccessTiles
  - Link to /contractors/bookings
  - Show count of pending bookings
  - **Verification:** Tile appears, links correctly

---

## Phase 6: Testing & Polish

### 6.1 Unit Tests
- [ ] **T-040** Write unit tests for bookingStateMachine
  - Test all valid transitions
  - Test all invalid transitions
  - **Target Coverage:** 100%

- [ ] **T-041** Write unit tests for bookingService
  - Test create, get, update operations
  - Test pricing calculations
  - **Target Coverage:** 80%

- [ ] **T-042** Write unit tests for demoSimulationService
  - Test state progression logic
  - Test interval timing
  - **Target Coverage:** 80%

### 6.2 Integration Tests
- [ ] **T-043** Write integration tests for booking APIs
  - Test all endpoints
  - Test auth and authorization
  - **Verification:** All tests pass

### 6.3 E2E Tests
- [ ] **T-044** Manual E2E test: Complete booking flow
  - Search → Detail → Book → Pay → Track → Complete
  - Document in STP

### 6.4 Documentation
- [ ] **T-045** Update STP-ReparaYa.md with test cases
  - Add TC-RF-004-* (search)
  - Add TC-RF-005-* (booking)
  - Add TC-RF-006-* (states)
  - Add TC-DEMO-* (simulation)
  - **Verification:** STP contains all new test cases

---

## Task Dependencies

```
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007
                                              ↓
T-008 → T-009 → T-010 → T-011 ─────────────→ T-012
                                              ↓
                                         T-013 to T-019
                                              ↓
                                         T-020 to T-027
                                              ↓
                                         T-028 to T-037
                                              ↓
                                         T-038, T-039
                                              ↓
                                         T-040 to T-045
```

## Parallelization Opportunities

The following task groups can be worked on in parallel:

1. **Backend modules** (T-001 to T-012): Sequential within group
2. **Search UI components** (T-020 to T-022): Parallel
3. **Booking UI components** (T-030 to T-032, T-035): Parallel
4. **Pages implementation**: Sequential (depends on components)
5. **Tests**: Can start as soon as corresponding code is complete

## Definition of Done

Each task is complete when:
- [ ] Code is written and compiles
- [ ] Unit tests pass (where applicable)
- [ ] Integration tests pass (for APIs)
- [ ] Code review completed
- [ ] Documentation updated if needed
- [ ] Feature works as specified in E2E test

## Risk Mitigation Tasks

If time is limited, prioritize:
1. **Critical Path:** T-001→T-007→T-014→T-015→T-016→T-017→T-033→T-034
2. **Demo MVP:** T-012→T-018→T-019→T-035→T-037
3. **UI Polish:** T-020→T-027→T-038 (can be simplified)
