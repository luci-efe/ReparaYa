# booking-module Specification

## Purpose
TBD - created by archiving change 2025-11-24-implement-contractor-booking-management. Update Purpose after archive.
## Requirements
### Requirement: Booking Types and DTOs

The system SHALL define TypeScript types for booking data transfer objects.

#### Scenario: BookingDTO structure
- **WHEN** a booking is retrieved from the database
- **THEN** it SHALL be transformed to a BookingDTO with fields: id, serviceId, clientId, contractorId, status, scheduledDate, address, notes, basePrice, finalPrice, anticipoAmount, liquidacionAmount, service (name, category), client (name), contractor (businessName)

#### Scenario: CreateBookingDTO validation
- **WHEN** creating a booking
- **THEN** the input SHALL be validated with Zod schema requiring: serviceId (uuid), availabilityId (uuid), address (string 5-500 chars), notes (optional string max 1000 chars)

---

### Requirement: Booking Repository

The system SHALL provide a repository layer for booking data access via Prisma.

#### Scenario: Find bookings by client
- **WHEN** `bookingRepository.findByClientId(clientId, filters)` is called
- **THEN** it SHALL return bookings where clientId matches, ordered by scheduledDate descending
- **AND** support optional status filter

#### Scenario: Find bookings by contractor
- **WHEN** `bookingRepository.findByContractorId(contractorId, filters)` is called
- **THEN** it SHALL return bookings where contractorId matches, ordered by scheduledDate descending
- **AND** support optional status filter

#### Scenario: Find booking by ID with relations
- **WHEN** `bookingRepository.findById(bookingId)` is called
- **THEN** it SHALL return the booking with included relations: service (title, category), client (firstName, lastName), contractor (businessName), stateHistory

#### Scenario: Update booking status atomically
- **WHEN** `bookingRepository.updateStatus(bookingId, newStatus, changedBy, notes)` is called
- **THEN** it SHALL update the booking status within a transaction
- **AND** create a BookingStateHistory record with fromState, toState, changedBy, notes
- **AND** return the updated booking

---

### Requirement: Booking Service State Machine

The system SHALL implement a state machine for booking lifecycle management.

#### Scenario: Valid state transition - PENDING_PAYMENT to CONFIRMED
- **WHEN** `bookingService.advanceState(bookingId, 'CONFIRMED', userId)` is called
- **AND** the booking is in PENDING_PAYMENT status
- **THEN** the booking status SHALL be updated to CONFIRMED
- **AND** a state history entry SHALL be created

#### Scenario: Valid state transition - CONFIRMED to ON_SITE
- **WHEN** `bookingService.advanceState(bookingId, 'ON_SITE', userId)` is called
- **AND** the booking is in CONFIRMED status
- **AND** the user is the contractor of the booking
- **THEN** the booking status SHALL be updated to ON_SITE

#### Scenario: Valid state transition - ON_SITE to COMPLETED
- **WHEN** `bookingService.advanceState(bookingId, 'COMPLETED', userId)` is called
- **AND** the booking is in ON_SITE status
- **AND** the user is the contractor of the booking
- **THEN** the booking status SHALL be updated to COMPLETED

#### Scenario: Invalid state transition rejected
- **WHEN** `bookingService.advanceState(bookingId, targetState, userId)` is called
- **AND** the transition is not valid according to state machine rules
- **THEN** the system SHALL throw `InvalidStateTransitionError`

#### Scenario: Unauthorized state transition rejected
- **WHEN** a user attempts to advance a booking state
- **AND** the user is not the client, contractor, or admin of the booking
- **THEN** the system SHALL throw `UnauthorizedBookingAccessError`

---

### Requirement: Booking List API

The system SHALL provide an API endpoint to list bookings for the authenticated user.

#### Scenario: Client lists their bookings
- **WHEN** a CLIENT user calls `GET /api/bookings`
- **THEN** the system SHALL return bookings where clientId matches the user
- **AND** include service details (title, category name)

#### Scenario: Contractor lists their bookings
- **WHEN** a CONTRACTOR user calls `GET /api/bookings`
- **THEN** the system SHALL return bookings where contractorId matches the user
- **AND** include client details (name)

#### Scenario: Filter bookings by status
- **WHEN** `GET /api/bookings?status=CONFIRMED` is called
- **THEN** only bookings with matching status SHALL be returned

---

### Requirement: Booking Detail API

The system SHALL provide an API endpoint to get booking details.

#### Scenario: Get booking as client
- **WHEN** `GET /api/bookings/:id` is called by the booking's client
- **THEN** the system SHALL return full booking details including service, contractor info, and state history

#### Scenario: Get booking as contractor
- **WHEN** `GET /api/bookings/:id` is called by the booking's contractor
- **THEN** the system SHALL return full booking details including service, client info, and state history

#### Scenario: Unauthorized access rejected
- **WHEN** `GET /api/bookings/:id` is called by a user who is not the client, contractor, or admin
- **THEN** the system SHALL return 403 Forbidden

---

### Requirement: Booking State Transition API

The system SHALL provide an API endpoint to advance booking state.

#### Scenario: Contractor advances to ON_SITE
- **WHEN** `PATCH /api/bookings/:id/state` is called with `{ "newState": "ON_SITE" }`
- **AND** the user is the booking's contractor
- **AND** the booking is in CONFIRMED status
- **THEN** the booking SHALL be updated to ON_SITE
- **AND** return 200 with updated booking

#### Scenario: Contractor completes booking
- **WHEN** `PATCH /api/bookings/:id/state` is called with `{ "newState": "COMPLETED" }`
- **AND** the user is the booking's contractor
- **AND** the booking is in ON_SITE status
- **THEN** the booking SHALL be updated to COMPLETED

#### Scenario: Invalid transition returns error
- **WHEN** `PATCH /api/bookings/:id/state` is called with an invalid transition
- **THEN** the system SHALL return 400 Bad Request with error message

---

### Requirement: Contractor Bookings API

The system SHALL provide a contractor-specific endpoint for booking management.

#### Scenario: List contractor bookings with status tabs
- **WHEN** `GET /api/contractors/bookings?status=PENDING` is called
- **AND** the user has CONTRACTOR role
- **THEN** the system SHALL return bookings where contractorId matches
- **AND** status is PENDING_PAYMENT or CONFIRMED (pending tab)

#### Scenario: Contractor bookings include counts
- **WHEN** `GET /api/contractors/bookings` is called
- **THEN** the response SHALL include counts: { pending, active, completed, cancelled }

