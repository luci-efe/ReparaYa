# slot-generation Specification

## Purpose
TBD - created by archiving change 2025-11-20-contractor-availability. Update Purpose after archive.
## Requirements
### Requirement: Combine Layers into Available Slots

The slot generation engine merges weekly rules, exceptions, and blocks to produce final available time slots.

#### Scenario: Generate slots from weekly rule only

**Given** contractor has weekly rule: Monday 09:00-17:00  
**And** no exceptions or blocks for the requested range  
**And** no confirmed bookings  
**When** client requests slots for Dec 1-7, 2025 (contains Mon Dec 1)  
**Then** response includes slot for Monday Dec 1: `09:00-17:00` in contractor's timezone  
**And** other days (Tue-Sun) have no slots (no rules defined)

**Acceptance Criteria**:
- Algorithm iterates each day in `[startDate, endDate]`
- For each day, retrieves `dayOfWeek` (0-6)
- Looks up weekly rule for that `dayOfWeek`
- If rule exists and `enabled=true`, uses rule's intervals

---

#### Scenario: Exception overrides weekly rule

**Given** contractor has:  
  - Weekly rule: Mondays 09:00-17:00  
  - Exception for Mon Dec 25: type=AVAILABLE, intervals=[10:00-14:00]  
**When** client requests slots for Dec 18-31  
**Then** slots for Mon Dec 18 and Dec 22 use weekly rule (09:00-17:00)  
**And** slot for Mon Dec 25 uses exception (10:00-14:00)

**Algorithm Priority**:
```
1. Check for exception on exact date
2. If exception.type = BLOCKED → skip day (no slots)
3. If exception.type = AVAILABLE → use exception.intervals
4. Else use weekly rule for dayOfWeek (if exists)
```

---

#### Scenario: Block subtracts from available intervals

**Given** contractor has:  
  - Weekly rule: Monday 09:00-17:00  
  - Block: Dec 1, 12:00-14:00 (lunch break)  
**When** generating slots for Monday Dec 1  
**Then** base intervals: [09:00-17:00]  
**After subtracting block**: [09:00-12:00, 14:00-17:00]  
**And** response returns 2 slots for that day

**Algorithm**:
```
FOR each block intersecting current day:
  FOR each interval in day's intervals:
    intervals = subtractInterval(interval, block's time range)
```

---

#### Scenario: Confirmed booking subtracts from slots

**Given** contractor has:  
  - Weekly rule: Monday 09:00-17:00  
  - Confirmed booking: Dec 1, 10:00-11:00  
**When** generating slots for Dec 1  
**Then** base: [09:00-17:00]  
**After subtracting booking**: [09:00-10:00, 11:00-17:00]

**Acceptance Criteria**:
- Only bookings with status=`CONFIRMED` are subtracted
- `PENDING_PAYMENT`, `CANCELLED` bookings are ignored
- Uses UTC comparison for overlap detection

---

#### Scenario: Filter slots by service duration

**Given** contractor has available slot: Monday 09:00-10:00 (60 min)  
**And** service X requires `durationMinutes: 90`  
**When** client requests slots with `serviceId=X`  
**Then** 60-min slot is excluded (too short)  
**And** only slots \u003e= 90 min are returned

**Acceptance Criteria**:
- `serviceId` query param is optional
- If provided, fetches `service.durationMinutes`
- Filters slots where `slot.durationMinutes \u003c service.durationMinutes`
- If omitted, returns all slots

---

### Requirement: Performance and Range Limits

Slot generation must be fast and prevent abuse.

#### Scenario: Enforce 8-week maximum range

**Given** client requests slots with `startDate=2025-01-01`, `endDate=2025-03-01` (9 weeks)  
**Then** API returns 400 Bad Request  
**And** error message: "Rango máximo permitido: 8 semanas (56 días)"

**Acceptance Criteria**:
- Validation: `(endDate - startDate).days \u003c= 56`
- Runs before any DB queries (fast fail)

---

#### Scenario: Performance target P95 ≤ 800ms

**Given** k6 performance test with:  
  - 100 VU (virtual users)  
  - 60s duration  
  - Requesting 8-week slots from 100 contractors  
  - Each contractor has: 7 weekly rules, 10 exceptions, 5 blocks, 20 bookings  
**Then** P95 response time ≤ 800ms  
**And** P99 response time ≤ 1200ms  
**And** error rate \u003c 1%

**Optimization Strategies**:
- Batch DB queries: fetch all rules/exceptions/blocks in 3 queries (not N)
- Use Prisma `include` to fetch bookings with contractor in single query
- Index on `(contractorProfileId, dayOfWeek)` and `(contractorProfileId, date)`
- Avoid N+1 queries

---

### Requirement: Timezone Normalization in Slot Output

Slots are returned in contractor's local timezone.

#### Scenario: Return slots in contractor timezone

**Given** contractor's timezone is `America/Mexico_City`  
**And** generated slot in UTC: `2025-12-01T15:00:00Z` to `2025-12-01T23:00:00Z`  
**When** converting to contractor's local timezone (UTC-6)  
**Then** output slot: `{ date: "2025-12-01", startTime: "09:00", endTime: "17:00", timezone: "America/Mexico_City" }`

**Acceptance Criteria**:
- All slot times are in contractor's local TZ
- `timezone` field explicitly states IANA timezone
- Frontend/client knows to interpret times in that timezone

---

### Requirement: Public Read Access for Clients

Clients need to view contractor availability without authentication.

#### Scenario: Client views contractor's available slots

**Given** unauthenticated client (or CLIENT role user)  
**When** client requests `GET /api/contractors/:contractorId/availability/slots?startDate=2025-12-01\u0026endDate=2025-12-31`  
**Then** request succeeds (no auth required)  
**And** slots are returned

**Acceptance Criteria**:
- Endpoint is **public** (no `requireRole` middleware)
- Clients can filter by `serviceId` to see compatible slots
- Weekly rules/exceptions/blocks are not exposed (only final slots)

---

