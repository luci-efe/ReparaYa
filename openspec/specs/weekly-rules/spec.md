# weekly-rules Specification

## Purpose
TBD - created by archiving change 2025-11-20-contractor-availability. Update Purpose after archive.
## Requirements
### Requirement: Weekly Recurrence Patterns

The system SHALL SHALL allow contractors to define recurring availability rules for each day of the week (Sunday-Saturday).

#### Scenario: Create weekly rule with multiple intervals

**Given** a contractor with profile configured and timezone set to `America/Mexico_City`  
**When** contractor creates a weekly rule for Monday (dayOfWeek=1) with intervals `[{09:00-12:00}, {14:00-18:00}]`  
**Then** the rule is persisted with UTC conversion  
**And** contractor can view the rule in their local timezone  
**And** the rule appears in slot generation for all Mondays

**Acceptance Criteria**:
- dayOfWeek must be 0-6 (0=Sunday, 6=Saturday)
- Each interval must have startTime \u003c endTime
- Intervals within same day must not overlap
- Time format: HH:MM (24-hour)
- Minimum interval duration: No hard minimum, but UI warns if \u003c 30 min

---

#### Scenario: Reject overlapping intervals in weekly rule

**Given** a contractor attempts to create a weekly rule  
**When** intervals overlap (e.g., `[{09:00-13:00}`, `{12:00-16:00}]`)  
**Then** validation fails with 400 error  
**And** error message explains "Los intervalos no deben traslaparse"

---

#### Scenario: Update weekly rule intervals

**Given** an existing weekly rule for Wednesday  
**When** contractor updates intervals from `[{09:00-17:00}]` to `[{10:00-14:00}]`  
**Then** rule is updated atomically  
**And** future slot generation reflects new intervals  
**And** existing bookings are not affected (slots already booked remain valid)

---

#### Scenario: Disable weekly rule temporarily

**Given** an existing enabled weekly rule  
**When** contractor sets `enabled: false`  
**Then** rule is preserved in database  
**And** slot generation skips this rule (no slots for that day)  
**And** contractor can re-enable later without recreating

---

### Requirement: Authorization for Weekly Rules

Only the contractor who owns the profile can create/update/delete their weekly rules.

#### Scenario: Contractor manages own weekly rules

**Given** a contractor authenticated as User A with ContractorProfile X  
**When** contractor creates/updates/deletes weekly rules for Profile X  
**Then** operations succeed  

---

#### Scenario: Contractor cannot modify other contractor's rules

**Given** contractor A authenticated  
**When** contractor A attempts to modify weekly rule belonging to contractor B  
**Then** request fails with 403 Forbidden  
**And** error message: "No autorizado para modificar esta disponibilidad"

---

#### Scenario: Admin can view but not modify weekly rules

**Given** an admin user authenticated  
**When** admin views weekly rules via `GET /api/contractors/:id/availability/weekly`  
**Then** rules are returned (audit access)  
**When** admin attempts `POST/PATCH/DELETE`  
**Then** request fails with 403 (admins have read-only access for availability)

---

### Requirement: Granularity Configuration

The system SHALL supports configurable time slot granularity.

#### Scenario: Document supported granularities

**Given** the ReparaYa platform  
**Then** spec documents minimum granularity: **15 minutes**  
**And** recommended granularity: **30 minutes**  
**And** contractors can create intervals at any HH:MM precision  
**And** UI suggests 15/30/60 minute increments via dropdown helpers

**Implementation Note**: v1 does not enforce granularity at backend (accepts any HH:MM). UI provides visual helpers for common increments. Future v2 may add configurable slot snap-to-grid.

---

### Requirement: Timezone Normalization for Weekly Rules

Weekly rules are stored in contractor's local timezone but internally normalized to UTC for consistency.

#### Scenario: Create rule in contractor timezone

**Given** contractor's timezone is `America/Mexico_City` (UTC-6 in winter, UTC-5 in summer)  
**When** contractor creates rule: Monday 09:00-17:00  
**Then** backend stores intervals as-is (since weekly rules are timezone-agnostic)  
**And** when generating slots, intervals are interpreted in contractor's current timezone  
**And** DST transitions are handled correctly by `date-fns-tz`

**Technical Detail**: Weekly rules store `startTime/endTime` as local times (not UTC timestamps), because "Monday 9am" means "9am in contractor's local time regardless of date". Blocks and exceptions (which have specific dates) ARE converted to UTC.

---

