# contractor-location Specification

## Purpose

This module enables contractors to register their physical location (base address) and define their service coverage zones. The system captures structured addresses, geocodes them using AWS Location Service to obtain precise coordinates, and allows contractors to configure their operational area using radius-based zones (with extensibility for polygon zones in the future).

This functionality is essential for enabling geographic search of contractors, validating service coverage before booking, and calculating logistics for service delivery. Without location data, clients cannot find nearby contractors, and the marketplace cannot provide location-aware features.

## Scope

**In scope:**
- Capture of normalized addresses (street, number, neighborhood, city, state, postal code, country)
- Server-side geocoding via AWS Location Service to obtain latitude/longitude coordinates
- Configuration of service zones with RADIUS type (radius in km from base location)
- Privacy controls (full address visible only to owner and admins)
- Edit restrictions based on contractor profile state (DRAFT allows editing, ACTIVE requires approval workflow)
- Timezone inference from coordinates using geo-tz library
- Resilient error handling for geocoding failures (timeouts, ambiguous addresses)

**Out of scope (future):**
- Geographic search of contractors (search module)
- Route calculation and ETAs (booking module)
- POLYGON type zones (planned extension)
- Multiple locations per contractor (franchises)
- Validation of service zone before accepting bookings (booking module)
- Admin dashboard with map visualization

## Functional Requirements

### Requirement: RF-CTR-LOC-001 - Capture normalized address

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL allow contractors to provide a structured address for their base of operations.

**Criteria:**
- Address components: street, exteriorNumber, interiorNumber (optional), neighborhood (optional), city, state, postalCode, country (ISO 3166-1 alpha-2)
- Input validation via Zod schema
- Country must be "MX" for MVP (Mexico focus)
- Postal code must match Mexican format (5 digits)

#### Scenario: Contractor provides valid address

**GIVEN** an authenticated contractor with profile in DRAFT state
**WHEN** they submit POST `/api/contractors/[id]/location` with:
```json
{
  "street": "Av. Patria",
  "exteriorNumber": "1201",
  "interiorNumber": null,
  "neighborhood": "Lomas del Valle",
  "city": "Zapopan",
  "state": "Jalisco",
  "postalCode": "45129",
  "country": "MX",
  "zoneType": "RADIUS",
  "radiusKm": 15
}
```
**THEN** the system SHALL:
- Validate input with Zod schema
- Call AWS Location Service to geocode the address
- Store normalized address, coordinates, and timezone
- Set `geocodingStatus: SUCCESS`
- Return HTTP 201 with created location

#### Scenario: Validation fails for invalid postal code

**GIVEN** an authenticated contractor
**WHEN** they submit an address with `postalCode: "ABC123"` (non-numeric)
**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return error message: "Postal code must be 5 digits for Mexico"

---

### Requirement: RF-CTR-LOC-002 - Geocode address using AWS Location Service

**Priority:** HIGH
**Type:** Integration

The system SHALL geocode addresses server-side using AWS Location Service to obtain precise coordinates.

**Criteria:**
- Use AWS Location Service Place Index (`reparaya-places`)
- Timeout: 5 seconds per geocoding request
- Retry policy: 3 attempts with exponential backoff
- Store geocoding result: `baseLatitude`, `baseLongitude`, `normalizedAddress`, `timezone`
- Verify result relevance score >= 0.8 (AWS Location Service confidence)
- Handle failures gracefully (set `geocodingStatus: FAILED`, allow manual retry)

#### Scenario: Geocoding succeeds with high confidence

**GIVEN** contractor submits address "Av. Patria 1201, Zapopan, Jalisco"
**WHEN** AWS Location Service returns:
```json
{
  "latitude": 20.7167,
  "longitude": -103.3833,
  "normalizedAddress": "Av. Patria 1201, Lomas del Valle, 45129 Zapopan, Jalisco, México",
  "relevance": 0.95
}
```
**THEN** the system SHALL:
- Store coordinates: `baseLatitude: 20.71670000`, `baseLongitude: -103.38330000`
- Store normalized address from AWS
- Infer timezone: "America/Mexico_City" using geo-tz
- Set `geocodingStatus: SUCCESS`

#### Scenario: Geocoding fails due to timeout

**GIVEN** contractor submits valid address
**WHEN** AWS Location Service request times out after 5 seconds
**THEN** the system SHALL:
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- If all retries fail, set `geocodingStatus: FAILED`
- Store address WITHOUT coordinates (`baseLatitude: null`, `baseLongitude: null`)
- Return HTTP 201 with warning message: "Address saved, but geocoding failed. Please verify and retry."
- Log error for debugging

#### Scenario: Ambiguous address (low relevance score)

**GIVEN** contractor submits address "Calle 5, Guadalajara"
**WHEN** AWS Location Service returns result with `relevance: 0.6` (below threshold)
**THEN** the system SHALL:
- Set `geocodingStatus: FAILED`
- Return HTTP 400 Bad Request with message: "Address is too ambiguous. Please provide more details (neighborhood, postal code)."

---

### Requirement: RF-CTR-LOC-003 - Configure service zone (RADIUS type)

**Priority:** HIGH
**Type:** Core Functionality

The system SHALL allow contractors to define their service coverage area using a radius from their base location.

**Criteria:**
- Zone type: RADIUS (circular area)
- Parameter: `radiusKm` (integer, range: 1-100 km)
- Stored alongside location data
- Validation: radius must be >= 1 and <= 100

#### Scenario: Configure valid radius zone

**GIVEN** contractor has created their location
**WHEN** they configure `zoneType: "RADIUS"` with `radiusKm: 20`
**THEN** the system SHALL:
- Validate radius is within range [1, 100]
- Store zone configuration
- Return HTTP 200 with updated location

#### Scenario: Reject invalid radius (out of range)

**GIVEN** contractor attempts to set `radiusKm: 0`
**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return error: "Radius must be between 1 and 100 km"

**GIVEN** contractor attempts to set `radiusKm: 150`
**THEN** the system SHALL reject with HTTP 400 Bad Request
**AND** return error: "Radius must be between 1 and 100 km"

---

### Requirement: RF-CTR-LOC-004 - Update location with state-based restrictions

**Priority:** HIGH
**Type:** Security

The system SHALL allow contractors to update their location only when their profile is in DRAFT state.

**Criteria:**
- DRAFT state (`verified: false`): Contractor can freely update address and zone
- ACTIVE state (`verified: true`): Updates are blocked, must contact admin
- Admins can always update any contractor's location

#### Scenario: Update location in DRAFT state

**GIVEN** contractor has profile with `verified: false`
**WHEN** they call PATCH `/api/contractors/[id]/location` with updated address
**THEN** the system SHALL:
- Allow the update
- Re-geocode the new address
- Return HTTP 200 with updated location

#### Scenario: Block update in ACTIVE state

**GIVEN** contractor has profile with `verified: true`
**WHEN** they attempt to update their location
**THEN** the system SHALL reject with HTTP 403 Forbidden
**AND** return error: "Cannot edit location for verified profiles. Contact admin for changes."

#### Scenario: Admin can update any location

**GIVEN** authenticated user with `role: ADMIN`
**WHEN** they call PATCH `/api/contractors/[contractorId]/location` for ANY contractor
**THEN** the system SHALL allow the update regardless of profile verification state

---

### Requirement: RF-CTR-LOC-005 - Privacy controls for location data

**Priority:** HIGH
**Type:** Security

The system SHALL enforce privacy controls to protect contractor location data.

**Criteria:**
- Full address (street, number, coordinates) visible only to: contractor owner, admins
- Public view (clients) sees only: city, state, service zone type and radius
- API responses use role-based DTOs
- Coordinates exposed to public are rounded to 2 decimal places (~1km precision)

#### Scenario: Owner retrieves their own location (full data)

**GIVEN** authenticated contractor
**WHEN** they call GET `/api/contractors/me/location`
**THEN** the system SHALL return full DTO:
```json
{
  "id": "uuid",
  "street": "Av. Patria",
  "exteriorNumber": "1201",
  "neighborhood": "Lomas del Valle",
  "city": "Zapopan",
  "state": "Jalisco",
  "postalCode": "45129",
  "country": "MX",
  "baseLatitude": 20.71670000,
  "baseLongitude": -103.38330000,
  "normalizedAddress": "...",
  "timezone": "America/Mexico_City",
  "zoneType": "RADIUS",
  "radiusKm": 15,
  "geocodingStatus": "SUCCESS"
}
```

#### Scenario: Public retrieves contractor location (limited data)

**GIVEN** unauthenticated user or client
**WHEN** they call GET `/api/contractors/[id]/location`
**THEN** the system SHALL return public DTO:
```json
{
  "city": "Zapopan",
  "state": "Jalisco",
  "zoneType": "RADIUS",
  "radiusKm": 15,
  "approximateLatitude": 20.72,
  "approximateLongitude": -103.38
}
```
**AND** SHALL NOT expose: street, number, postalCode, exact coordinates, normalized address

#### Scenario: Admin retrieves any contractor location (full data)

**GIVEN** authenticated user with `role: ADMIN`
**WHEN** they call GET `/api/contractors/[id]/location`
**THEN** the system SHALL return full DTO with all fields

---

## Non-Functional Requirements

### Requirement: RNF-CTR-LOC-001 - Geocoding performance

**Priority:** HIGH
**Type:** Performance

The system SHALL complete geocoding requests within acceptable time limits.

**Criteria:**
- P95 latency for geocoding: <= 1.5 seconds
- P99 latency for geocoding: <= 2.5 seconds
- Timeout per AWS request: 5 seconds
- Total retries must not exceed 15 seconds (5s + 1s + 2s + 4s)

**Test:** k6 load test with 50 geocoding requests, measure P95/P99 latencies.

---

### Requirement: RNF-CTR-LOC-002 - Data privacy and GDPR compliance

**Priority:** HIGH
**Type:** Security

The system SHALL protect contractor location data according to privacy best practices.

**Criteria:**
- Full address stored encrypted at rest (PostgreSQL encryption)
- Role-based DTOs prevent unauthorized data exposure
- Audit log for location updates (future: track who/when changed location)
- Contractors can delete their location (cascades on profile deletion)

**Test:** Verify public API responses do not expose sensitive fields (street, exact coordinates).

---

### Requirement: RNF-CTR-LOC-003 - Resilience to AWS failures

**Priority:** MEDIUM
**Type:** Reliability

The system SHALL handle AWS Location Service failures gracefully.

**Criteria:**
- Retry policy: 3 attempts with exponential backoff
- Degraded mode: Allow saving address without coordinates if geocoding fails
- Status tracking: `geocodingStatus` field to track PENDING/SUCCESS/FAILED
- Manual retry: Admin can trigger re-geocoding for FAILED records
- Logging: Structured logs for debugging AWS errors

**Test:** Simulate AWS timeout, verify address is saved with `geocodingStatus: FAILED`.

---

## Data Model

### ContractorServiceLocation

**Table:** `ContractorServiceLocation`
**Relationship:** 1:1 with `ContractorProfile` (one location per contractor)

**Schema:**

```prisma
model ContractorServiceLocation {
  id                  String            @id @default(uuid())
  contractorProfileId String            @unique
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  // Dirección estructurada
  street         String  @db.VarChar(200)
  exteriorNumber String  @db.VarChar(20)
  interiorNumber String? @db.VarChar(20)
  neighborhood   String? @db.VarChar(100)
  city           String  @db.VarChar(100)
  state          String  @db.VarChar(100)
  postalCode     String  @db.VarChar(10)
  country        String  @db.VarChar(2) // ISO 3166-1 alpha-2

  // Geocodificación
  baseLatitude      Decimal?        @db.Decimal(10, 8) // Rango: -90.00000000 a 90.00000000
  baseLongitude     Decimal?        @db.Decimal(11, 8) // Rango: -180.00000000 a 180.00000000
  normalizedAddress String?         @db.Text // Dirección devuelta por AWS
  timezone          String?         @db.VarChar(50) // IANA timezone (ej. "America/Mexico_City")
  geocodingStatus   GeocodingStatus @default(PENDING)

  // Zona de operación
  zoneType           ServiceZoneType
  radiusKm           Int? // Para tipo RADIUS (1-100)
  polygonCoordinates Json? // Para tipo POLYGON (futuro)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Índices para búsquedas geográficas
  @@index([baseLatitude, baseLongitude])
  @@index([city, state])
}

enum GeocodingStatus {
  PENDING
  SUCCESS
  FAILED
}

enum ServiceZoneType {
  RADIUS
  POLYGON
}
```

**Constraints:**
- `contractorProfileId` must be unique (1:1 relationship)
- `country` must be valid ISO 3166-1 alpha-2 code (e.g., "MX")
- `radiusKm` must be between 1 and 100 when `zoneType = RADIUS`
- `baseLatitude` range: -90.00000000 to 90.00000000
- `baseLongitude` range: -180.00000000 to 180.00000000

**Indexes:**
- Composite index on `(baseLatitude, baseLongitude)` for future geographic queries
- Composite index on `(city, state)` for filtering by region

---

## API Contracts

### POST /api/contractors/[id]/location

**Description:** Create location and service zone for a contractor.

**Authorization:** Authenticated contractor (owner) OR admin

**Request:**
```typescript
{
  street: string;         // max 200 chars
  exteriorNumber: string; // max 20 chars
  interiorNumber?: string; // optional, max 20 chars
  neighborhood?: string;   // optional, max 100 chars
  city: string;           // max 100 chars
  state: string;          // max 100 chars
  postalCode: string;     // 5 digits for MX
  country: string;        // ISO 3166-1 alpha-2 (e.g., "MX")
  zoneType: "RADIUS" | "POLYGON";
  radiusKm?: number;      // required if zoneType=RADIUS, range [1,100]
  polygonCoordinates?: Array<{lat: number, lng: number}>; // future
}
```

**Response 201 Created:**
```typescript
{
  id: string;
  contractorProfileId: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  baseLatitude: number | null;
  baseLongitude: number | null;
  normalizedAddress: string | null;
  timezone: string | null;
  geocodingStatus: "PENDING" | "SUCCESS" | "FAILED";
  zoneType: "RADIUS" | "POLYGON";
  radiusKm: number | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**Error Responses:**
- 400 Bad Request: Invalid input (Zod validation error)
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner/admin OR profile already has location
- 404 Not Found: Contractor profile not found
- 500 Internal Server Error: Geocoding failure (after retries)

---

### PATCH /api/contractors/[id]/location

**Description:** Update location and service zone.

**Authorization:** Authenticated contractor (owner, profile MUST be DRAFT) OR admin

**Request:**
```typescript
{
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  radiusKm?: number; // if zoneType=RADIUS
}
```

**Response 200 OK:** Same as POST response

**Error Responses:**
- 400 Bad Request: Invalid input
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner/admin OR profile is ACTIVE (verified)
- 404 Not Found: Location not found

---

### GET /api/contractors/[id]/location

**Description:** Retrieve contractor location.

**Authorization:** Public (returns limited data) OR owner/admin (returns full data)

**Response 200 OK (owner/admin):**
```typescript
{
  id: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  baseLatitude: number | null; // full precision
  baseLongitude: number | null; // full precision
  normalizedAddress: string | null;
  timezone: string | null;
  geocodingStatus: "PENDING" | "SUCCESS" | "FAILED";
  zoneType: "RADIUS" | "POLYGON";
  radiusKm: number | null;
  createdAt: string;
  updatedAt: string;
}
```

**Response 200 OK (public):**
```typescript
{
  city: string;
  state: string;
  zoneType: "RADIUS" | "POLYGON";
  radiusKm: number | null;
  approximateLatitude: number | null; // rounded to 2 decimals
  approximateLongitude: number | null; // rounded to 2 decimals
}
```

**Error Responses:**
- 404 Not Found: Location not found

---

## Validation Rules

### Zod Schemas

**CreateLocationInput:**
```typescript
import { z } from 'zod';

export const createLocationSchema = z.object({
  street: z.string().min(1).max(200),
  exteriorNumber: z.string().min(1).max(20),
  interiorNumber: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code must be 5 digits for Mexico"),
  country: z.literal("MX"), // MVP restricted to Mexico
  zoneType: z.enum(["RADIUS", "POLYGON"]),
  radiusKm: z.number().int().min(1).max(100).optional()
    .refine((val, ctx) => {
      if (ctx.parent.zoneType === "RADIUS" && !val) {
        return false; // radiusKm required for RADIUS type
      }
      return true;
    }, "radiusKm is required when zoneType is RADIUS"),
  polygonCoordinates: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })).optional() // future use
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
```

**UpdateLocationInput:**
```typescript
export const updateLocationSchema = createLocationSchema.partial();
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
```

---

## Security Considerations

### Authorization

**Ownership Checks:**
- POST/PATCH `/api/contractors/[id]/location`: Verify `userId` matches `contractorProfile.userId` OR user is admin
- GET `/api/contractors/[id]/location`: Public allowed (returns limited DTO)

**Repository Layer Guards:**
```typescript
async function verifyOwnership(contractorId: string, userId: string, userRole: string): Promise<void> {
  if (userRole === "ADMIN") return; // Admins can access any contractor

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: { userId: true }
  });

  if (!profile || profile.userId !== userId) {
    throw new ForbiddenError("You can only manage your own location");
  }
}
```

### Data Privacy

**Role-based DTOs:**
```typescript
function toPublicLocationDTO(location: ContractorServiceLocation) {
  return {
    city: location.city,
    state: location.state,
    zoneType: location.zoneType,
    radiusKm: location.radiusKm,
    approximateLatitude: location.baseLatitude ? parseFloat(location.baseLatitude.toFixed(2)) : null,
    approximateLongitude: location.baseLongitude ? parseFloat(location.baseLongitude.toFixed(2)) : null,
  };
}

function toFullLocationDTO(location: ContractorServiceLocation) {
  return {
    id: location.id,
    street: location.street,
    exteriorNumber: location.exteriorNumber,
    // ... all fields
  };
}
```

### Input Sanitization

- All string inputs trimmed and validated via Zod
- SQL injection prevented by Prisma parameterized queries
- XSS prevention: No HTML rendering of address fields (plain text only)

---

## Testing Plan

### Test Cases

The following test cases are documented in `/docs/md/STP-ReparaYa.md`:

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-CTR-LOC-001 | Create location with valid address (geocoding success) | Integration | Alta | RF-CTR-LOC-001, RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-002 | Create location with ambiguous address (low relevance) | Integration | Alta | RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-003 | Geocoding failure (AWS timeout) - save with PENDING status | Integration | Alta | RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-004 | Update location in DRAFT state | Integration | Alta | RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-005 | Block update in ACTIVE state (verified profile) | Integration | Alta | RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-006 | Configure RADIUS zone with valid radius (10 km) | Unit | Alta | RF-CTR-LOC-003 |
| TC-RF-CTR-LOC-007 | Reject invalid radius (0 km, 150 km) | Unit | Alta | RF-CTR-LOC-003 |
| TC-RF-CTR-LOC-008 | Authorization - only owner can create location | Integration | Alta | RF-CTR-LOC-005 |
| TC-RF-CTR-LOC-009 | Authorization - admin can update any location | Integration | Alta | RF-CTR-LOC-005 |
| TC-RF-CTR-LOC-010 | Privacy - public API returns limited DTO | Integration | Alta | RF-CTR-LOC-005 |
| TC-RF-CTR-LOC-011 | Privacy - owner API returns full DTO | Integration | Alta | RF-CTR-LOC-005 |
| TC-RNF-CTR-LOC-001 | Performance - geocoding P95 <= 1.5s | Performance | Alta | RNF-CTR-LOC-001 |
| TC-RNF-CTR-LOC-002 | Resilience - retry on AWS failure (exponential backoff) | Integration | Media | RNF-CTR-LOC-003 |
| TC-RNF-CTR-LOC-003 | A11y - Address form keyboard navigation | E2E | Media | General A11y |
| TC-RNF-CTR-LOC-004 | A11y - Address form ARIA labels | E2E | Media | General A11y |
| TC-RNF-CTR-LOC-005 | Validation - reject non-MX postal code format | Unit | Alta | RF-CTR-LOC-001 |

### Acceptance Criteria

**Code:**
- Migration applied successfully (ContractorServiceLocation table created)
- AWS Location Service client implemented with retry/timeout
- Service layer handles all error scenarios
- API routes implement authorization checks
- Zod validators cover all edge cases

**Testing:**
- Cobertura >= 70% in `src/modules/contractors/` (location-related files)
- All 15 test cases pass (TC-RF-CTR-LOC-001 to TC-RNF-CTR-LOC-005)
- Integration tests validate authorization and persistence
- E2E test of onboarding flow passes
- Performance: P95 <= 1.5s for geocoding (k6 test)

**Documentation:**
- This spec complete and approved
- STP updated with test cases
- `openspec/project.md` references this module

**Infrastructure:**
- AWS Location Service Place Index configured (`reparaya-places`)
- Environment variables already set (no new vars needed)
- Migration reversible (down migration tested)
- Indexes optimized for geographic queries

---

## Integration Points

### AWS Location Service

**Service:** Amazon Location Service
**Resources:**
- Place Index: `reparaya-places` (geocoding/reverse geocoding)
- Route Calculator: `reparaya-routes` (future use for distance calculations)

**Environment Variables:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_LOCATION_PLACE_INDEX=reparaya-places
AWS_LOCATION_ROUTE_CALCULATOR=reparaya-routes
```

**Client Wrapper:**
```typescript
// src/lib/aws/locationService.ts
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const client = new LocationClient({ region: process.env.AWS_REGION });

  const command = new SearchPlaceIndexForTextCommand({
    IndexName: process.env.AWS_LOCATION_PLACE_INDEX,
    Text: address,
    MaxResults: 1
  });

  // Timeout + retry logic implemented here
  const response = await client.send(command);

  return {
    latitude: response.Results[0].Place.Geometry.Point[1],
    longitude: response.Results[0].Place.Geometry.Point[0],
    normalizedAddress: response.Results[0].Place.Label,
    relevance: response.Results[0].Relevance
  };
}
```

### Clerk Authentication

**Usage:** Protect API routes with Clerk middleware
**Guards:**
- `requireAuth()` - Ensure user is authenticated
- `requireRole("CONTRACTOR")` - Ensure user is contractor
- `requireRole("ADMIN")` - Ensure user is admin

### geo-tz Library

**Purpose:** Infer timezone from latitude/longitude coordinates
**Library:** `geo-tz` (npm package)
**Usage:**
```typescript
import { find } from 'geo-tz';

const timezone = find(latitude, longitude)[0]; // e.g., "America/Mexico_City"
```

---

## Future Enhancements

### POLYGON Service Zones

**Goal:** Allow contractors to define custom coverage areas using polygon shapes.

**Implementation:**
- Add `polygonCoordinates` field (array of lat/lng points)
- Validate: minimum 3 points, maximum 50 points, polygon must be closed
- UI: Interactive map for drawing polygons
- Search: Point-in-polygon algorithm for coverage check

**API Changes:**
```typescript
// Request for POLYGON type
{
  zoneType: "POLYGON",
  polygonCoordinates: [
    { lat: 20.7167, lng: -103.3833 },
    { lat: 20.7200, lng: -103.3800 },
    { lat: 20.7150, lng: -103.3700 },
    { lat: 20.7167, lng: -103.3833 } // closed polygon
  ]
}
```

### Geographic Search Integration

**Module:** `search`
**Features:**
- Search contractors by proximity to client location
- Filter by service zone coverage (is client address within contractor's zone?)
- Sort results by distance

**Query Example:**
```sql
-- Find contractors within 20km of client location
SELECT c.*
FROM contractors c
JOIN contractor_service_locations csl ON c.id = csl.contractor_profile_id
WHERE csl.zone_type = 'RADIUS'
  AND ST_Distance(
    ST_MakePoint(csl.base_longitude, csl.base_latitude)::geography,
    ST_MakePoint(-103.35, 20.68)::geography
  ) <= csl.radius_km * 1000;
```

### Admin Dashboard

**Features:**
- Map visualization of all contractor locations
- Filter by verification status (PENDING/SUCCESS/FAILED geocoding)
- Bulk re-geocoding for FAILED addresses
- Audit log for location changes

### Multiple Locations per Contractor

**Use Case:** Franchises or contractors with multiple offices
**Schema Change:** Remove `@unique` constraint on `contractorProfileId`
**API Change:** Add `primaryLocation` flag, allow CRUD operations per location

---

## Change History

| Date | Author | Change |
|------|--------|--------|
| 2025-11-19 | Claude Code | Initial spec created from proposal 2025-11-19-capture-contractor-location |
