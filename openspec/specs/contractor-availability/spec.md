# contractor-availability Specification

## Purpose

This module enables contractors to define and manage their work availability through a comprehensive scheduling system. Contractors can configure weekly recurring schedules, create exceptions for holidays and special dates, and block specific time slots manually for unforeseen circumstances. This is essential for enabling the booking system to validate available time slots, prevent double-booking, and provide clients with accurate availability information.

Without availability management, the marketplace cannot offer realistic scheduling options, contractors cannot control their workload, and the system risks accepting bookings that cannot be fulfilled.

## Scope

**In scope:**
- Weekly recurring schedule configuration (Monday-Sunday with multiple time intervals per day)
- Configurable time slot granularity (15/30/60 minute intervals) at system level
- Timezone handling: contractor timezone (IANA) with UTC normalization for storage
- Exception management: one-off closures and recurring holidays that override weekly rules
- Manual blockouts: ad-hoc time blocks for emergencies or personal time
- Availability slot generation engine: combines weekly rules + exceptions + blockouts to produce available slots
- Validation: prevent overlaps, ensure intervals are valid, verify compatibility with service durations
- CRUD APIs for rules, exceptions, and blockouts
- UI components for schedule management (calendar/weekly view with navigation)
- Permission controls: only CONTRACTOR owner can manage availability, ADMIN can read/audit
- Accessibility: keyboard navigation, ARIA labels, screen reader support
- Mobile-first responsive design

**Out of scope (future):**
- Integration with external calendars (Google Calendar, Outlook)
- Automatic availability adjustment based on historical booking patterns
- Team/employee scheduling (multiple people per contractor)
- Buffer time configuration between appointments
- Travel time calculation based on distance
- Availability quotas (max bookings per day/week)
- Client-facing availability widget (embedded in service pages)
- SMS/email reminders for upcoming blocked periods
- Batch operations (bulk create exceptions, import holidays)
- Reporting and analytics on availability utilization

---

## Functional Requirements

### Requirement: RF-CTR-AVAIL-001 - Configure weekly recurring schedule

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL allow contractors to define their standard weekly availability with multiple time intervals per day.

**Criteria:**
- Configure availability for each day of the week (Monday-Sunday)
- Support multiple time intervals per day (e.g., Monday 08:00-12:00 and 14:00-18:00)
- Time intervals stored in contractor's local timezone (IANA format, e.g., "America/Mexico_City")
- Validation: intervals must not overlap within the same day
- Validation: start time must be before end time
- Validation: intervals must align with system granularity (configurable: 15/30/60 minutes)
- Default state: no availability configured (contractor must explicitly set hours)

#### Scenario: Contractor creates weekly schedule

**GIVEN** an authenticated contractor
**WHEN** they submit POST `/api/contractors/me/availability/schedule` with:
```json
{
  "timezone": "America/Mexico_City",
  "weeklyRules": [
    {
      "dayOfWeek": "MONDAY",
      "intervals": [
        { "startTime": "08:00", "endTime": "12:00" },
        { "startTime": "14:00", "endTime": "18:00" }
      ]
    },
    {
      "dayOfWeek": "TUESDAY",
      "intervals": [
        { "startTime": "09:00", "endTime": "17:00" }
      ]
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "intervals": []
    }
  ]
}
```
**THEN** the system SHALL:
- Validate all intervals align with granularity (default: 30 min)
- Validate no overlaps within each day
- Store rules in `ContractorWeeklySchedule` table
- Return HTTP 201 with created schedule
- Store contractor timezone for future slot generation

#### Scenario: Reject overlapping intervals

**GIVEN** contractor attempts to create schedule
**WHEN** they provide overlapping intervals on same day:
```json
{
  "dayOfWeek": "MONDAY",
  "intervals": [
    { "startTime": "08:00", "endTime": "12:00" },
    { "startTime": "11:00", "endTime": "15:00" }
  ]
}
```
**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return error: "Overlapping intervals detected for MONDAY: 11:00 conflicts with existing 08:00-12:00"

#### Scenario: Reject invalid time intervals

**GIVEN** contractor attempts to create schedule
**WHEN** they provide invalid intervals:
- Start time after end time: `{ "startTime": "18:00", "endTime": "08:00" }`
- Intervals not aligned with granularity: `{ "startTime": "08:15", "endTime": "12:37" }` (with 30min granularity)

**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return specific validation errors

---

### Requirement: RF-CTR-AVAIL-002 - Create and manage exceptions (holidays/closures)

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL allow contractors to create exceptions that override weekly recurring schedules.

**Criteria:**
- Two types of exceptions:
  - **One-off closure**: Specific date (e.g., December 25, 2025)
  - **Recurring holiday**: Recurring date (e.g., every December 25)
- Exceptions can be:
  - Full-day closure (no availability)
  - Partial closure (custom intervals that override weekly rule for that day)
- Exceptions take precedence over weekly schedule
- Validation: exception date/intervals must be valid
- Contractors can edit/delete exceptions
- UI shows exception indicators on calendar view

#### Scenario: Create full-day closure exception

**GIVEN** contractor has weekly schedule (works Monday-Friday)
**WHEN** they submit POST `/api/contractors/me/availability/exceptions` with:
```json
{
  "type": "ONE_OFF",
  "date": "2025-12-25",
  "isFullDayClosure": true,
  "reason": "Navidad"
}
```
**THEN** the system SHALL:
- Create exception in `ContractorAvailabilityException` table
- Mark December 25, 2025 as fully unavailable
- Return HTTP 201 with created exception
- On slot generation, skip this date entirely

#### Scenario: Create recurring holiday

**GIVEN** contractor wants to block all September 16 (Mexican Independence Day)
**WHEN** they submit:
```json
{
  "type": "RECURRING",
  "recurringMonth": 9,
  "recurringDay": 16,
  "isFullDayClosure": true,
  "reason": "Día de la Independencia"
}
```
**THEN** the system SHALL:
- Create recurring exception
- Apply to all future September 16 dates
- Skip these dates during slot generation

#### Scenario: Create partial closure exception

**GIVEN** contractor works Monday 08:00-18:00 normally
**WHEN** they create one-off exception for specific Monday:
```json
{
  "type": "ONE_OFF",
  "date": "2025-11-24",
  "isFullDayClosure": false,
  "customIntervals": [
    { "startTime": "08:00", "endTime": "12:00" }
  ],
  "reason": "Cita médica por la tarde"
}
```
**THEN** the system SHALL:
- Override weekly rule for that specific day
- Generate slots only for 08:00-12:00 (not full 08:00-18:00)
- Return HTTP 201

---

### Requirement: RF-CTR-AVAIL-003 - Create manual blockouts (ad-hoc)

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL allow contractors to block specific time slots manually for unforeseen circumstances.

**Criteria:**
- Blockouts are one-time, date-specific time intervals
- Can block any time range (not limited to working hours)
- Optional reason field for contractor's records
- Validation: cannot block time slots with confirmed bookings
- Validation: start datetime must be in the future (at least 1 hour from now)
- Contractors can delete blockouts (if no booking exists in that slot)
- UI shows blockouts distinctly on calendar view

#### Scenario: Create valid blockout

**GIVEN** contractor needs to block specific afternoon
**WHEN** they submit POST `/api/contractors/me/availability/blockouts` with:
```json
{
  "date": "2025-11-28",
  "startTime": "14:00",
  "endTime": "16:00",
  "reason": "Emergencia familiar"
}
```
**AND** no confirmed booking exists in that time range
**THEN** the system SHALL:
- Create blockout in `ContractorAvailabilityBlockout` table
- Remove those time slots from available slots for November 28
- Return HTTP 201
- Prevent new bookings in that range

#### Scenario: Reject blockout overlapping confirmed booking

**GIVEN** contractor has confirmed booking on November 28, 14:00-15:00
**WHEN** they attempt to create blockout for 13:30-15:30
**THEN** the system SHALL reject with HTTP 409 Conflict
**AND** return error: "Cannot block time range 14:00-15:00: confirmed booking exists (ID: xyz)"

#### Scenario: Reject blockout in the past

**GIVEN** current time is November 28, 2025 at 15:00
**WHEN** contractor attempts to block November 28, 14:00-16:00
**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return error: "Blockout must be at least 1 hour in the future"

---

### Requirement: RF-CTR-AVAIL-004 - Generate available time slots (combination engine)

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL generate available time slots by combining weekly schedule, exceptions, blockouts, and existing bookings.

**Criteria:**
- Algorithm priority (highest to lowest):
  1. Confirmed bookings (always block)
  2. Manual blockouts (block)
  3. Exceptions (override weekly schedule)
  4. Weekly recurring schedule (baseline)
- Slots generated in contractor's timezone, then converted to UTC for storage/API responses
- Time slot granularity configurable (default: 30 minutes)
- Generate slots for configurable time range (default: next 8 weeks)
- Slots compatible with service durations (e.g., if service duration is 2 hours, generate 2-hour blocks)
- Performance: paginated generation, cache generated slots
- Return slots in ISO 8601 format with timezone info

#### Scenario: Generate slots for contractor with weekly schedule

**GIVEN** contractor has:
- Weekly schedule: Monday 08:00-12:00 and 14:00-18:00 (America/Mexico_City)
- No exceptions or blockouts
- Slot granularity: 30 minutes
- Service duration: 1 hour

**WHEN** system generates slots for next Monday (November 24, 2025)
**THEN** the system SHALL return slots:
```json
[
  { "startTime": "2025-11-24T08:00:00-06:00", "endTime": "2025-11-24T09:00:00-06:00", "startTimeUTC": "2025-11-24T14:00:00Z", "endTimeUTC": "2025-11-24T15:00:00Z" },
  { "startTime": "2025-11-24T08:30:00-06:00", "endTime": "2025-11-24T09:30:00-06:00", "startTimeUTC": "2025-11-24T14:30:00Z", "endTimeUTC": "2025-11-24T15:30:00Z" },
  { "startTime": "2025-11-24T09:00:00-06:00", "endTime": "2025-11-24T10:00:00-06:00", "startTimeUTC": "2025-11-24T15:00:00Z", "endTimeUTC": "2025-11-24T16:00:00Z" },
  // ... (continues for all 30-minute intervals within 08:00-12:00 and 14:00-18:00)
]
```

#### Scenario: Generate slots excluding exceptions and blockouts

**GIVEN** contractor has:
- Weekly schedule: Monday-Friday 09:00-17:00
- Exception: December 25, 2025 (full-day closure)
- Blockout: November 28, 14:00-16:00

**WHEN** system generates slots for week of November 24-28, 2025
**THEN** the system SHALL:
- Include normal slots for Nov 24, 25, 26, 27
- For Nov 28: include 09:00-14:00 slots, skip 14:00-16:00 (blockout), include 16:00-17:00 slots
- Skip December 25 entirely (exception)

#### Scenario: Generate slots excluding existing bookings

**GIVEN** contractor has:
- Weekly schedule: Monday 08:00-18:00
- Confirmed booking: November 24, 10:00-11:00

**WHEN** generating slots for November 24
**THEN** the system SHALL:
- Include all slots except 10:00-11:00 (and overlapping slots for services with duration > 1 hour)
- Exclude 09:00-10:00 slot if service duration is 2 hours (would overlap with booking)

---

### Requirement: RF-CTR-AVAIL-005 - Timezone normalization and UTC storage

**Priority:** HIGH
**Type:** Integration

The system SHALL handle timezone conversions correctly to support contractors in different timezones.

**Criteria:**
- Store contractor's timezone (IANA format) with schedule configuration
- Accept time intervals in contractor's local timezone (API requests)
- Convert to UTC before storing generated slots in database
- Return slots in both local timezone AND UTC in API responses
- Use `date-fns-tz` or similar library for timezone conversions
- Validate timezone is valid IANA timezone
- Default to ContractorServiceLocation.timezone if available

#### Scenario: Store weekly schedule with timezone

**GIVEN** contractor in Guadalajara (America/Mexico_City, UTC-6)
**WHEN** they configure Monday 08:00-12:00 availability
**THEN** the system SHALL:
- Store intervals as local time: 08:00-12:00
- Store timezone: "America/Mexico_City"
- When generating slots, convert to UTC: 14:00-18:00 UTC
- Return API responses with both formats

#### Scenario: Handle DST transitions

**GIVEN** contractor in timezone with DST (America/Mexico_City)
**WHEN** generating slots across DST transition dates
**THEN** the system SHALL:
- Apply correct UTC offset for each date
- Before DST: UTC-6
- After DST: UTC-5
- Ensure slot times remain consistent in local timezone

---

### Requirement: RF-CTR-AVAIL-006 - Permission controls

**Priority:** HIGH
**Type:** Security

The system SHALL enforce access controls for availability management.

**Criteria:**
- CONTRACTOR (owner) can: create, read, update, delete their own availability
- CONTRACTOR cannot: access other contractors' availability management
- ADMIN can: read any contractor's availability (audit), cannot modify
- CLIENT can: read available slots via booking API (public-facing, filtered view)
- All write operations validate ownership
- Repository layer enforces guards

#### Scenario: Owner manages their schedule

**GIVEN** authenticated contractor with ID "abc"
**WHEN** they call POST `/api/contractors/me/availability/schedule`
**THEN** the system SHALL:
- Verify user owns contractor profile
- Allow creation
- Return HTTP 201

#### Scenario: Block cross-contractor access

**GIVEN** authenticated contractor with ID "abc"
**WHEN** they attempt DELETE `/api/contractors/xyz/availability/blockouts/123`
**THEN** the system SHALL reject with HTTP 403 Forbidden
**AND** return error: "You can only manage your own availability"

#### Scenario: Admin can read availability

**GIVEN** authenticated user with role ADMIN
**WHEN** they call GET `/api/contractors/xyz/availability/schedule`
**THEN** the system SHALL:
- Allow read access
- Return full schedule data
- Log audit trail (future enhancement)

---

### Requirement: RF-CTR-AVAIL-007 - Validation of compatibility with service durations

**Priority:** MEDIUM
**Type:** Business Logic

The system SHALL validate that generated slots are compatible with service durations.

**Criteria:**
- Contractor services have `estimatedDurationMinutes` field
- Generated slots must accommodate longest service duration
- Validation: warn contractor if availability intervals are shorter than service durations
- Slot generation: filter out slots that cannot fit service duration
- UI: show warning if contractor configures 1-hour availability but offers 2-hour services

#### Scenario: Warn contractor about incompatible durations

**GIVEN** contractor has service with duration 120 minutes (2 hours)
**AND** contractor configures availability interval 08:00-09:00 (1 hour)
**WHEN** they save the schedule
**THEN** the system SHALL:
- Accept the schedule (allow partial availability)
- Return warning message: "Some services require 120 minutes but availability interval is only 60 minutes. Ensure sufficient time blocks."
- Generate slots: skip 08:00-09:00 for 2-hour services

#### Scenario: Generate slots compatible with service duration

**GIVEN** contractor offers services with durations: 60 min, 90 min, 120 min
**AND** contractor has availability Monday 08:00-12:00 (4 hours)
**WHEN** generating slots with 30-minute granularity
**THEN** the system SHALL:
- For 60-min services: generate slots 08:00-09:00, 08:30-09:30, ..., 11:00-12:00
- For 90-min services: generate slots 08:00-09:30, 08:30-10:00, ..., 10:30-12:00
- For 120-min services: generate slots 08:00-10:00, 08:30-10:30, ..., 10:00-12:00

---

## Non-Functional Requirements

### Requirement: RNF-CTR-AVAIL-001 - Slot generation performance

**Priority:** HIGH
**Type:** Performance

The system SHALL generate available slots efficiently to support real-time booking.

**Criteria:**
- P95 latency for slot generation API: <= 800 ms (for 8-week range)
- P99 latency: <= 1.2 seconds
- Caching strategy: cache generated slots for 1 hour (invalidate on schedule/exception/blockout/booking changes)
- Pagination: limit slot generation to configurable range (default: 8 weeks, max: 12 weeks)
- Database query optimization: indexed queries for bookings/blockouts/exceptions
- Background job: pre-generate slots nightly for active contractors

**Test:** k6 load test with 100 concurrent requests for slot generation, measure P95/P99 latencies.

---

### Requirement: RNF-CTR-AVAIL-002 - Data consistency and race conditions

**Priority:** HIGH
**Type:** Reliability

The system SHALL prevent race conditions when creating bookings against availability.

**Criteria:**
- Atomic booking creation: check availability + create booking in transaction
- Database-level constraints: unique constraint on (serviceId, date, startTime) for generated slots (future)
- Optimistic locking: use row versioning for high-concurrency scenarios
- Booking validation: re-check availability after acquiring lock
- Rollback on conflict: return HTTP 409 Conflict if slot taken between check and creation

**Test:** Simulate 10 concurrent booking requests for same slot, verify only 1 succeeds.

---

### Requirement: RNF-CTR-AVAIL-003 - Accessibility (A11y)

**Priority:** HIGH
**Type:** Accessibility

The system SHALL provide accessible UI for availability management.

**Criteria:**
- WCAG 2.1 AA compliance
- Keyboard navigation: Tab, Shift+Tab, Arrow keys for calendar navigation
- ARIA roles: `role="grid"` for calendar, `role="gridcell"` for date cells
- ARIA labels: descriptive labels for all interactive elements
- Screen reader announcements: announce selected dates, time intervals, validation errors
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Focus indicators: visible 2px outline on focused elements
- Skip links: allow keyboard users to skip repetitive navigation

**Test:** Automated a11y scan with axe-core, manual testing with screen reader (NVDA/JAWS).

---

### Requirement: RNF-CTR-AVAIL-004 - Mobile-first responsive design

**Priority:** HIGH
**Type:** UX

The system SHALL provide optimal UX on mobile devices.

**Criteria:**
- Mobile-first design: optimize for 375px viewport width (iPhone SE)
- Touch-friendly targets: minimum 44x44px tap targets
- Responsive breakpoints: 640px (sm), 768px (md), 1024px (lg)
- Calendar view: switch from week view (desktop) to day view (mobile)
- Time pickers: native mobile time pickers (`<input type="time">`) on mobile
- Performance: minimize JS bundle size, lazy-load calendar components

**Test:** Manual testing on iOS Safari, Android Chrome; automated responsive testing with Playwright.

---

## Data Model

### ContractorWeeklySchedule

**Table:** `ContractorWeeklySchedule`
**Relationship:** 1:1 with `ContractorProfile` (one schedule per contractor)

**Schema:**

```prisma
model ContractorWeeklySchedule {
  id                  String            @id @default(uuid())
  contractorProfileId String            @unique
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  // Timezone del contratista (IANA format)
  timezone String @db.VarChar(50) // e.g., "America/Mexico_City"

  // Configuración de granularidad (minutos)
  slotGranularityMinutes Int @default(30) // 15, 30, 60

  // Reglas semanales (JSON con estructura: { dayOfWeek: string, intervals: Array<{startTime, endTime}> })
  weeklyRules Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contractorProfileId])
}
```

**weeklyRules JSON Structure:**
```typescript
type WeeklyRules = Array<{
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  intervals: Array<{
    startTime: string; // HH:mm format (e.g., "08:00")
    endTime: string;   // HH:mm format (e.g., "12:00")
  }>;
}>;
```

**Example:**
```json
[
  {
    "dayOfWeek": "MONDAY",
    "intervals": [
      { "startTime": "08:00", "endTime": "12:00" },
      { "startTime": "14:00", "endTime": "18:00" }
    ]
  },
  {
    "dayOfWeek": "TUESDAY",
    "intervals": [
      { "startTime": "09:00", "endTime": "17:00" }
    ]
  },
  {
    "dayOfWeek": "WEDNESDAY",
    "intervals": []
  }
]
```

---

### ContractorAvailabilityException

**Table:** `ContractorAvailabilityException`
**Relationship:** N:1 with `ContractorProfile` (many exceptions per contractor)

**Schema:**

```prisma
model ContractorAvailabilityException {
  id                  String            @id @default(uuid())
  contractorProfileId String
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  // Tipo de excepción
  type ExceptionType // ONE_OFF | RECURRING

  // Para ONE_OFF
  date DateTime? @db.Date // e.g., 2025-12-25 (nullable para RECURRING)

  // Para RECURRING
  recurringMonth Int? // 1-12 (nullable para ONE_OFF)
  recurringDay   Int? // 1-31 (nullable para ONE_OFF)

  // Cierre completo o parcial
  isFullDayClosure Boolean @default(true)

  // Intervalos personalizados si no es cierre completo
  customIntervals Json? // Array<{ startTime: string, endTime: string }>

  // Razón opcional
  reason String? @db.VarChar(200)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contractorProfileId, type])
  @@index([contractorProfileId, date])
  @@index([contractorProfileId, recurringMonth, recurringDay])
}

enum ExceptionType {
  ONE_OFF
  RECURRING
}
```

**Constraints:**
- If `type = ONE_OFF`: `date` must be NOT NULL, `recurringMonth` and `recurringDay` must be NULL
- If `type = RECURRING`: `recurringMonth` and `recurringDay` must be NOT NULL, `date` must be NULL
- If `isFullDayClosure = false`: `customIntervals` must be NOT NULL

---

### ContractorAvailabilityBlockout

**Table:** `ContractorAvailabilityBlockout`
**Relationship:** N:1 with `ContractorProfile` (many blockouts per contractor)

**Schema:**

```prisma
model ContractorAvailabilityBlockout {
  id                  String            @id @default(uuid())
  contractorProfileId String
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  // Fecha y hora del bloqueo
  date      DateTime @db.Date
  startTime String   @db.VarChar(5) // HH:mm format
  endTime   String   @db.VarChar(5) // HH:mm format

  // Razón opcional
  reason String? @db.VarChar(200)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contractorProfileId, date])
  @@index([contractorProfileId, date, startTime, endTime])
}
```

**Constraints:**
- `startTime` must be before `endTime`
- `date` must be in the future (validated at application level)
- Cannot overlap with confirmed bookings (validated at application level)

---

### Integration with Existing Models

**Updates to ContractorProfile:**
```prisma
model ContractorProfile {
  // ... existing fields ...
  weeklySchedule         ContractorWeeklySchedule?
  availabilityExceptions ContractorAvailabilityException[]
  availabilityBlockouts  ContractorAvailabilityBlockout[]
}
```

**No changes to Availability model:**
The existing `Availability` model (linked to Service and Booking) remains unchanged. It represents **generated slots** that clients can book. The new availability management system is responsible for **creating** those slots based on contractor's schedule configuration.

---

## API Contracts

### POST /api/contractors/me/availability/schedule

**Description:** Create or update weekly recurring schedule.

**Authorization:** Authenticated contractor (owner only)

**Request:**
```typescript
{
  timezone: string;                // IANA timezone, e.g., "America/Mexico_City"
  slotGranularityMinutes?: number; // 15 | 30 | 60 (default: 30)
  weeklyRules: Array<{
    dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    intervals: Array<{
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
    }>;
  }>;
}
```

**Response 201 Created:**
```typescript
{
  id: string;
  contractorProfileId: string;
  timezone: string;
  slotGranularityMinutes: number;
  weeklyRules: Array<{ dayOfWeek: string; intervals: Array<{ startTime: string; endTime: string }> }>;
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

**Error Responses:**
- 400 Bad Request: Invalid input (overlapping intervals, invalid timezone, invalid time format)
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 409 Conflict: Schedule already exists (use PATCH to update)

---

### PATCH /api/contractors/me/availability/schedule

**Description:** Update existing weekly schedule.

**Authorization:** Authenticated contractor (owner only)

**Request:**
```typescript
{
  timezone?: string;
  slotGranularityMinutes?: number;
  weeklyRules?: Array<{
    dayOfWeek: string;
    intervals: Array<{ startTime: string; endTime: string }>;
  }>;
}
```

**Response 200 OK:** Same as POST response

**Error Responses:**
- 400 Bad Request: Invalid input
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 404 Not Found: Schedule not found

---

### GET /api/contractors/me/availability/schedule

**Description:** Retrieve contractor's weekly schedule.

**Authorization:** Authenticated contractor (owner) OR admin

**Response 200 OK:** Same structure as POST response

**Error Responses:**
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner or admin
- 404 Not Found: Schedule not found

---

### POST /api/contractors/me/availability/exceptions

**Description:** Create availability exception (holiday/closure).

**Authorization:** Authenticated contractor (owner only)

**Request:**
```typescript
{
  type: "ONE_OFF" | "RECURRING";
  date?: string;              // ISO 8601 date, required if type=ONE_OFF
  recurringMonth?: number;    // 1-12, required if type=RECURRING
  recurringDay?: number;      // 1-31, required if type=RECURRING
  isFullDayClosure: boolean;
  customIntervals?: Array<{   // required if isFullDayClosure=false
    startTime: string;        // HH:mm
    endTime: string;
  }>;
  reason?: string;
}
```

**Response 201 Created:**
```typescript
{
  id: string;
  contractorProfileId: string;
  type: "ONE_OFF" | "RECURRING";
  date: string | null;
  recurringMonth: number | null;
  recurringDay: number | null;
  isFullDayClosure: boolean;
  customIntervals: Array<{ startTime: string; endTime: string }> | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- 400 Bad Request: Invalid input (missing required fields based on type)
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner

---

### GET /api/contractors/me/availability/exceptions

**Description:** List all exceptions for contractor.

**Authorization:** Authenticated contractor (owner) OR admin

**Query Parameters:**
- `type`: Filter by ONE_OFF or RECURRING
- `startDate`: Filter exceptions from this date (for ONE_OFF)
- `endDate`: Filter exceptions up to this date (for ONE_OFF)

**Response 200 OK:**
```typescript
{
  exceptions: Array<{
    id: string;
    type: string;
    date: string | null;
    recurringMonth: number | null;
    recurringDay: number | null;
    isFullDayClosure: boolean;
    customIntervals: Array<{ startTime: string; endTime: string }> | null;
    reason: string | null;
    createdAt: string;
  }>;
  total: number;
}
```

---

### DELETE /api/contractors/me/availability/exceptions/[id]

**Description:** Delete an exception.

**Authorization:** Authenticated contractor (owner only)

**Response 204 No Content**

**Error Responses:**
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 404 Not Found: Exception not found

---

### POST /api/contractors/me/availability/blockouts

**Description:** Create manual blockout.

**Authorization:** Authenticated contractor (owner only)

**Request:**
```typescript
{
  date: string;       // ISO 8601 date
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
}
```

**Response 201 Created:**
```typescript
{
  id: string;
  contractorProfileId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- 400 Bad Request: Invalid input (past date, invalid time)
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 409 Conflict: Confirmed booking exists in this time range

---

### GET /api/contractors/me/availability/blockouts

**Description:** List all blockouts for contractor.

**Authorization:** Authenticated contractor (owner) OR admin

**Query Parameters:**
- `startDate`: Filter from this date
- `endDate`: Filter up to this date

**Response 200 OK:**
```typescript
{
  blockouts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string | null;
    createdAt: string;
  }>;
  total: number;
}
```

---

### DELETE /api/contractors/me/availability/blockouts/[id]

**Description:** Delete a blockout.

**Authorization:** Authenticated contractor (owner only)

**Response 204 No Content**

**Error Responses:**
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 404 Not Found: Blockout not found

---

### GET /api/contractors/me/availability/slots

**Description:** Generate available time slots based on schedule, exceptions, blockouts, and bookings.

**Authorization:** Authenticated contractor (owner) OR admin OR public (for booking flow)

**Query Parameters:**
- `startDate`: Start date for slot generation (ISO 8601, default: today)
- `endDate`: End date for slot generation (ISO 8601, default: startDate + 8 weeks, max: 12 weeks)
- `serviceDurationMinutes`: Filter slots compatible with this service duration (optional)
- `serviceId`: Specific service ID (fetches duration automatically, optional)

**Response 200 OK:**
```typescript
{
  slots: Array<{
    date: string;             // ISO 8601 date
    startTime: string;        // HH:mm in contractor timezone
    endTime: string;          // HH:mm in contractor timezone
    startTimeUTC: string;     // ISO 8601 UTC
    endTimeUTC: string;       // ISO 8601 UTC
    durationMinutes: number;
  }>;
  timezone: string;           // Contractor timezone
  total: number;
  generatedAt: string;        // ISO 8601 (for caching)
}
```

**Error Responses:**
- 400 Bad Request: Invalid date range (exceeds 12 weeks)
- 404 Not Found: Schedule not configured

---

## Validation Rules

### Zod Schemas

**CreateScheduleInput:**
```typescript
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const dayOfWeekEnum = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

export const timeIntervalSchema = z.object({
  startTime: z.string().regex(timeRegex, "Time must be in HH:mm format"),
  endTime: z.string().regex(timeRegex, "Time must be in HH:mm format"),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "Start time must be before end time" }
);

export const weeklyRuleSchema = z.object({
  dayOfWeek: dayOfWeekEnum,
  intervals: z.array(timeIntervalSchema),
});

export const createScheduleSchema = z.object({
  timezone: z.string().min(1).max(50), // TODO: validate IANA timezone
  slotGranularityMinutes: z.enum([15, 30, 60]).optional().default(30),
  weeklyRules: z.array(weeklyRuleSchema),
}).refine(
  (data) => {
    // Validate no overlapping intervals within same day
    for (const rule of data.weeklyRules) {
      const sortedIntervals = rule.intervals.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sortedIntervals.length - 1; i++) {
        if (sortedIntervals[i].endTime > sortedIntervals[i + 1].startTime) {
          return false; // Overlap detected
        }
      }
    }
    return true;
  },
  { message: "Overlapping intervals detected within the same day" }
);

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = Partial<CreateScheduleInput>;
```

**CreateExceptionInput:**
```typescript
export const createExceptionSchema = z.object({
  type: z.enum(["ONE_OFF", "RECURRING"]),
  date: z.string().date().optional(),         // ISO 8601 date
  recurringMonth: z.number().int().min(1).max(12).optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  isFullDayClosure: z.boolean(),
  customIntervals: z.array(timeIntervalSchema).optional(),
  reason: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.type === "ONE_OFF") {
      return !!data.date && !data.recurringMonth && !data.recurringDay;
    } else { // RECURRING
      return !data.date && !!data.recurringMonth && !!data.recurringDay;
    }
  },
  { message: "Invalid exception configuration based on type" }
).refine(
  (data) => {
    if (!data.isFullDayClosure) {
      return data.customIntervals && data.customIntervals.length > 0;
    }
    return true;
  },
  { message: "Custom intervals required when isFullDayClosure is false" }
);

export type CreateExceptionInput = z.infer<typeof createExceptionSchema>;
```

**CreateBlockoutInput:**
```typescript
export const createBlockoutSchema = z.object({
  date: z.string().date(),                    // ISO 8601 date
  startTime: z.string().regex(timeRegex, "Time must be in HH:mm format"),
  endTime: z.string().regex(timeRegex, "Time must be in HH:mm format"),
  reason: z.string().max(200).optional(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "Start time must be before end time" }
);

export type CreateBlockoutInput = z.infer<typeof createBlockoutSchema>;
```

---

## Security Considerations

### Authorization

**Ownership Checks:**
- All write operations (POST/PATCH/DELETE) verify `userId` matches `contractorProfile.userId` OR user is admin
- Read operations allow owner + admin access
- Public read access for generated slots (booking flow)

**Repository Layer Guards:**
```typescript
async function verifyOwnership(contractorProfileId: string, userId: string, userRole: string): Promise<void> {
  if (userRole === "ADMIN") return;

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorProfileId },
    select: { userId: true }
  });

  if (!profile || profile.userId !== userId) {
    throw new ForbiddenError("You can only manage your own availability");
  }
}
```

### Data Validation

- All time inputs validated via Zod schemas
- Timezone validation: verify IANA timezone exists (use `Intl.supportedValuesOf('timeZone')`)
- Date validation: future dates only for blockouts
- Overlap detection: prevent double-booking via application logic + database queries

### Input Sanitization

- All string inputs trimmed and validated via Zod
- SQL injection prevented by Prisma parameterized queries
- XSS prevention: No HTML rendering of user inputs (plain text only)

---

## Testing Plan

### Test Cases

The following test cases are documented in `/docs/md/STP-ReparaYa.md`:

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-CTR-AVAIL-001 | Create weekly schedule with valid intervals | Integration | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-002 | Reject overlapping intervals within same day | Unit | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-003 | Reject invalid time formats and ranges | Unit | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-004 | Create one-off full-day closure exception | Integration | Alta | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-005 | Create recurring holiday exception | Integration | Alta | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-006 | Create partial closure exception | Integration | Media | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-007 | Create manual blockout successfully | Integration | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-008 | Reject blockout overlapping confirmed booking | Integration | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-009 | Reject blockout in the past | Unit | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-010 | Generate slots from weekly schedule | Unit | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-011 | Generate slots excluding exceptions | Integration | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-012 | Generate slots excluding blockouts | Integration | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-013 | Generate slots excluding existing bookings | Integration | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-014 | Convert local timezone to UTC correctly | Unit | Alta | RF-CTR-AVAIL-005 |
| TC-RF-CTR-AVAIL-015 | Handle DST transitions correctly | Unit | Media | RF-CTR-AVAIL-005 |
| TC-RF-CTR-AVAIL-016 | Verify ownership - owner can manage availability | Integration | Alta | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-017 | Block cross-contractor access | Integration | Alta | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-018 | Admin can read any contractor availability | Integration | Media | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-019 | Validate slot compatibility with service durations | Unit | Media | RF-CTR-AVAIL-007 |
| TC-RF-CTR-AVAIL-020 | Warn contractor about incompatible durations | Integration | Baja | RF-CTR-AVAIL-007 |
| TC-RNF-CTR-AVAIL-001 | Performance - slot generation P95 <= 800ms | Performance | Alta | RNF-CTR-AVAIL-001 |
| TC-RNF-CTR-AVAIL-002 | Prevent race condition on concurrent bookings | Integration | Alta | RNF-CTR-AVAIL-002 |
| TC-RNF-CTR-AVAIL-003 | A11y - keyboard navigation in calendar UI | E2E | Alta | RNF-CTR-AVAIL-003 |
| TC-RNF-CTR-AVAIL-004 | A11y - ARIA labels and screen reader support | E2E | Alta | RNF-CTR-AVAIL-003 |
| TC-RNF-CTR-AVAIL-005 | Mobile responsive - calendar view on 375px viewport | E2E | Media | RNF-CTR-AVAIL-004 |

### Acceptance Criteria

**Code:**
- Migration applied successfully (ContractorWeeklySchedule, ContractorAvailabilityException, ContractorAvailabilityBlockout tables created)
- Service layer implements slot generation algorithm correctly
- API routes implement authorization checks
- Zod validators cover all edge cases
- Timezone conversion library integrated (date-fns-tz)

**Testing:**
- Cobertura >= 70% in `src/modules/contractors/availability/`
- All 25 test cases pass (TC-RF-CTR-AVAIL-001 to TC-RNF-CTR-AVAIL-005)
- Integration tests validate authorization and persistence
- E2E test of availability management flow passes
- Performance: P95 <= 800ms for slot generation (k6 test)
- A11y: axe-core scan passes with 0 violations

**Documentation:**
- This spec complete and approved
- STP updated with test cases
- `openspec/project.md` references this module

**UI/UX:**
- Mobile-first calendar component implemented
- Loading/error/empty states handled gracefully
- Validation errors displayed accessibly
- Responsive design tested on mobile/tablet/desktop

---

## Integration Points

### ContractorServiceLocation Module

**Dependency:** Contractor timezone
**Usage:** Default to `ContractorServiceLocation.timezone` if available when creating schedule

**Integration:**
```typescript
async function createSchedule(contractorProfileId: string, input: CreateScheduleInput) {
  let timezone = input.timezone;

  // Fallback to location timezone if not provided
  if (!timezone) {
    const location = await prisma.contractorServiceLocation.findUnique({
      where: { contractorProfileId },
      select: { timezone: true }
    });
    timezone = location?.timezone || "America/Mexico_City"; // Default fallback
  }

  // ... create schedule
}
```

---

### Booking Module

**Dependency:** Available slots
**Usage:** Booking creation validates against available slots generated by this module

**Integration:**
```typescript
// In booking creation flow
const availableSlots = await availabilityService.generateSlots({
  contractorProfileId,
  startDate: bookingDate,
  endDate: bookingDate,
  serviceDurationMinutes: service.estimatedDurationMinutes
});

const isSlotAvailable = availableSlots.some(slot =>
  slot.startTime === requestedStartTime && slot.endTime === requestedEndTime
);

if (!isSlotAvailable) {
  throw new BookingValidationError("Requested time slot is not available");
}
```

---

### Service Module

**Dependency:** Service duration
**Usage:** Filter generated slots to match service duration requirements

**Integration:**
```typescript
// Service model adds estimatedDurationMinutes field (future migration)
model Service {
  // ... existing fields ...
  estimatedDurationMinutes Int @default(60) // Default 1 hour
}
```

---

## UI/UX Components

### Components to Create

**1. AvailabilityManagerPage.tsx**
- Container page for `/contractors/availability`
- Tabs: "Weekly Schedule" | "Exceptions" | "Blockouts"
- State management for active tab

**2. WeeklyScheduleEditor.tsx**
- Form to configure weekly recurring schedule
- Day-of-week selector with checkboxes
- Time range inputs per day (add/remove multiple intervals)
- Timezone selector dropdown
- Granularity selector (15/30/60 min)
- Preview of configured schedule

**3. ExceptionManager.tsx**
- List view of existing exceptions
- Add exception button → modal
- Filter by type (ONE_OFF / RECURRING)
- Calendar view with exception indicators

**4. ExceptionFormModal.tsx**
- Modal form for creating exception
- Type selector: One-off / Recurring
- Date picker (for one-off) or month/day selectors (for recurring)
- Full-day closure checkbox
- Custom intervals editor (if partial closure)
- Reason text input

**5. BlockoutManager.tsx**
- List view of existing blockouts
- Add blockout button → modal
- Calendar view with blockout indicators
- Filter by date range

**6. BlockoutFormModal.tsx**
- Modal form for creating blockout
- Date picker
- Time range inputs (start/end time)
- Reason text input
- Validation warning if overlaps with booking

**7. AvailabilityCalendar.tsx**
- Calendar grid component (month/week view)
- Visual indicators: available (green), blocked (red), exception (yellow), booked (blue)
- Click date to add exception/blockout
- Navigation: prev/next month/week
- Responsive: week view on desktop, day view on mobile

**8. TimeRangeInput.tsx**
- Reusable component for time range selection
- Start time input + End time input
- Validation indicator
- Remove button (for multiple intervals)

**9. DayScheduleConfigurator.tsx**
- Component for configuring single day schedule
- Day label (e.g., "Monday")
- Enable/disable toggle
- Multiple time range inputs
- Add interval button

---

## Future Enhancements

### External Calendar Integration

**Goal:** Sync availability with Google Calendar, Outlook, etc.

**Implementation:**
- OAuth2 integration for Google/Microsoft APIs
- Two-way sync: ReparaYa → Calendar (create blocks), Calendar → ReparaYa (import busy slots)
- Conflict resolution: manual override settings
- Privacy: only sync "busy" status, not details

---

### Automatic Availability Adjustment

**Goal:** Suggest optimal availability based on historical booking patterns.

**Implementation:**
- Analytics: track booking frequency by day/time
- ML model: predict high-demand time slots
- Recommendations: suggest expanding availability during high-demand periods
- A/B testing: test different availability configurations

---

### Team Scheduling

**Goal:** Support contractors with multiple employees/technicians.

**Implementation:**
- Add `ContractorTeamMember` model
- Assign availability to specific team members
- Booking flow: select preferred team member or auto-assign
- Dashboard: view team availability heatmap

---

### Buffer Time and Travel Time

**Goal:** Add configurable buffer between appointments and travel time based on distance.

**Implementation:**
- Buffer time: configurable minutes between bookings (e.g., 15 min cleanup time)
- Travel time: calculate based on previous booking location using AWS Location Service Route Calculator
- Dynamic slot generation: adjust available slots based on buffer + travel time

---

## Change History

| Date | Author | Change |
|------|--------|--------|
| 2025-11-20 | Claude Code | Initial spec created for contractor availability management feature |
