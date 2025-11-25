# Service Search Specification Delta

**Capability:** service-search
**Status:** Draft
**Related Change:** 2025-11-24-service-search-booking-demo

## Purpose

Enable clients to discover and browse services offered by contractors through a search interface with filtering capabilities.

## ADDED Requirements

### Requirement: SSR-001 - Service Search Page
The system SHALL provide a public search page at `/search` that allows users to discover available services.

#### Scenario: User searches for services by category
**Given** a client navigates to `/search`
**And** there are active services in the database
**When** the client selects a category filter
**Then** the system displays only services matching that category
**And** results are paginated with 10 items per page

#### Scenario: User searches for services by text
**Given** a client is on the `/search` page
**When** the client enters "plomería" in the search field
**Then** the system displays services with titles or descriptions containing "plomería"
**And** the search is case-insensitive

#### Scenario: User filters by price range
**Given** a client is on the `/search` page
**When** the client sets minPrice=100 and maxPrice=500
**Then** the system displays only services within that price range

### Requirement: SSR-002 - Service Detail Page
The system SHALL provide a detail page at `/services/[id]` showing complete service information.

#### Scenario: Client views service details
**Given** an active service with ID "svc-123" exists
**When** a client navigates to `/services/svc-123`
**Then** the system displays:
  - Service title and description
  - Image gallery
  - Base price and duration
  - Category
  - Contractor profile (name, avatar, business name)
  - Available time slots for the next 7 days
  - "Reservar" button (requires authentication)

#### Scenario: Client views unavailable service
**Given** a service with status PAUSED or DRAFT exists
**When** a client attempts to view the service detail
**Then** the system returns a 404 error
**And** displays "Servicio no disponible" message

### Requirement: SSR-003 - Available Time Slots
The system SHALL display contractor's available time slots for booking.

#### Scenario: Client views available slots
**Given** a contractor has weekly availability rules configured
**And** no existing bookings conflict
**When** a client views the service detail page
**Then** the system displays available slots grouped by date
**And** each slot shows start time and duration

#### Scenario: Slot already booked is not shown
**Given** a slot has been booked by another client
**When** a client views available slots for that service
**Then** the booked slot is not displayed in the list

## MODIFIED Requirements

### Requirement: Dashboard-001 - Enhanced Search Tile
The client dashboard SHALL prominently feature the service search functionality.

#### Scenario: Client sees enhanced search tile
**Given** a client views their dashboard at `/clients/dashboard`
**Then** the "Buscar Servicios" tile is displayed with:
  - Larger size (spans 2 columns on desktop)
  - Gradient background (emerald to teal)
  - Prominent call-to-action text
  - Link to `/search`

## Data Model

Uses existing tables:
- `Service` - Service listings
- `ServiceCategory` - Category hierarchy
- `ServiceImage` - Service photos
- `Availability` - Time slots
- `User` - Contractor information
- `ContractorProfile` - Business details

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/services | List active services with filters | Public |
| GET | /api/services/[id] | Get service detail | Public |
| GET | /api/services/[id]/slots | Get available time slots | Public |
| GET | /api/categories | List service categories | Public |

## Security Considerations

- Service search is public (no authentication required)
- Only ACTIVE services with visibilityStatus=ACTIVE are searchable
- Contractor contact information is limited to public profile data
- Rate limiting on search endpoint (100 req/min per IP)
