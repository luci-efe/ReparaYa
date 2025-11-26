# Spec Delta: Manual Availability Blocks

## ADDED Requirements

### Requirement: Ad-Hoc Time Blocks

The system SHALL allow contractors to create manual blocks for specific datetime ranges (vacations, maintenance, emergencies).

#### Scenario: Create block for vacation period

**Given** contractor wants to block Dec 20-26 for vacation  
**When** contractor creates block with `startDateTime: "2025-12-20T00:00:00-06:00"`, `endDateTime: "2025-12-26T23:59:59-06:00"`, reason: "Vacaciones de Navidad"  
**Then** block is created and stored in UTC (`"2025-12-20T06:00:00Z"` to `"2025-12-27T05:59:59Z"`)  
**And** slot generation subtracts this block from available intervals for all affected days  
**And** block appears in list filtered by date range

**Acceptance Criteria**:
- DateTime format: ISO8601 with timezone (e.g., `2025-12-20T00:00:00-06:00`)
- `startDateTime` must be \u003c `endDateTime`
- Reason is optional freetext (max 500 chars recommended)
- Blocks are stored in UTC internally
- Blocks can span multiple days

---

#### Scenario: Create block for single-day maintenance window

**Given** contractor needs block on Nov 20 from 10am-12pm for equipment maintenance  
**When** contractor creates block with `startDateTime: "2025-11-20T10:00:00-06:00"`, `endDateTime: "2025-11-20T12:00:00-06:00"`, reason: "Mantenimiento de equipo"  
**Then** block is created  
**And** slot generation on Nov 20 subtracts 10am-12pm interval from that day's availability  
**And** other days are not affected

---

#### Scenario: Cannot block time with confirmed bookings

**Given** contractor has confirmed booking on Dec 15 at 09:00-11:00  
**When** contractor attempts to create block overlapping that time (`startDateTime: "2025-12-15T08:00:00-06:00"`, `endDateTime: "2025-12-15T10:00:00-06:00"`)  
**Then** request fails with 409 Conflict  
**And** error message: "No se puede bloquear este horario porque hay una reserva confirmada"  
**And** error includes booking ID for reference

**Acceptance Criteria**:
- Validation queries `Booking` table for status = `CONFIRMED` in overlapping range
- Uses UTC comparisons to detect overlaps
- Allows blocking over `PENDING_PAYMENT` or `CANCELLED` bookings (not confirmed)

---

#### Scenario: Delete block to re-enable availability

**Given** contractor created vacation block Dec 20-26  
**And** vacation plans changed  
**When** contractor deletes the block via `DELETE /api/contractors/me/availability/blocks/:blockId`  
**Then** block is removed from database  
**And** slot generation no longer subtracts that block  
**And** availability for Dec 20-26 returns to normal (weekly rules + exceptions apply)

---

### Requirement: Block Overlap Detection

System detects and prevents conflicting blocks and bookings.

#### Scenario: List blocks overlapping date range

**Given** contractor has blocks:  
  - Block A: Dec 20-26  
  - Block B: Jan 10-12  
**When** API requests blocks for Dec 1 - Dec 31  
**Then** only Block A is returned  
**When** API requests blocks for Dec 15 - Jan 15  
**Then** both blocks are returned (partial overlaps count)

**SQL Logic**:
```sql
WHERE contractorProfileId = :id
  AND (
    (startDateTime BETWEEN :start AND :end)
    OR (endDateTime BETWEEN :start AND :end)
    OR (startDateTime \u003c= :start AND endDateTime \u003e= :end)  -- block fully contains range
  )
```

---

### Requirement: Timezone Conversion for Blocks

Blocks use UTC internally but accept/return contractor's local timezone for UI.

#### Scenario: Create block in contractor timezone, store in UTC

**Given** contractor's timezone is `America/Mexico_City` (UTC-6 in November)  
**When** contractor creates block: `2025-11-20T09:00:00-06:00` to `2025-11-20T17:00:00-06:00`  
**Then** backend converts to UTC:  
  - startDateTime = `2025-11-20T15:00:00Z`  
  - endDateTime = `2025-11-20T23:00:00Z`  
**And** persists UTC values in Postgres  
**When** contractor retrieves block via GET  
**Then** API converts back to local timezone: `09:00-06:00` to `17:00-06:00`

---

#### Scenario: DST transitions in multi-day blocks

**Given** contractor creates block spanning DST transition (e.g., April 2-8)  
**When** block stored in UTC  
**Then** UTC values are consistent across DST boundary  
**And** slot generation correctly interprets each day's local time using `date-fns-tz`

---

### Requirement: Authorization for Blocks

Same ownership rules as weekly rules and exceptions.

#### Scenario: Contractor manages own blocks

**Given** authenticated contractor with profile  
**When** contractor creates/deletes blocks  
**Then** operations succeed if ownership verified

---

#### Scenario: Admin read-only access

**Given** admin authenticated  
**When** admin queries `GET /api/contractors/:id/availability/blocks`  
**Then** blocks are returned (audit)  
**When** admin attempts `POST/DELETE`  
**Then** 403 Forbidden

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.

---

## Testing Checklist

- [ ] TC-RF-CTR-AVAIL-007: Create block successfully (integration test)
- [ ] TC-RF-CTR-AVAIL-008: Reject block overlapping confirmed booking (integration test, expect 409)
- [ ] TC-RF-CTR-AVAIL-009: Delete block (integration test)
- [ ] TC-RF-CTR-AVAIL-012: Slot generation subtracts blocks correctly (unit test, integration test)
- [ ] TC-RF-CTR-AVAIL-014: Timezone conversion for blocks (unit test)

---

## API Contracts

### POST /api/contractors/me/availability/blocks

**Request**:
```json
{
  "startDateTime": "2025-12-20T00:00:00-06:00",
  "endDateTime": "2025-12-26T23:59:59-06:00",
  "reason": "Vacaciones de Navidad"
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "contractorProfileId": "uuid",
  "startDateTime": "2025-12-20T06:00:00Z",  // UTC
  "endDateTime": "2025-12-27T05:59:59Z",    // UTC
  "reason": "Vacaciones de Navidad",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Note**: Response returns UTC. Frontend should convert to local TZ for display using contractor's timezone.

**Errors**:
- 400: Validation failed (startDateTime \u003e= endDateTime, malformed ISO8601)
- 409: Conflict with confirmed booking
- 403: Not authorized

---

### GET /api/contractors/me/availability/blocks

**Query Params**:
- `startDate` (optional): YYYY-MM-DD (for filtering overlapping blocks)
- `endDate` (optional): YYYY-MM-DD

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "contractorProfileId": "uuid",
    "startDateTime": "2025-12-20T06:00:00Z",
    "endDateTime": "2025-12-27T05:59:59Z",
    "reason": "Vacaciones de Navidad",
    "createdAt": "...",
    "updatedAt": "..."
  },
  ...
]
```

Ordered by `startDateTime` ASC.

---

### DELETE /api/contractors/me/availability/blocks/:blockId

**Response (204)**: No content

**Errors**:
- 404: Block not found
- 403: Not authorized

---

**Version**: 1.0  
**Date**: 2025-11-22  
**Related To**: Contractor Availability System
