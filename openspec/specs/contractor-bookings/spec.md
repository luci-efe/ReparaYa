# contractor-bookings Specification

## Purpose
TBD - created by archiving change 2025-11-24-implement-contractor-booking-management. Update Purpose after archive.
## Requirements
### Requirement: Contractor Bookings List Page

The system SHALL provide a page at `/contractors/bookings` for contractors to view and manage their bookings.

#### Scenario: Page loads with booking list
- **WHEN** a CONTRACTOR navigates to `/contractors/bookings`
- **THEN** the page SHALL display within DashboardShell layout
- **AND** show status filter tabs: Pendientes, Activas, Completadas, Canceladas
- **AND** display bookings matching the selected filter

#### Scenario: Empty state displayed
- **WHEN** contractor has no bookings matching the selected filter
- **THEN** the page SHALL display an appropriate empty state message
- **AND** suggest browsing services or waiting for client bookings

#### Scenario: Booking card displays key information
- **WHEN** bookings are displayed
- **THEN** each booking card SHALL show: service title, client name, scheduled date/time, status badge, address snippet

#### Scenario: Click booking navigates to detail
- **WHEN** contractor clicks a booking card
- **THEN** the system SHALL navigate to `/contractors/bookings/[id]`

---

### Requirement: Contractor Booking Detail Page

The system SHALL provide a page at `/contractors/bookings/[id]` for viewing and managing a single booking.

#### Scenario: Page loads with booking details
- **WHEN** a CONTRACTOR navigates to `/contractors/bookings/[id]`
- **AND** the booking belongs to them
- **THEN** the page SHALL display full booking information:
  - Service details (title, description, price)
  - Client information (name, phone if available)
  - Scheduled date and time
  - Service address
  - Booking notes
  - Current status with visual indicator
  - State history timeline

#### Scenario: State advancement actions displayed
- **WHEN** viewing a booking in PENDING_PAYMENT status
- **THEN** a "Confirmar Reserva" button SHALL be displayed (for demo mode)

#### Scenario: Contractor can advance to ON_SITE
- **WHEN** viewing a booking in CONFIRMED status
- **AND** contractor clicks "Llegué al sitio" button
- **THEN** the booking status SHALL advance to ON_SITE
- **AND** the UI SHALL update to reflect the new state

#### Scenario: Contractor can complete booking
- **WHEN** viewing a booking in ON_SITE status
- **AND** contractor clicks "Marcar como completado" button
- **THEN** the booking status SHALL advance to COMPLETED
- **AND** a success message SHALL be displayed

#### Scenario: Unauthorized access redirects
- **WHEN** a contractor navigates to a booking that doesn't belong to them
- **THEN** the system SHALL display 404 or redirect to bookings list

---

### Requirement: Contractor Dashboard Booking Widget

The system SHALL display upcoming bookings on the contractor dashboard.

#### Scenario: Widget shows upcoming confirmed bookings
- **WHEN** contractor views their dashboard
- **THEN** the dashboard SHALL display an "Próximas Reservas" widget
- **AND** show up to 3 bookings with status CONFIRMED, ordered by scheduledDate ascending

#### Scenario: Widget empty state
- **WHEN** contractor has no upcoming confirmed bookings
- **THEN** the widget SHALL display "No tienes reservas próximas"
- **AND** suggest creating availability slots

#### Scenario: Widget links to full list
- **WHEN** widget is displayed
- **THEN** a "Ver todas" link SHALL navigate to `/contractors/bookings`

---

### Requirement: Contractor Metrics Update

The system SHALL update the MetricsOverview component to show real booking data.

#### Scenario: Metrics show booking counts
- **WHEN** contractor views their dashboard
- **THEN** the MetricsOverview SHALL display:
  - Reservas Activas (count of CONFIRMED + ON_SITE bookings)
  - Reservas Completadas (count of COMPLETED bookings this month)
  - Ingresos del Mes (sum of finalPrice for COMPLETED bookings this month)

---

### Requirement: Booking State Timeline Component

The system SHALL provide a visual timeline of booking state changes.

#### Scenario: Timeline displays state history
- **WHEN** viewing a booking detail page
- **THEN** a timeline component SHALL display all state transitions
- **AND** each entry shows: from state, to state, timestamp, changed by (user name)

#### Scenario: Current state highlighted
- **WHEN** timeline is displayed
- **THEN** the current state SHALL be visually highlighted
- **AND** future states SHALL appear grayed out

