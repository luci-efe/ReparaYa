# exceptions Specification

## Purpose
TBD - created by archiving change 2025-11-20-contractor-availability. Update Purpose after archive.
## Requirements
### Requirement: Date-Specific Exceptions

The system SHALL allow contractors to override weekly rules for specific dates (holidays, special events, one-time closures).

#### Scenario: Create available exception (override weekly rule)

**Given** contractor has weekly rule: Mondays 09:00-17:00  
**And** contractor wants to work different hours on Monday Dec 25  
**When** contractor creates exception for `2025-12-25` with intervals `[{10:00-14:00}]` and type `AVAILABLE`  
**Then** exception is created successfully  
**And** on Dec 25, slot generation uses `[{10:00-14:00}]` instead of weekly rule  
**And** on all other Mondays, weekly rule still applies

**Acceptance Criteria**:
- Date format: YYYY-MM-DD
- Exception type: `AVAILABLE` (overrides rule with new intervals)
- Intervals follow same validation as weekly rules (no overlaps, startTime \u003c endTime)
- Optional `reason` field for documentation (e.g., "Holiday hours")

---

#### Scenario: Create blocked exception (close for entire day)

**Given** contractor wants to be unavailable on Sept 16 (Independence Day)  
**When** contractor creates exception for `2025-09-16` with type `BLOCKED` and empty intervals `[]`  
**Then** exception is created with reason "Día de la Independencia"  
**And** on Sept 16, NO slots are generated (day completely blocked)  
**And** weekly rule for that day is ignored

---

#### Scenario: Exception uniqueness per date

**Given** contractor already has exception for Dec 25  
**When** contractor attempts to create another exception for Dec 25  
**Then** request fails with 409 Conflict  
**And** error message: "Ya existe una excepción para esta fecha"

**Alternative**: Allow update via PATCH (replace existing exception)

---

#### Scenario: Recurring holidays (future v2)

**Given** contractor wants to block every December 25 without creating exceptions yearly  
**Then** v1 does not support this  
**And** contractor must create exception for each year manually  
**And** spec documents this as future enhancement

---

### Requirement: Exception Date Ranges and Filtering

API supports filtering exceptions by date range for efficient queries.

#### Scenario: List exceptions for date range

**Given** contractor has 10 exceptions spread across 2025  
**When** client requests `GET /api/contractors/me/availability/exceptions?startDate=2025-12-01\u0026endDate=2026-01-31`  
**Then** only exceptions within [Dec 1 - Jan 31] are returned  
**And** response is ordered by date ASC  

**Acceptance Criteria**:
- Both `startDate` and `endDate` are optional query params
- If omitted, returns all exceptions (with reasonable pagination limit, e.g., 100)
- Date filtering uses SQL `WHERE date BETWEEN start AND end`

---

### Requirement: Timezone Handling for Exceptions

Exceptions are date-specific and use contractor's local timezone for interpretation.

#### Scenario: Exception date is in contractor's local timezone

**Given** contractor's timezone is `America/Mexico_City`  
**When** contractor creates exception for `2025-12-25`  
**Then** "Dec 25" is interpreted as Dec 25 in Mexico City time  
**And** slot generation compares exception date in contractor's timezone  
**And** NO UTC conversion for date field (date is timezone-agnostic)

**Technical Detail**: The `date` field is `@db.Date` in Prisma (date only, no time). Intervals within exception are local times (like weekly rules).

---

### Requirement: Authorization for Exceptions

Same ownership rules as weekly rules.

#### Scenario: Contractor manages own exceptions

**Given** authenticated contractor with profile  
**When** contractor creates/updates/deletes exceptions  
**Then** operations succeed if ownership verified

---

#### Scenario: Admin read-only access

**Given** admin authenticated  
**When** admin queries `GET /api/contractors/:id/availability/exceptions`  
**Then** exceptions are returned (audit)  
**When** admin attempts `POST/PATCH/DELETE`  
**Then** 403 Forbidden

---

