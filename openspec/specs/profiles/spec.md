# profiles Specification

## Purpose
TBD - created by archiving change 2025-11-17-profiles-contractor. Update Purpose after archive.
## Requirements
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

