# Design Document: Contractor Availability & Calendar System

## Executive Summary

This document outlines the architectural design for ReparaYa's contractor availability management system. The system allows contractors to define their working schedules using **weekly recurrence rules**, handle **exceptions** (holidays, special dates), create **manual blocks** (vacations, maintenance), and exposes a **slot generation engine** that combines these layers to produce bookable time slots for clients.

---

## Problem Statement

### Current State

The existing `Availability` table in Supabase provides basic slot storage (individual `startTime`/`endTime` per date), but lacks:

1. **Recurrence patterns**: Contractors must manually create slots for every single day
2. **Exception handling**: No way to override weekly patterns for holidays
3. **Timezone normalization**: No standardized TZ handling (risk of booking errors)
4. **Conflict detection**: No validation against confirmed bookings when blocking time
5. **Performance**: Generating availability for 8 weeks would require hundreds of DB rows

### Desired State

A **layered availability system** where:

- **Layer 1 (Base)**: Weekly recurrence rules (e.g., "Mondays 9am-5pm")
- **Layer 2 (Overrides)**: Date-specific exceptions (e.g., "Dec 25 blocked")
- **Layer 3 (Restrictions)**: Manual blocks for ad-hoc needs (e.g., "vacations Dec 20-26")
- **Layer 4 (Reservations)**: Confirmed bookings subtract from available slots

**Output**: A slot generation API that merges all layers → returns available time windows in contractor's local timezone.

---

## Architectural Decisions

### AD-001: Three-Table Design (Rules, Exceptions, Blocks)

**Decision**: Use separate tables for `ContractorWeeklyRule`, `ContractorAvailabilityException`, `ContractorAvailabilityBlock` instead of a single polymorphic `Availability` table.

**Rationale**:
- **Clarity**: Each table has distinct semantics and constraints
- **Performance**: Indexed queries for specific use cases (e.g., "find rules for Monday" vs "find exceptions in December")
- **Validation**: Different business rules per type (e.g., weekly rules don't need date ranges; blocks need booking collision checks)

**Tradeoffs**:
- ✅ **Pro**: Clear data model, easier validation logic
- ✅ **Pro**: Better query performance with targeted indices
- ❌ **Con**: More tables to manage (3 instead of 1)
- ❌ **Con**: Slightly more complex joins in slot generation

**Alternatives Considered**:
- Single `Availability` table with `type` enum → rejected due to unclear constraints and harder validation

---

### AD-002: JSON Storage for Intervals

**Decision**: Store `intervals` as JSON array (`[{ startTime: "09:00", endTime: "12:00" }, ...]`) instead of separate `TimeSlot` relation.

**Rationale**:
- **Simplicity**: A day can have 1-N intervals (e.g., "9-12am, 2-6pm"). JSON array is simpler than 1:N relation.
- **Atomicity**: Updating intervals for a day is a single `UPDATE` (no need to delete/recreate related rows).
- **Query pattern**: We rarely query "all intervals across all rules starting at 9am" — we query by day and process intervals in-memory.

**Tradeoffs**:
- ✅ **Pro**: Simpler schema, atomic updates
- ✅ **Pro**: Fewer joins
- ❌ **Con**: Cannot query intervals with SQL filters (e.g., "find all intervals >= 60 min")
- ❌ **Con**: JSON validation must happen at application layer (Zod)

**Alternatives Considered**:
- Separate `Interval` table with FK to `WeeklyRule` → rejected for overkill complexity

---

### AD-003: Timezone Normalization Strategy

**Decision**: Store all datetime fields in **UTC** in Postgres, convert to/from **contractor's local TZ** (IANA) at API boundaries.

**Rationale**:
- **Consistency**: All date math happens in UTC → no DST surprises
- **Correctness**: `ContractorServiceLocation.timezone` is source of truth for contractor TZ
- **Ease of comparison**: Bookings, blocks, and slots all in UTC → simple overlap detection

**Implementation**:
```typescript
// Input (from contractor): "2025-11-20 09:00" in America/Mexico_City
// Persist: "2025-11-20T15:00:00Z" (UTC)
// Output (to contractor): "2025-11-20 09:00" in America/Mexico_City
```

**Tradeoffs**:
- ✅ **Pro**: No ambiguity, correct DST handling
- ✅ **Pro**: Same pattern as existing `Booking` schema
- ❌ **Con**: Requires `date-fns-tz` dependency
- ❌ **Con**: Extra conversion overhead (mitigated by caching contractor TZ)

**Alternatives Considered**:
- Store in contractor's local TZ → rejected due to DST complexity and migration pain
- Store timezone per row → rejected for denormalization waste

---

### AD-004: Slot Generation Algorithm (Compute-on-Read)

**Decision**: **Compute slots on-demand** when `GET /availability/slots` is called, instead of pre-generating and storing slots in DB.

**Rationale**:
- **Flexibility**: Rules/exceptions/blocks can change → no need to regenerate thousands of slots
- **Accuracy**: Always reflects latest state (no risk of stale slots)
- **Storage**: Avoid storing 1000s of derived rows (8 weeks × 7 days × avg 4 intervals = ~200 slots per contractor)

**Algorithm**:
```
FOR each day in [startDate, endDate]:
  1. Get dayOfWeek (0-6)
  2. Find WeeklyRule for dayOfWeek OR Exception for exact date
  3. If Exception.type = BLOCKED → skip day
  4. Start with intervals from Rule or Exception
  5. Subtract all Blocks that intersect this day
  6. Subtract all confirmed Bookings that intersect this day
  7. Filter intervals by serviceId.durationMinutes (if provided)
  8. Emit remaining intervals as available slots
```

**Tradeoffs**:
- ✅ **Pro**: Always fresh, no stale data
- ✅ **Pro**: No complex invalidation logic
- ❌ **Con**: Compute cost on every read (mitigated by 8-week limit + caching layer in future)
- ❌ **Con**: P95 latency risk if not optimized (addressed by indices + query batching)

**Alternatives Considered**:
- Pre-generate slots nightly → rejected for staleness and complexity
- Materialize slots on rule change → rejected for invalidation complexity

---

### AD-005: 8-Week Range Limit

**Decision**: Limit slot generation to **maximum 8 weeks** (56 days) per API request.

**Rationale**:
- **Performance**: 8 weeks × 7 days × avg 10 intervals = ~560 operations per contractor (acceptable)
- **UX**: Clients typically book 1-4 weeks ahead; 8 weeks is generous buffer
- **Abuse prevention**: Prevents API abuse (requesting 1 year of slots)

**Tradeoffs**:
- ✅ **Pro**: Predictable performance (P95 ≤ 800ms target)
- ✅ **Pro**: Simple validation (`endDate - startDate ≤ 56 days`)
- ❌ **Con**: Clients need to paginate if viewing \u003e8 weeks (rare use case)

---

### AD-006: Minimal Scaffolding Approach

**Decision**: Create **types, API handlers (stubs), and utility signatures** in scaffolding phase, but **leave business logic as TODOs** for implementation phase.

**Rationale**:
- **Clarity**: Team sees full API contract upfront
- **Parallelization**: Frontend can mock responses; backend can implement in parallel
- **Scope control**: Scaffolding = contracts; implementation = separate sprint

**Scaffolding Deliverables**:
```typescript
// Types (complete)
export interface CreateWeeklyRuleDTO { ... }

// API handler (stub)
export async function POST(req: Request) {
  // TODO: Implement validation
  //TODO: Implement authorization
  // TODO: Implement persistence
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}

// Utility (signature only)
export function generateSlots(...): Promise\u003cAvailableSlotDTO[]\u003e {
  // TODO: Implement algorithm from design.md
  throw new Error("Not implemented");
}
```

**Tradeoffs**:
- ✅ **Pro**: Clear contracts, enables parallel work
- ✅ **Pro**: Forces design decisions upfront
- ❌ **Con**: Cannot test/demo until implementation phase

---

## Data Model

**Status**: ✅ Database tables created in Supabase (2025-11-23)

### Entity Relationship Diagram

```
ContractorProfile (existing)
    ↓ (1:N)
ContractorWeeklyRule
    - dayOfWeek: 0-6
    - intervals: JSON
    - enabled: boolean

ContractorProfile
    ↓ (1:N)
ContractorAvailabilityException
    - date: DATE (unique per contractor)
    - intervals: JSON
    - type: AVAILABLE | BLOCKED
    - reason: text?

ContractorProfile
    ↓ (1:N)
ContractorAvailabilityBlock
    - startDateTime: timestamptz (UTC)
    - endDateTime: timestamptz (UTC)
    - reason: text?

ContractorServiceLocation (existing)
    - timezone: varchar (IANA, e.g., America/Mexico_City)
```

### Key Indices

```sql
-- Weekly rules: frequent query by contractor and day
CREATE INDEX idx_weekly_rules_contractor_day 
  ON contractor_weekly_rules(contractor_profile_id, day_of_week);

-- Exceptions: range queries by date
CREATE INDEX idx_exceptions_contractor_date 
  ON contractor_availability_exceptions(contractor_profile_id, date);

-- Blocks: range queries for overlap detection
CREATE INDEX idx_blocks_contractor_range 
  ON contractor_availability_blocks(contractor_profile_id, start_date_time, end_date_time);
```

---

## API Design

### Endpoint Structure

```
/api/contractors/me/availability/weekly         [POST, GET, PATCH /:id, DELETE /:id]
/api/contractors/me/availability/exceptions     [POST, GET, PATCH /:id, DELETE /:id]
/api/contractors/me/availability/blocks         [POST, GET, DELETE /:id]
/api/contractors/:id/availability/slots         [GET] (public read for clients)
```

### Authorization Matrix

| Endpoint | CONTRACTOR (owner) | CLIENT | ADMIN |
|----------|-------------------|--------|-------|
| POST /weekly | ✅ Write | ❌ | ❌ |
| GET /weekly | ✅ Read | ❌ | ✅ Read (audit) |
| GET /slots | ✅ Read | ✅ Read | ✅ Read |

### Example Request/Response

**POST /api/contractors/me/availability/weekly**

Request:
```json
{
  "dayOfWeek": 1,
  "intervals": [
    { "startTime": "09:00", "endTime": "12:00" },
    { "startTime": "14:00", "endTime": "18:00" }
  ]
}
```

Response (201):
```json
{
  "id": "uuid",
  "contractorProfileId": "uuid",
  "dayOfWeek": 1,
  "intervals": [...],
  "enabled": true,
  "createdAt": "2025-11-20T...",
  "updatedAt": "2025-11-20T..."
}
```

---

## Integration Points

### 1. Services Module

**Integration**: `Service.durationMinutes` must be compatible with generated slots.

**Flow**:
```
Client requests slots: GET /contractors/:id/availability/slots?serviceId=X
  → Fetch service.durationMinutes
  → Filter slots where slot.durationMinutes >= service.durationMinutes
```

**Contract**:
```typescript
interface Service {
  id: string;
  durationMinutes: number; // MUST be set
}
```

**Validation**: When creating weekly rule, optionally warn if any interval \u003c 30 min (likely too short for most services).

---

### 2. Booking/Reservation Module

**Integration**: Prevent double-booking and block conflicts with confirmed bookings.

**Flow A (Creating booking)**:
```
POST /api/bookings
  → Validate slot availability:
    isAvailable = await availabilityService.isSlotAvailable(contractorId, date, startTime, endTime)
  → If !isAvailable → 400 "Slot no longer available"
```

**Flow B (Creating block)**:
```
POST /api/contractors/me/availability/blocks
  → Check for confirmed bookings in range:
    bookings = await bookingService.getConfirmedBookings(contractorId, startDateTime, endDateTime)
  → If bookings.length \u003e 0 → 409 "Conflict with confirmed booking"
```

**Contract**:
```typescript
// In availabilityService
async isSlotAvailable(
  contractorId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise\u003cboolean\u003e

// In bookingService
async getConfirmedBookings(
  contractorId: string,
  startDateTime: Date,
  endDateTime: Date
): Promise\u003cBooking[]\u003e
```

---

### 3. Messaging Module (Future v2)

**Integration**: Send notifications when availability changes affect future bookings.

**Out of scope for v1**, but design should allow:
```
// Future hook
onAvailabilityChange(contractorId, affectedDates) {
  bookings = getBookingsInRange(contractorId, affectedDates)
  for booking in bookings:
    messagingService.notifyClient(booking.clientId, "Contractor updated availability")
}
```

---

## Performance Considerations

### Query Optimization

1. **Batch queries**: Fetch all rules/exceptions/blocks for 8-week range in 3 queries (not N queries per day)
2. **Indexed scans**: Ensure indices on `(contractorProfileId, dayOfWeek)` and `(contractorProfileId, date)` are used
3. **Limit range**: Enforce 8-week maximum to cap compute time

### Caching Strategy (Future v2)

```
Cache key: `availability:slots:${contractorId}:${startDate}:${endDate}:${serviceId}`
TTL: 5 minutes
Invalidation: On any rule/exception/block CRUD for that contractor
```

**Not implemented in v1** to avoid cache invalidation complexity.

---

## Security \u0026 Validation

### Input Validation (Zod)

```typescript
// Time format
z.string().regex(/^\\d{2}:\\d{2}$/)

// No overlapping intervals
.refine(intervals =\u003e !hasOverlaps(intervals))

// Date range
z.object({
  startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
}).refine(data =\u003e parseISO(data.endDate) \u003e= parseISO(data.startDate))
```

### Authorization

- **Ownership**: `requireRole('CONTRACTOR')` + verify `contractorProfile.userId === currentUser.id`
- **Admin audit**: `requireRole('ADMIN')` for read-only access to any contractor's availability
- **Public read**: Slots endpoint is public (clients need to see availability)

---

## Testing Strategy

### Unit Tests
- **Validators**: All Zod schemas with edge cases (TC-RF-CTR-AVAIL-002)
- **Interval utils**: Overlap detection, subtraction (TC-RF-CTR-AVAIL-012)
- **Timezone utils**: TZ ↔ UTC conversion, DST handling (TC-RF-CTR-AVAIL-014, 015)
- **Slot generator**: Algorithm logic with mocked data (TC-RF-CTR-AVAIL-010, 011, 012, 013)

### Integration Tests
- **API endpoints**: CRUD operations with auth/validation (TC-RF-CTR-AVAIL-001 through 020)
- **Concurrency**: Race conditions in block creation (TC-RNF-CTR-AVAIL-002)

### E2E Tests
- **Full flow**: Create rules → add exception → create block → verify slots (TC-E2E-AVAIL-001)
- **Accessibility**: Keyboard nav, ARIA, axe-core (TC-RNF-CTR-AVAIL-003, 004)
- **Responsive**: Mobile/tablet/desktop viewports (TC-RNF-CTR-AVAIL-005)

### Performance Tests (k6)
- **Load**: 100 VU requesting slots for 60s (TC-RNF-CTR-AVAIL-001)
- **Target**: P95 ≤ 800ms, P99 ≤ 1200ms, error rate \u003c 1%

---

## Deployment \u0026 Migration

### Database Migration

```sql
-- Step 1: Create new tables
CREATE TABLE contractor_weekly_rules (...);
CREATE TABLE contractor_availability_exceptions (...);
CREATE TABLE contractor_availability_blocks (...);

-- Step 2: Add relations to ContractorProfile (Prisma handles this)
-- Step 3: Create indices
CREATE INDEX ...;

-- Step 4: Verify with test data
```

**Rollback**: Drop tables (data loss acceptable as feature is new).

### Feature Flag (Optional)

```typescript
const AVAILABILITY_V2_ENABLED = process.env.FEATURE_AVAILABILITY_V2 === 'true';
```

Allow gradual rollout to contractors.

---

## Open Questions

1. **Granularity configuration**: Should contractors choose slot granularity (15/30/60 min)? 
   - **Decision for v1**: Document 30-min minimum in spec, defer configuration to v2
   
2. **Recurring holidays**: E.g., "Every Sept 16 is blocked"
   - **Decision**: Store as individual exceptions per year (simpler); recurring logic in v2

3. **Multi-service availability**: Different schedules per service type?
   - **Decision**: v1 is contractor-level; v2 can add service-specific overrides

---

## Success Metrics

### Technical
- ✅ P95 slot generation ≤ 800ms (k6 test)
- ✅ 0 concurrency bugs (manual testing + integration tests)
- ✅ Cobertura ≥ 70% (Jest)
- ✅ 0 accessibility violations (axe-core)

### UX
- Contractors can set up weekly schedule in \u003c 3 minutes
- Clients see accurate availability \u003c 1 second load time

### Business
- Reduce "slot not available" booking errors from ~10% to \u003c2% (via accurate slot generation)

---

## References

- [OpenSpec Spec: contractor-availability](/openspec/specs/contractor-availability/spec.md)
- [Existing Proposal](/openspec/changes/2025-11-20-contractor-availability/proposal.md)
- [Database Schema](/openspec/database-schema.md)
- [STP Test Plan](/docs/md/STP-ReparaYa.md)

---

**Version**: 1.0  
**Date**: 2025-11-22  
**Author**: Claude Code (AI Agent)
