# Specification: Contractor Profiles

## Purpose

Define contractor profile management capabilities for ReparaYa platform, enabling contractors to create professional profiles, undergo verification, and prepare for service publishing and Stripe Connect integration.

## ADDED Requirements

### Requirement: Contractor Profile Creation

The system SHALL allow users with `role=CONTRACTOR` to create a professional profile with business information.

#### Scenario: Successful profile creation

- **WHEN** a user with `role=CONTRACTOR` calls `POST /api/contractors/profile` with valid business information
- **THEN** the system SHALL create a `ContractorProfile` record with `verified: false` (DRAFT state)
- **AND** return HTTP 201 with the created profile

#### Scenario: Reject duplicate profile

- **WHEN** a user with `role=CONTRACTOR` attempts to create a profile but already has one
- **THEN** the system SHALL reject the request with HTTP 409 Conflict
- **AND** return error message "Contractor profile already exists"

#### Scenario: Reject non-contractor user

- **WHEN** a user with `role=CLIENT` or `role=ADMIN` attempts to create a contractor profile
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden
- **AND** return error message "Only users with role CONTRACTOR can create contractor profiles"

### Requirement: Contractor Profile Retrieval

The system SHALL allow contractors to retrieve their own profile and allow public access to limited profile information.

#### Scenario: Contractor retrieves own profile

- **WHEN** an authenticated contractor calls `GET /api/contractors/profile/me`
- **THEN** the system SHALL return HTTP 200 with full profile including:
  - `id`, `userId`, `businessName`, `description`, `specialties`, `verified`, `verificationDocuments`, `stripeConnectAccountId`, `createdAt`, `updatedAt`

#### Scenario: Public retrieves contractor profile

- **WHEN** any user (authenticated or not) calls `GET /api/contractors/:id`
- **THEN** the system SHALL return HTTP 200 with public profile including only:
  - `id`, `userId`, `businessName`, `description`, `specialties`, `verified`
- **AND** SHALL NOT expose `verificationDocuments` or `stripeConnectAccountId`

#### Scenario: Profile not found

- **WHEN** a user requests a contractor profile that does not exist
- **THEN** the system SHALL return HTTP 404 Not Found
- **AND** return error message "Contractor profile not found"

### Requirement: Contractor Profile Update

The system SHALL allow contractors to update their profile while respecting verification state constraints.

#### Scenario: Update profile in DRAFT state

- **WHEN** a contractor with `verified: false` calls `PATCH /api/contractors/profile/me` with updated information
- **THEN** the system SHALL update the profile
- **AND** return HTTP 200 with the updated profile

#### Scenario: Reject update in ACTIVE state

- **WHEN** a contractor with `verified: true` attempts to update their profile
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden
- **AND** return error message "Cannot edit verified profile. Contact admin for changes."

#### Scenario: Validate input data

- **WHEN** a contractor submits invalid data (e.g., `businessName` exceeding 100 characters)
- **THEN** the system SHALL reject the request with HTTP 400 Bad Request
- **AND** return validation errors from Zod schema

### Requirement: Admin Profile Verification

The system SHALL allow admins to verify contractor profiles, transitioning them from DRAFT to ACTIVE state.

#### Scenario: Admin approves contractor profile

- **WHEN** an authenticated admin calls `PATCH /api/admin/contractors/:id/verify` with `verified: true`
- **THEN** the system SHALL update `verified` to `true`
- **AND** return HTTP 200 with the updated profile
- **AND** the contractor SHALL be able to publish services

#### Scenario: Admin rejects contractor profile

- **WHEN** an authenticated admin calls `PATCH /api/admin/contractors/:id/verify` with `verified: false`
- **THEN** the system SHALL update `verified` to `false`
- **AND** return HTTP 200 with the updated profile
- **AND** the contractor SHALL remain in DRAFT state

#### Scenario: Non-admin cannot verify profiles

- **WHEN** a user with `role=CONTRACTOR` or `role=CLIENT` attempts to verify a contractor profile
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden
- **AND** return error message "Only admins can verify contractor profiles"

#### Scenario: Contractor cannot self-verify

- **WHEN** a contractor attempts to verify their own profile
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden
- **AND** return error message "You cannot verify your own profile"

### Requirement: Verification State Management

The system SHALL manage contractor verification states (DRAFT, ACTIVE) and enforce state-based permissions.

#### Scenario: Initial state is DRAFT

- **WHEN** a contractor creates a new profile
- **THEN** the profile SHALL have `verified: false` (DRAFT state)
- **AND** the contractor SHALL NOT be able to publish services

#### Scenario: Transition to ACTIVE state

- **WHEN** an admin approves a contractor profile
- **THEN** the profile SHALL transition to `verified: true` (ACTIVE state)
- **AND** the contractor SHALL be able to publish services

#### Scenario: Block service publishing in DRAFT state

- **WHEN** a contractor with `verified: false` attempts to publish a service
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden
- **AND** return error message "Your profile must be verified before publishing services"

### Requirement: Stripe Connect Preparation

The system SHALL provide a nullable `stripeConnectAccountId` field to prepare for future Stripe Connect integration without implementing payout functionality.

#### Scenario: Default Stripe account ID is NULL

- **WHEN** a contractor creates a new profile
- **THEN** the `stripeConnectAccountId` field SHALL be `NULL`

#### Scenario: Field reserved for future use

- **WHEN** the Stripe Connect module is implemented in a future change
- **THEN** the system SHALL populate `stripeConnectAccountId` with the Stripe Express account ID
- **AND** use it for contractor payouts

## Data Model

### ContractorProfile Entity

**Table:** `contractor_profiles` (already exists in Prisma schema, no migration needed)

**Relationship:** 1:1 with `users` (one user with `role=CONTRACTOR` can have exactly one contractor profile)

**Fields:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique identifier for contractor profile |
| `userId` | UUID | Foreign Key → `users.id`, UNIQUE | One-to-one relationship with user |
| `businessName` | String | NOT NULL, max 100 chars | Commercial name (e.g., "García Plumbing") |
| `description` | String | NOT NULL, max 500 chars | Business description and service areas |
| `specialties` | String[] | NOT NULL | List of specialties (e.g., ["plumbing", "electrical"]) |
| `verified` | Boolean | NOT NULL, default: false | KYC verification status (false=DRAFT, true=ACTIVE) |
| `verificationDocuments` | JSON | NULLABLE | URLs of verification documents (ID, proof of address) |
| `stripeConnectAccountId` | String | NULLABLE | Stripe Express account ID (for future use, currently NULL) |
| `createdAt` | DateTime | NOT NULL, default: now() | Profile creation timestamp |
| `updatedAt` | DateTime | NOT NULL, auto-update | Profile last update timestamp |

**Indexes:**

- `userId` (UNIQUE) - Ensure one profile per contractor
- `verified` - Fast lookup of verified contractors

**Relations:**

- `user`: `User` (1:1) - Owner of the profile
- `services`: `Service[]` (1:N) - Services published by contractor (future module)

**Cascading Deletes:**

- If `User` is deleted, `ContractorProfile` is deleted (CASCADE)

## API Contracts

### POST /api/contractors/profile

Create contractor profile.

**Authorization:** `requireRole('CONTRACTOR')`

**Request Body:**

```json
{
  "businessName": "García Plumbing",
  "description": "Professional plumbing services in Guadalajara metropolitan area. 15 years of experience.",
  "specialties": ["plumbing", "water heater installation"],
  "verificationDocuments": {
    "idCardUrl": "https://example.com/id.pdf",
    "proofOfAddressUrl": "https://example.com/proof.pdf"
  }
}
```

**Validation (Zod schema):**

- `businessName`: string, min 1, max 100
- `description`: string, min 10, max 500
- `specialties`: array of strings, min 1 item
- `verificationDocuments`: optional object with URLs

**Response (201 Created):**

```json
{
  "id": "contractor-uuid",
  "userId": "user-uuid",
  "businessName": "García Plumbing",
  "description": "Professional plumbing services...",
  "specialties": ["plumbing", "water heater installation"],
  "verified": false,
  "verificationDocuments": { ... },
  "stripeConnectAccountId": null,
  "createdAt": "2025-11-17T10:00:00Z",
  "updatedAt": "2025-11-17T10:00:00Z"
}
```

**Errors:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not have `role=CONTRACTOR`
- `409 Conflict` - Contractor profile already exists for this user
- `400 Bad Request` - Validation errors

### GET /api/contractors/profile/me

Get own contractor profile.

**Authorization:** `requireRole('CONTRACTOR')`

**Response (200 OK):**

```json
{
  "id": "contractor-uuid",
  "userId": "user-uuid",
  "businessName": "García Plumbing",
  "description": "Professional plumbing services...",
  "specialties": ["plumbing", "water heater installation"],
  "verified": true,
  "verificationDocuments": { ... },
  "stripeConnectAccountId": null,
  "createdAt": "2025-11-17T10:00:00Z",
  "updatedAt": "2025-11-17T12:00:00Z"
}
```

**Errors:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not have `role=CONTRACTOR`
- `404 Not Found` - Contractor profile not found

### PATCH /api/contractors/profile/me

Update own contractor profile.

**Authorization:** `requireRole('CONTRACTOR')`

**Request Body:**

```json
{
  "businessName": "García & Sons Plumbing",
  "description": "Updated description",
  "specialties": ["plumbing", "electrical", "HVAC"]
}
```

**Validation:** All fields optional, same constraints as creation

**Response (200 OK):** Updated profile

**Errors:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Cannot edit verified profile (verified: true)
- `400 Bad Request` - Validation errors

### GET /api/contractors/:id

Get public contractor profile.

**Authorization:** Public (no authentication required)

**Response (200 OK):**

```json
{
  "id": "contractor-uuid",
  "userId": "user-uuid",
  "businessName": "García Plumbing",
  "description": "Professional plumbing services...",
  "specialties": ["plumbing", "water heater installation"],
  "verified": true
}
```

**Note:** Does NOT include `verificationDocuments` or `stripeConnectAccountId`

**Errors:**

- `404 Not Found` - Contractor profile not found

### PATCH /api/admin/contractors/:id/verify

Verify or reject contractor profile (admin only).

**Authorization:** `requireRole('ADMIN')`

**Request Body:**

```json
{
  "verified": true
}
```

**Response (200 OK):** Updated profile with new verification status

**Errors:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not have `role=ADMIN`
- `404 Not Found` - Contractor profile not found

## Security & Permissions

### Access Control Matrix

| Endpoint | Role Required | Additional Checks |
|----------|---------------|-------------------|
| `POST /api/contractors/profile` | `CONTRACTOR` | No existing profile for userId |
| `GET /api/contractors/profile/me` | `CONTRACTOR` | User owns the profile |
| `PATCH /api/contractors/profile/me` | `CONTRACTOR` | User owns profile AND `verified: false` |
| `GET /api/contractors/:id` | Public | None (read-only, limited fields) |
| `PATCH /api/admin/contractors/:id/verify` | `ADMIN` | Cannot verify own profile |

### Data Protection

**Sensitive Fields (not exposed publicly):**

- `verificationDocuments` - Contains personal identification
- `stripeConnectAccountId` - Payment account information
- `userId` in private context - Direct link to user account

**Public Fields (exposed in `GET /api/contractors/:id`):**

- `id`, `businessName`, `description`, `specialties`, `verified`

**Validation & Sanitization:**

- All inputs validated with Zod schemas
- HTML/script tags rejected in text fields
- URLs validated for `verificationDocuments`
- Specialties array limited to predefined values (future enhancement)

## Testing Plan

### Test Cases

| ID | Description | Type | Priority |
|----|-------------|------|----------|
| TC-CONTRACTOR-001 | Create contractor profile successfully | Integration | High |
| TC-CONTRACTOR-002 | Reject duplicate profile creation | Integration | High |
| TC-CONTRACTOR-003 | Reject profile creation by non-contractor user | Integration | High |
| TC-CONTRACTOR-004 | Retrieve own contractor profile | Integration | High |
| TC-CONTRACTOR-005 | Update contractor profile in DRAFT state | Integration | High |
| TC-CONTRACTOR-006 | Retrieve public contractor profile | Integration | High |
| TC-CONTRACTOR-007 | Public profile does not expose sensitive data | Integration | High |
| TC-CONTRACTOR-008 | Admin approves contractor profile | Integration | High |
| TC-CONTRACTOR-009 | Contractor cannot self-verify | Integration | High |
| TC-CONTRACTOR-010 | Zod validation rejects invalid inputs | Unit | High |
| TC-CONTRACTOR-011 | State transition DRAFT → ACTIVE | Unit | High |
| TC-CONTRACTOR-012 | Default stripeConnectAccountId is NULL | Unit | Medium |

### Coverage Requirements

- **Module:** `src/modules/contractors`
- **Target Coverage:** ≥ 75%
- **Critical Paths:** Profile creation, verification, state transitions

### Security Tests

- Authorization by role (CONTRACTOR, ADMIN)
- Prevent self-verification
- Public endpoint data exposure limits
- Input sanitization (XSS, SQL injection via Zod)

## Integration Points

### Relationship with Services Module (Future)

**Dependency:** This module MUST be implemented before `services-publishing`

**Integration:**

- Each `Service` will have `contractorProfileId` (FK → `ContractorProfile.id`)
- Only contractors with `verified: true` can publish services
- Service listings will display contractor info from public profile

**Example Query:**

```typescript
const service = await prisma.service.findUnique({
  where: { id: serviceId },
  include: {
    contractorProfile: {
      select: {
        businessName: true,
        description: true,
        verified: true
      }
    }
  }
})
```

### Relationship with Bookings Module (Future)

**Integration:**

- Each `Booking` will have `contractorId` (FK → `User.id` where `role=CONTRACTOR`)
- Contractor profile retrieved via `userId` relationship
- Booking confirmations display contractor business name

**Example:**

```typescript
const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: {
    contractor: {
      include: {
        contractorProfile: {
          select: { businessName: true, verified: true }
        }
      }
    }
  }
})
```

### Stripe Connect Integration (Future)

**Field:** `stripeConnectAccountId` (currently NULL)

**Future Change:** `stripe-connect-contractor-payouts`

**Process:**

1. Contractor completes profile and gets verified (`verified: true`)
2. System calls Stripe API to create Express account
3. Contractor redirects to Stripe onboarding flow
4. Webhook updates `stripeConnectAccountId` with account ID
5. Payouts use this account ID for transfers

**Reference:** https://stripe.com/docs/connect/express-accounts

## Non-Functional Requirements

### Requirement: Performance

The system SHALL respond to contractor profile queries within 200ms at P95.

#### Scenario: Fast profile lookup

- **WHEN** a user requests a contractor profile by ID
- **THEN** the system SHALL respond within 200ms for 95% of requests

### Requirement: Data Validation

The system SHALL validate all contractor profile inputs using Zod schemas to prevent invalid data and injection attacks.

#### Scenario: Reject invalid business name

- **WHEN** a contractor submits a business name exceeding 100 characters
- **THEN** the system SHALL reject the request with validation error

#### Scenario: Reject malicious input

- **WHEN** a contractor submits HTML/JavaScript in text fields
- **THEN** the system SHALL reject the request with validation error

### Requirement: Code Quality

The system SHALL maintain test coverage of at least 75% for the contractors module.

#### Scenario: Coverage verification

- **WHEN** running `npm run test:coverage`
- **THEN** the `src/modules/contractors` directory SHALL show coverage ≥ 75%

## Future Enhancements

### Suspension State (Out of Scope)

**Goal:** Allow admins to suspend contractors for policy violations

**New Field:** `status` enum (DRAFT | ACTIVE | SUSPENDED)

**Impact:** Replace `verified` boolean with richer state management

### Geolocation Service Areas (Out of Scope)

**Goal:** Replace text-based service areas with geographic coordinates

**New Field:** `serviceAreas` JSON with lat/lng polygons

**Integration:** Amazon Location Service for geocoding

### Automated KYC Verification (Out of Scope)

**Goal:** Integrate with third-party KYC service (e.g., Stripe Identity)

**Impact:** Reduce manual verification by admins

### Document Upload to S3 (Out of Scope)

**Goal:** Upload verification documents directly to AWS S3

**Current:** `verificationDocuments` stores external URLs (dummy data)

**Future:** Store S3 URLs, implement signed uploads

## References

- **Prisma Schema:** `/apps/web/prisma/schema.prisma` - `ContractorProfile` model
- **Auth Module:** `/openspec/specs/auth/spec.md` - Role-based authorization
- **Users Module:** `/openspec/specs/users/spec.md` - User profile management
- **Stripe Connect Docs:** https://stripe.com/docs/connect/express-accounts
