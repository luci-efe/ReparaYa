# Booking Flow Specification Delta

**Capability:** booking-flow
**Status:** Draft
**Related Change:** 2025-11-24-service-search-booking-demo

## Purpose

Enable clients to create bookings for services and manage their booking lifecycle, while contractors can view and manage incoming bookings.

## ADDED Requirements

### Requirement: BKF-001 - Booking Creation
The system SHALL allow authenticated clients to create bookings for services.

#### Scenario: Client creates a booking successfully
**Given** a client is authenticated
**And** views a service detail page with available slots
**When** the client selects an available slot
**And** provides a service address
**And** submits the booking
**Then** the system creates a booking with status PENDING_PAYMENT
**And** creates an Availability record linked to the booking
**And** calculates pricing breakdown:
  - anticipoAmount = finalPrice * 0.30
  - liquidacionAmount = finalPrice * 0.70
  - comisionAmount = finalPrice * 0.10
  - contractorPayoutAmount = finalPrice - comisionAmount

#### Scenario: Client selects unavailable slot
**Given** a client attempts to book a slot
**And** another client booked that slot concurrently
**When** the client submits the booking
**Then** the system returns a 409 Conflict error
**And** displays "Este horario ya no está disponible"

#### Scenario: Unauthenticated user attempts to book
**Given** an unauthenticated user is on a service detail page
**When** the user clicks "Reservar"
**Then** the system redirects to `/sign-in`
**And** preserves the return URL to the service page

### Requirement: BKF-002 - Client Booking List
The system SHALL allow clients to view their booking history.

#### Scenario: Client views active bookings
**Given** a client has bookings in various states
**When** the client navigates to `/clients/bookings`
**Then** the system displays bookings grouped by status:
  - Active tab: PENDING_PAYMENT, CONFIRMED, ON_ROUTE, ON_SITE, IN_PROGRESS
  - Completed tab: COMPLETED
  - Cancelled tab: CANCELLED, DISPUTED

#### Scenario: Client with no bookings
**Given** a client has no bookings
**When** the client views `/clients/bookings`
**Then** the system displays an empty state message
**And** shows a link to `/search`

### Requirement: BKF-003 - Client Booking Detail
The system SHALL provide detailed booking information to clients.

#### Scenario: Client views booking detail
**Given** a client has a booking with ID "bkg-123"
**When** the client navigates to `/clients/bookings/bkg-123`
**Then** the system displays:
  - Service information (title, image, category)
  - Contractor information (name, business name, avatar)
  - Scheduled date and time
  - Service address
  - Status badge (color-coded)
  - Status timeline (BookingStateHistory)
  - Payment summary (anticipo/liquidación amounts)
  - Notes (if any)

#### Scenario: Client views another user's booking
**Given** a booking belongs to a different client
**When** a client attempts to view that booking
**Then** the system returns a 403 Forbidden error

### Requirement: BKF-004 - Contractor Booking List
The system SHALL allow contractors to view bookings for their services.

#### Scenario: Contractor views incoming bookings
**Given** a contractor has services with bookings
**When** the contractor navigates to `/contractors/bookings`
**Then** the system displays all bookings for their services
**And** bookings are sorted by scheduledDate (soonest first)
**And** each booking shows client name, service, date, and status

### Requirement: BKF-005 - Contractor Booking Management
The system SHALL allow contractors to manage booking status.

#### Scenario: Contractor advances booking status
**Given** a contractor views a CONFIRMED booking
**When** the contractor clicks "Avanzar a EN CAMINO"
**Then** the system updates booking status to ON_ROUTE
**And** creates a BookingStateHistory record
**And** refreshes the UI to show new status

#### Scenario: Contractor attempts invalid transition
**Given** a booking is in PENDING_PAYMENT status
**When** the contractor attempts to change to IN_PROGRESS
**Then** the system returns a 400 Bad Request error
**And** displays "Transición de estado no válida"

### Requirement: BKF-006 - Booking State Machine
The system SHALL enforce valid state transitions.

#### Scenario: Valid transitions from PENDING_PAYMENT
**Given** a booking is in PENDING_PAYMENT status
**Then** the only valid transitions are:
  - CONFIRMED (after payment succeeds)
  - CANCELLED (by client or system)

#### Scenario: Valid transitions from CONFIRMED
**Given** a booking is in CONFIRMED status
**Then** the valid transitions are:
  - ON_ROUTE (contractor starts traveling)
  - CANCELLED (by client or contractor)

#### Scenario: Valid transitions from ON_ROUTE
**Given** a booking is in ON_ROUTE status
**Then** the valid transitions are:
  - ON_SITE (contractor arrived)
  - CANCELLED (exceptional circumstances)

#### Scenario: Valid transitions from ON_SITE
**Given** a booking is in ON_SITE status
**Then** the valid transitions are:
  - IN_PROGRESS (service started)
  - CANCELLED (exceptional circumstances)

#### Scenario: Valid transitions from IN_PROGRESS
**Given** a booking is in IN_PROGRESS status
**Then** the valid transitions are:
  - COMPLETED (service finished)
  - DISPUTED (issue reported)

#### Scenario: Valid transitions from COMPLETED
**Given** a booking is in COMPLETED status
**Then** the only valid transition is:
  - DISPUTED (post-service issue)

#### Scenario: CANCELLED is terminal
**Given** a booking is in CANCELLED status
**Then** no further transitions are allowed

### Requirement: BKF-007 - Booking State History
The system SHALL maintain an audit trail of all state changes.

#### Scenario: State change is recorded
**Given** a booking transitions from CONFIRMED to ON_ROUTE
**When** the transition completes
**Then** a BookingStateHistory record is created with:
  - bookingId: the booking ID
  - fromState: CONFIRMED
  - toState: ON_ROUTE
  - changedBy: the user who triggered the change
  - notes: optional description
  - createdAt: timestamp of change

## Data Model

### Booking Table
Uses existing `Booking` table with fields:
- id, serviceId, clientId, contractorId, availabilityId
- status (BookingStatus enum)
- scheduledDate, address, notes
- basePrice, finalPrice, anticipoAmount, liquidacionAmount
- comisionAmount, contractorPayoutAmount
- createdAt, updatedAt

### BookingStateHistory Table
Uses existing `BookingStateHistory` table with fields:
- id, bookingId, fromState, toState
- changedBy (userId), notes
- createdAt

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/bookings | Create a new booking | CLIENT |
| GET | /api/bookings/me | List user's bookings | CLIENT, CONTRACTOR |
| GET | /api/bookings/[id] | Get booking detail | Owner |
| PATCH | /api/bookings/[id]/status | Update booking status | CONTRACTOR |

## Business Rules

- **BR-BOOK-001**: Only one booking can exist for a given availability slot
- **BR-BOOK-002**: Client cannot book their own services
- **BR-BOOK-003**: Booking can only be created for ACTIVE services
- **BR-BOOK-004**: Pricing is calculated at booking creation and locked
- **BR-BOOK-005**: State transitions follow the defined state machine

## Security Considerations

- Booking creation requires CLIENT role
- Booking status updates require CONTRACTOR role and ownership
- Booking detail access requires ownership (client or contractor)
- All state changes are logged in BookingStateHistory
