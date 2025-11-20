# Implementation Tasks - Contractor Availability

**Propuesta:** `/openspec/changes/2025-11-20-contractor-availability/proposal.md`
**Spec:** `/openspec/specs/contractor-availability/spec.md`

---

## Phase 1: Database Schema & Migration

### Task 1.1: Create Prisma migration for new tables
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Add `ContractorWeeklySchedule` model to schema.prisma
- [ ] Add `ContractorAvailabilityException` model with ExceptionType enum
- [ ] Add `ContractorAvailabilityBlockout` model
- [ ] Add relations to `ContractorProfile` (weeklySchedule, availabilityExceptions, availabilityBlockouts)
- [ ] Create migration: `npx prisma migrate dev --name add_contractor_availability_tables`
- [ ] Verify migration on local database
- [ ] Test rollback with `npx prisma migrate reset`
- [ ] Commit migration files

**Verification:**
```bash
npx prisma migrate status
# Should show: "Database is up to date"

# Verify tables exist:
psql $DATABASE_URL -c "\dt" | grep -E "(ContractorWeeklySchedule|ContractorAvailabilityException|ContractorAvailabilityBlockout)"
```

**Files Created/Modified:**
- `apps/web/prisma/schema.prisma` (modified)
- `apps/web/prisma/migrations/YYYYMMDDHHMMSS_add_contractor_availability_tables/migration.sql` (created)

---

### Task 1.2: Update Prisma client and verify types
**Estimate:** 30 min
**Status:** ⏳ Pending

**Checklist:**
- [ ] Run `npx prisma generate` to update Prisma client
- [ ] Verify new types available in TypeScript
- [ ] Test basic CRUD operations in Prisma Studio
- [ ] Document any schema design decisions

**Verification:**
```typescript
// Test in Node REPL or test file:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Should autocomplete:
prisma.contractorWeeklySchedule.findUnique(...)
prisma.contractorAvailabilityException.findMany(...)
prisma.contractorAvailabilityBlockout.create(...)
```

---

## Phase 2: Core Module Structure & Types

### Task 2.1: Create module directory structure
**Estimate:** 30 min
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `src/modules/contractors/availability/` directory
- [ ] Create subdirectories: `services/`, `repositories/`, `types/`, `validators/`, `utils/`, `__tests__/`
- [ ] Create placeholder index.ts files in each directory
- [ ] Create main `index.ts` with public exports

**Files Created:**
```
src/modules/contractors/availability/
├── __tests__/.gitkeep
├── services/index.ts
├── repositories/index.ts
├── types/index.ts
├── validators/index.ts
├── utils/index.ts
└── index.ts
```

---

### Task 2.2: Define TypeScript types and DTOs
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `types/schedule.ts` - Schedule DTOs (CreateScheduleDTO, UpdateScheduleDTO, ScheduleResponseDTO)
- [ ] Create `types/exception.ts` - Exception DTOs (CreateExceptionDTO, ExceptionResponseDTO)
- [ ] Create `types/blockout.ts` - Blockout DTOs (CreateBlockoutDTO, BlockoutResponseDTO)
- [ ] Create `types/slot.ts` - Generated slot types (AvailableSlot, SlotGenerationParams)
- [ ] Create `types/common.ts` - Common types (DayOfWeek enum, TimeInterval interface)
- [ ] Export all types from `types/index.ts`
- [ ] Add JSDoc comments for all interfaces

**Verification:**
- All types compile without errors
- Types properly inferred from Zod schemas (later)

**Files Created:**
- `src/modules/contractors/availability/types/schedule.ts`
- `src/modules/contractors/availability/types/exception.ts`
- `src/modules/contractors/availability/types/blockout.ts`
- `src/modules/contractors/availability/types/slot.ts`
- `src/modules/contractors/availability/types/common.ts`
- `src/modules/contractors/availability/types/index.ts`

---

### Task 2.3: Implement Zod validation schemas
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `validators/schedule.ts`:
  - `timeIntervalSchema` - Validate HH:mm format, start < end
  - `weeklyRuleSchema` - Validate day + intervals
  - `createScheduleSchema` - Full schedule validation with overlap detection
  - `updateScheduleSchema` - Partial update validation
- [ ] Create `validators/exception.ts`:
  - `createExceptionSchema` - Validate ONE_OFF vs RECURRING logic
  - Custom refinements for date/recurringMonth/recurringDay
- [ ] Create `validators/blockout.ts`:
  - `createBlockoutSchema` - Validate date/time ranges
- [ ] Export all schemas and inferred types from `validators/index.ts`
- [ ] Write unit tests for all validators in `__tests__/validators.test.ts`

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/validators.test.ts
# All validation tests should pass
```

**Files Created:**
- `src/modules/contractors/availability/validators/schedule.ts`
- `src/modules/contractors/availability/validators/exception.ts`
- `src/modules/contractors/availability/validators/blockout.ts`
- `src/modules/contractors/availability/validators/index.ts`
- `src/modules/contractors/availability/__tests__/validators.test.ts`

---

## Phase 3: Repository Layer

### Task 3.1: Implement ScheduleRepository
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `repositories/scheduleRepository.ts`
- [ ] Implement methods:
  - `create(contractorProfileId, data)` - Create schedule
  - `findByContractorProfileId(id)` - Get schedule
  - `update(contractorProfileId, data)` - Update schedule
  - `delete(contractorProfileId)` - Delete schedule (future)
  - `exists(contractorProfileId)` - Check if schedule exists
- [ ] Add Prisma error handling
- [ ] Export repository singleton

**Verification:**
- Unit tests for repository methods
- Mock Prisma client
- Test error scenarios (not found, constraint violations)

**Files Created:**
- `src/modules/contractors/availability/repositories/scheduleRepository.ts`
- `src/modules/contractors/availability/__tests__/scheduleRepository.test.ts`

---

### Task 3.2: Implement ExceptionRepository
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `repositories/exceptionRepository.ts`
- [ ] Implement methods:
  - `create(contractorProfileId, data)` - Create exception
  - `findById(id)` - Get exception by ID
  - `findByContractorProfileId(id, filters?)` - List exceptions with optional filters
  - `update(id, data)` - Update exception (future)
  - `delete(id)` - Delete exception
  - `findRecurringForDate(contractorProfileId, date)` - Get recurring exceptions for specific date
  - `findOneOffForDateRange(contractorProfileId, startDate, endDate)` - Get one-off exceptions in range
- [ ] Export repository singleton

**Files Created:**
- `src/modules/contractors/availability/repositories/exceptionRepository.ts`
- `src/modules/contractors/availability/__tests__/exceptionRepository.test.ts`

---

### Task 3.3: Implement BlockoutRepository
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `repositories/blockoutRepository.ts`
- [ ] Implement methods:
  - `create(contractorProfileId, data)` - Create blockout
  - `findById(id)` - Get blockout by ID
  - `findByContractorProfileId(id, filters?)` - List blockouts with optional date range
  - `delete(id)` - Delete blockout
  - `findOverlappingBookings(contractorProfileId, date, startTime, endTime)` - Check for booking conflicts
- [ ] Add query to join with Booking table for overlap detection
- [ ] Export repository singleton

**Files Created:**
- `src/modules/contractors/availability/repositories/blockoutRepository.ts`
- `src/modules/contractors/availability/__tests__/blockoutRepository.test.ts`

---

## Phase 4: Utility Functions

### Task 4.1: Implement timezone conversion utilities
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Install dependency: `npm install date-fns date-fns-tz`
- [ ] Create `utils/timezoneConversion.ts`
- [ ] Implement functions:
  - `convertLocalTimeToUTC(date, time, timezone)` - Convert local HH:mm to UTC DateTime
  - `convertUTCToLocalTime(utcDateTime, timezone)` - Convert UTC to local time
  - `validateTimezone(timezone)` - Check if IANA timezone is valid
  - `getCurrentOffsetForTimezone(timezone, date)` - Get UTC offset for specific date (handles DST)
- [ ] Write comprehensive unit tests including DST transitions
- [ ] Document DST handling strategy in JSDoc

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/timezoneConversion.test.ts
# Test DST transitions:
# - America/Mexico_City switches DST in April and October
# - Verify correct offset before/after transition
```

**Files Created:**
- `src/modules/contractors/availability/utils/timezoneConversion.ts`
- `src/modules/contractors/availability/__tests__/timezoneConversion.test.ts`

---

### Task 4.2: Implement overlap detection utilities
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `utils/overlapDetection.ts`
- [ ] Implement functions:
  - `detectIntervalOverlap(interval1, interval2)` - Check if two time intervals overlap
  - `detectDayIntervalOverlaps(intervals[])` - Find overlaps in array of intervals
  - `mergeIntervals(intervals[])` - Merge overlapping intervals (optional utility)
- [ ] Write unit tests with various overlap scenarios
- [ ] Document overlap logic with diagrams/examples

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/overlapDetection.test.ts
# Test cases:
# - No overlap: [08:00-10:00] vs [10:00-12:00]
# - Partial overlap: [08:00-10:00] vs [09:00-11:00]
# - Full overlap: [08:00-12:00] vs [09:00-10:00]
# - Exact match: [08:00-10:00] vs [08:00-10:00]
```

**Files Created:**
- `src/modules/contractors/availability/utils/overlapDetection.ts`
- `src/modules/contractors/availability/__tests__/overlapDetection.test.ts`

---

### Task 4.3: Implement slot generation algorithm
**Estimate:** 5 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `utils/slotGenerator.ts`
- [ ] Implement core algorithm:
  - `generateSlotsForDate(date, weeklySchedule, exceptions, blockouts, bookings, params)` - Generate slots for single date
  - `generateSlotsForDateRange(startDate, endDate, ...)` - Generate slots for date range
  - Apply priority: bookings > blockouts > exceptions > weekly schedule
  - Handle timezone conversions
  - Filter by service duration if provided
  - Apply granularity (15/30/60 min intervals)
- [ ] Write comprehensive unit tests:
  - Test weekly schedule baseline
  - Test exception override (full-day and partial)
  - Test blockout subtraction
  - Test booking exclusion
  - Test timezone conversion
  - Test granularity alignment
- [ ] Optimize performance (consider memoization/caching)

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/slotGenerator.test.ts
# Measure performance:
# - Generate 8 weeks of slots should take < 500ms (without DB queries)
```

**Files Created:**
- `src/modules/contractors/availability/utils/slotGenerator.ts`
- `src/modules/contractors/availability/__tests__/slotGenerator.test.ts`

---

## Phase 5: Service Layer

### Task 5.1: Implement ScheduleService
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `services/scheduleService.ts`
- [ ] Implement methods:
  - `createSchedule(contractorProfileId, input, userId, userRole)` - Create with authorization
  - `updateSchedule(contractorProfileId, input, userId, userRole)` - Update with authorization
  - `getSchedule(contractorProfileId, userId, userRole)` - Get with authorization
  - `deleteSchedule(contractorProfileId, userId, userRole)` - Delete (future)
  - `toScheduleResponseDTO(schedule)` - Transform to DTO
- [ ] Add ownership verification logic
- [ ] Add default timezone fallback (from ContractorServiceLocation)
- [ ] Validate intervals with Zod before saving
- [ ] Write unit tests with mocked repository

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/scheduleService.test.ts
# Test authorization scenarios:
# - Owner can create/update/delete
# - Non-owner gets 403 Forbidden
# - Admin can read
```

**Files Created:**
- `src/modules/contractors/availability/services/scheduleService.ts`
- `src/modules/contractors/availability/__tests__/scheduleService.test.ts`

---

### Task 5.2: Implement ExceptionService
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `services/exceptionService.ts`
- [ ] Implement methods:
  - `createException(contractorProfileId, input, userId, userRole)`
  - `listExceptions(contractorProfileId, filters, userId, userRole)`
  - `getException(id, userId, userRole)`
  - `deleteException(id, userId, userRole)`
  - `toExceptionResponseDTO(exception)`
- [ ] Validate ONE_OFF vs RECURRING logic
- [ ] Write unit tests

**Files Created:**
- `src/modules/contractors/availability/services/exceptionService.ts`
- `src/modules/contractors/availability/__tests__/exceptionService.test.ts`

---

### Task 5.3: Implement BlockoutService
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `services/blockoutService.ts`
- [ ] Implement methods:
  - `createBlockout(contractorProfileId, input, userId, userRole)`
  - `listBlockouts(contractorProfileId, filters, userId, userRole)`
  - `deleteBlockout(id, userId, userRole)`
  - `toBlockoutResponseDTO(blockout)`
- [ ] Add validation: blockout must be in future (at least 1 hour)
- [ ] Add validation: check for overlapping confirmed bookings
- [ ] Write unit tests including conflict scenarios

**Files Created:**
- `src/modules/contractors/availability/services/blockoutService.ts`
- `src/modules/contractors/availability/__tests__/blockoutService.test.ts`

---

### Task 5.4: Implement SlotGenerationService
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `services/slotGenerationService.ts`
- [ ] Implement methods:
  - `generateSlots(contractorProfileId, params)` - Main slot generation
  - Fetch schedule, exceptions, blockouts, bookings from repositories
  - Call `slotGenerator` utility
  - Convert slots to UTC
  - Return DTO with timezone info
  - Validate date range (max 12 weeks)
- [ ] Add caching strategy (optional for MVP, document for future)
- [ ] Write integration tests with real DB queries

**Verification:**
```bash
npm run test -- src/modules/contractors/availability/__tests__/slotGenerationService.test.ts
# Integration test should:
# - Create schedule in DB
# - Create exceptions and blockouts
# - Generate slots
# - Verify correct exclusions
```

**Files Created:**
- `src/modules/contractors/availability/services/slotGenerationService.ts`
- `src/modules/contractors/availability/__tests__/slotGenerationService.test.ts`

---

## Phase 6: API Routes

### Task 6.1: Implement schedule management endpoints
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/app/api/contractors/me/availability/schedule/route.ts`
- [ ] Implement handlers:
  - `POST` - Create schedule (call scheduleService.createSchedule)
  - `GET` - Get schedule (call scheduleService.getSchedule)
- [ ] Create `apps/web/app/api/contractors/me/availability/schedule/route.ts` (for PATCH)
- [ ] Add Clerk authentication middleware
- [ ] Add error handling (try-catch with appropriate HTTP status codes)
- [ ] Validate input with Zod schemas
- [ ] Write integration tests with Supertest

**Verification:**
```bash
npm run test:integration -- api/contractors/me/availability/schedule
# Test all endpoints:
# - POST with valid data returns 201
# - POST with invalid data returns 400
# - GET returns 200 with schedule
# - PATCH updates schedule
# - Authorization tests (401, 403)
```

**Files Created:**
- `apps/web/app/api/contractors/me/availability/schedule/route.ts`
- `tests/integration/api/contractors/availability/schedule.test.ts`

---

### Task 6.2: Implement exception management endpoints
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/app/api/contractors/me/availability/exceptions/route.ts`
- [ ] Implement handlers:
  - `POST` - Create exception
  - `GET` - List exceptions (with query filters)
- [ ] Create `apps/web/app/api/contractors/me/availability/exceptions/[id]/route.ts`
- [ ] Implement handlers:
  - `DELETE` - Delete exception
- [ ] Write integration tests

**Files Created:**
- `apps/web/app/api/contractors/me/availability/exceptions/route.ts`
- `apps/web/app/api/contractors/me/availability/exceptions/[id]/route.ts`
- `tests/integration/api/contractors/availability/exceptions.test.ts`

---

### Task 6.3: Implement blockout management endpoints
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/app/api/contractors/me/availability/blockouts/route.ts`
- [ ] Implement handlers:
  - `POST` - Create blockout
  - `GET` - List blockouts
- [ ] Create `apps/web/app/api/contractors/me/availability/blockouts/[id]/route.ts`
- [ ] Implement handlers:
  - `DELETE` - Delete blockout
- [ ] Write integration tests

**Files Created:**
- `apps/web/app/api/contractors/me/availability/blockouts/route.ts`
- `apps/web/app/api/contractors/me/availability/blockouts/[id]/route.ts`
- `tests/integration/api/contractors/availability/blockouts.test.ts`

---

### Task 6.4: Implement slot generation endpoint
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/app/api/contractors/me/availability/slots/route.ts`
- [ ] Implement handler:
  - `GET` - Generate slots (with query params: startDate, endDate, serviceDurationMinutes)
- [ ] Add query parameter validation
- [ ] Write integration tests

**Files Created:**
- `apps/web/app/api/contractors/me/availability/slots/route.ts`
- `tests/integration/api/contractors/availability/slots.test.ts`

---

## Phase 7: UI Components (Scaffolding Only)

### Task 7.1: Create base reusable components
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/src/components/contractors/availability/TimeRangeInput.tsx`
  - Props: startTime, endTime, onChange, error, disabled
  - Validation indicator
  - Remove button
  - TODO: Full implementation
- [ ] Create `apps/web/src/components/contractors/availability/DayScheduleConfigurator.tsx`
  - Props: dayOfWeek, intervals, onChange
  - Enable/disable toggle
  - Multiple time range inputs
  - Add interval button
  - TODO: Full implementation
- [ ] Create placeholder loading/error/empty states
- [ ] Write Storybook stories (optional)

**Files Created:**
- `apps/web/src/components/contractors/availability/TimeRangeInput.tsx`
- `apps/web/src/components/contractors/availability/DayScheduleConfigurator.tsx`

---

### Task 7.2: Create weekly schedule editor (placeholder)
**Estimate:** 5 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/src/components/contractors/availability/WeeklyScheduleEditor.tsx`
- [ ] Structure:
  - Form with react-hook-form
  - Timezone selector (dropdown)
  - Granularity selector (15/30/60 min radio buttons)
  - 7 x DayScheduleConfigurator components (one per day)
  - Save button
  - Loading/error states
  - TODO: Connect to API, full validation
- [ ] Use Zod schema for validation
- [ ] Add accessible labels and ARIA attributes

**Files Created:**
- `apps/web/src/components/contractors/availability/WeeklyScheduleEditor.tsx`

---

### Task 7.3: Create exception manager (placeholder)
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/src/components/contractors/availability/ExceptionManager.tsx`
  - List view of exceptions
  - Filter by type (ONE_OFF / RECURRING)
  - Add exception button
  - Delete exception action
  - Loading/empty states
  - TODO: Connect to API
- [ ] Create `apps/web/src/components/contractors/availability/ExceptionFormModal.tsx`
  - Modal with form
  - Type selector (tabs: One-off / Recurring)
  - Conditional fields based on type
  - Date picker or month/day selectors
  - Full-day closure checkbox
  - Custom intervals editor (if partial)
  - Reason text input
  - TODO: Full validation and API integration

**Files Created:**
- `apps/web/src/components/contractors/availability/ExceptionManager.tsx`
- `apps/web/src/components/contractors/availability/ExceptionFormModal.tsx`

---

### Task 7.4: Create blockout manager (placeholder)
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/src/components/contractors/availability/BlockoutManager.tsx`
  - List view of blockouts
  - Add blockout button
  - Delete blockout action
  - Loading/empty states
  - TODO: Connect to API
- [ ] Create `apps/web/src/components/contractors/availability/BlockoutFormModal.tsx`
  - Modal with form
  - Date picker
  - Time range inputs
  - Reason text input
  - Conflict warning if overlaps with booking
  - TODO: Full validation and API integration

**Files Created:**
- `apps/web/src/components/contractors/availability/BlockoutManager.tsx`
- `apps/web/src/components/contractors/availability/BlockoutFormModal.tsx`

---

### Task 7.5: Create availability calendar (placeholder)
**Estimate:** 6 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/src/components/contractors/availability/AvailabilityCalendar.tsx`
  - Calendar grid (month view)
  - Visual indicators: available (green), blocked (red), exception (yellow), booked (blue)
  - Navigation: prev/next month buttons
  - Click date to view details
  - Responsive: desktop grid, mobile list
  - ARIA grid roles
  - TODO: Full implementation with slot data, interactions

**Files Created:**
- `apps/web/src/components/contractors/availability/AvailabilityCalendar.tsx`

---

### Task 7.6: Create main availability page (placeholder)
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create `apps/web/app/contractors/availability/page.tsx`
  - Server component for auth check (requireRole('CONTRACTOR'))
  - Fetch contractor profile ID
  - Render client component
- [ ] Create `apps/web/src/components/contractors/availability/AvailabilityManagerPage.tsx`
  - Tabs: "Weekly Schedule" | "Exceptions" | "Blockouts"
  - Tab content: WeeklyScheduleEditor, ExceptionManager, BlockoutManager
  - State management for active tab
  - Breadcrumbs navigation
  - TODO: Full state management and API integration
- [ ] Add route to ContractorSidebar navigation
- [ ] Test navigation flow

**Files Created:**
- `apps/web/app/contractors/availability/page.tsx`
- `apps/web/src/components/contractors/availability/AvailabilityManagerPage.tsx`
- Update: `apps/web/src/components/contractors/ContractorSidebar.tsx` (add link)

---

## Phase 8: Testing & Documentation

### Task 8.1: Update STP with test cases
**Estimate:** 3 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Add section "4.1.7 Contractor Availability Management" to `docs/md/STP-ReparaYa.md`
- [ ] Document all 25 test cases (TC-RF-CTR-AVAIL-001 to TC-RNF-CTR-AVAIL-005)
- [ ] Add detailed test procedures for critical cases
- [ ] Add acceptance criteria
- [ ] Link to spec and proposal

**Files Modified:**
- `docs/md/STP-ReparaYa.md`

---

### Task 8.2: Write integration tests
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Test full flow: create schedule → create exceptions → create blockouts → generate slots
- [ ] Test authorization scenarios (owner, non-owner, admin)
- [ ] Test timezone conversion end-to-end
- [ ] Test slot exclusion (exceptions, blockouts, bookings)
- [ ] Measure test coverage (should be ≥ 70%)

**Verification:**
```bash
npm run test:coverage -- src/modules/contractors/availability
# Coverage report should show ≥ 70% for all files
```

---

### Task 8.3: Write E2E tests (placeholder)
**Estimate:** 4 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create Playwright test: `tests/e2e/contractor-availability.spec.ts`
- [ ] Test flow:
  - Login as contractor
  - Navigate to /contractors/availability
  - Configure weekly schedule
  - Create exception
  - Create blockout
  - Verify UI updates
- [ ] Test keyboard navigation
- [ ] Test responsive design (mobile viewport)
- [ ] TODO: Full E2E implementation (requires UI to be functional)

**Files Created:**
- `tests/e2e/contractor-availability.spec.ts` (placeholder)

---

### Task 8.4: Performance testing with k6
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create k6 test script: `tests/performance/availability-slot-generation.js`
- [ ] Test scenario:
  - 100 concurrent requests for slot generation
  - Measure P95 and P99 latencies
  - Target: P95 <= 800ms, P99 <= 1.2s
- [ ] Run test and document results
- [ ] Identify bottlenecks if targets not met
- [ ] TODO: Optimize queries/caching if needed

**Verification:**
```bash
k6 run tests/performance/availability-slot-generation.js
# Check output:
# http_req_duration..........: avg=XXX min=XXX med=XXX max=XXX p(95)=XXX p(99)=XXX
```

**Files Created:**
- `tests/performance/availability-slot-generation.js`

---

### Task 8.5: A11y testing
**Estimate:** 2 hours
**Status:** ⏳ Pending

**Checklist:**
- [ ] Run axe-core automated scan on availability pages
- [ ] Manual keyboard navigation testing
- [ ] Screen reader testing (NVDA or VoiceOver)
- [ ] Document any violations and fix
- [ ] Target: 0 violations
- [ ] TODO: Full testing (requires UI to be functional)

**Verification:**
```bash
npm run test:a11y -- /contractors/availability
# Should report 0 violations
```

---

## Phase 9: Final Integration & Handoff

### Task 9.1: Create migration handoff documentation
**Estimate:** 1 hour
**Status:** ⏳ Pending

**Checklist:**
- [ ] Document migration steps for production
- [ ] Document rollback procedure
- [ ] Document environment variable changes (if any)
- [ ] Create runbook for common issues

**Files Created:**
- `openspec/changes/2025-11-20-contractor-availability/DEPLOYMENT.md`

---

### Task 9.2: Update openspec/project.md
**Estimate:** 30 min
**Status:** ⏳ Pending

**Checklist:**
- [ ] Add contractor-availability to Active Specifications section
- [ ] Update module list
- [ ] Link to spec

**Files Modified:**
- `openspec/project.md`

---

### Task 9.3: Create PR and request review
**Estimate:** 1 hour
**Status:** ⏳ Pending

**Checklist:**
- [ ] Create PR from `feature/contractor-availability` to `dev`
- [ ] Fill PR template with:
  - Summary of changes
  - Testing performed
  - Screenshots (if UI changes)
  - Breaking changes (if any)
  - Migration notes
- [ ] Request review from team
- [ ] Address CodeRabbit feedback
- [ ] Merge when approved

---

## Summary

**Total Estimated Time:** ~80 hours (~2-3 weeks for 1 developer)

**Critical Path:**
1. Database schema (Task 1.1-1.2) - 2.5 hours
2. Types and validators (Task 2.1-2.3) - 7.5 hours
3. Utilities (Task 4.1-4.3) - 10 hours
4. Services (Task 5.1-5.4) - 13 hours
5. API routes (Task 6.1-6.4) - 11 hours
6. Testing (Task 8.1-8.5) - 15 hours

**Nice-to-Have (can be deferred):**
- Full UI implementation (Task 7.1-7.6) - Placeholder/scaffolding for now
- Performance optimization
- Caching strategy
- Advanced E2E tests

**Dependencies:**
- `date-fns` and `date-fns-tz` packages (install in Task 4.1)
- Existing Prisma setup
- Existing Clerk auth setup

**Success Criteria:**
- ✅ All database tables created and migrated
- ✅ All repositories, services, and API routes implemented
- ✅ Cobertura ≥ 70%
- ✅ All 25 test cases in STP passing
- ✅ Performance targets met (P95 <= 800ms)
- ✅ UI scaffolding in place (TODOs documented for full implementation)
- ✅ PR merged to dev
