## ADDED Requirements

### Requirement: Client Bookings List Page

The system SHALL provide a page at `/clients/bookings` for clients to view their booking history.

#### Scenario: Page loads with booking list
- **WHEN** a CLIENT navigates to `/clients/bookings`
- **THEN** the page SHALL display within ClientDashboardShell layout
- **AND** show status filter tabs: Activas, Completadas, Canceladas
- **AND** display bookings matching the selected filter

#### Scenario: Empty state displayed
- **WHEN** client has no bookings
- **THEN** the page SHALL display "No tienes reservas"
- **AND** provide a CTA button to "Buscar Servicios"

#### Scenario: Booking card displays key information
- **WHEN** bookings are displayed
- **THEN** each booking card SHALL show: service title, contractor business name, scheduled date/time, status badge, price

#### Scenario: Click booking navigates to detail
- **WHEN** client clicks a booking card
- **THEN** the system SHALL navigate to `/clients/bookings/[id]`

---

### Requirement: Client Booking Detail Page

The system SHALL provide a page at `/clients/bookings/[id]` for viewing booking details and taking actions.

#### Scenario: Page loads with booking details
- **WHEN** a CLIENT navigates to `/clients/bookings/[id]`
- **AND** the booking belongs to them
- **THEN** the page SHALL display:
  - Service details (title, description, images if available)
  - Contractor information (business name, rating)
  - Scheduled date and time
  - Service address
  - Booking notes
  - Current status with visual indicator
  - Price breakdown (base, anticipo, total)
  - State history timeline

#### Scenario: Pending payment shows payment button
- **WHEN** viewing a booking in PENDING_PAYMENT status
- **THEN** a "Pagar Anticipo" button SHALL be displayed
- **AND** clicking it SHALL initiate payment flow (mock in demo mode)

#### Scenario: Confirmed status shows waiting message
- **WHEN** viewing a booking in CONFIRMED status
- **THEN** a message SHALL display "Tu reserva está confirmada. El contratista llegará el [fecha] a las [hora]"

#### Scenario: Waiting for contractor confirmation shows blocking message
- **WHEN** viewing a booking in PENDING_PAYMENT status
- **AND** payment has not been made
- **THEN** the page SHALL show a blocking message explaining the payment requirement

#### Scenario: Completed booking shows rating prompt
- **WHEN** viewing a booking in COMPLETED status
- **AND** no rating has been submitted
- **THEN** a "Calificar Servicio" button SHALL be displayed

#### Scenario: Unauthorized access redirects
- **WHEN** a client navigates to a booking that doesn't belong to them
- **THEN** the system SHALL display 404 or redirect to bookings list

---

### Requirement: Client Dashboard Booking Integration

The system SHALL update the client dashboard to display real booking data.

#### Scenario: UpcomingBookings widget shows real data
- **WHEN** client views their dashboard
- **THEN** the "Próximas Reservas" widget SHALL fetch and display actual bookings
- **AND** show up to 3 bookings with status PENDING_PAYMENT, CONFIRMED, or ON_SITE
- **AND** order by scheduledDate ascending

#### Scenario: Metrics show booking counts
- **WHEN** client views their dashboard
- **THEN** the "Reservas Activas" metric SHALL show count of non-completed bookings

---

### Requirement: Client Booking Status Display

The system SHALL provide clear visual indicators of booking status for clients.

#### Scenario: Status badge colors
- **WHEN** booking status is displayed
- **THEN** status badges SHALL use consistent colors:
  - PENDING_PAYMENT: Yellow/amber
  - CONFIRMED: Blue
  - ON_SITE: Green
  - COMPLETED: Gray/success
  - CANCELLED: Red
  - DISPUTED: Orange

#### Scenario: Status descriptions in Spanish
- **WHEN** booking status is displayed
- **THEN** status labels SHALL be in Spanish:
  - PENDING_PAYMENT: "Pendiente de pago"
  - CONFIRMED: "Confirmada"
  - ON_SITE: "Contratista en sitio"
  - COMPLETED: "Completada"
  - CANCELLED: "Cancelada"
  - DISPUTED: "En disputa"

---

### Requirement: Demo Mode Payment Flow

The system SHALL support a mock payment flow for demo purposes.

#### Scenario: Demo payment confirmation
- **WHEN** client clicks "Pagar Anticipo" button in demo mode
- **THEN** a confirmation dialog SHALL appear asking to confirm mock payment
- **AND** upon confirmation, the booking status SHALL advance to CONFIRMED
- **AND** a success message SHALL display "Pago simulado exitoso"

#### Scenario: Payment button disabled during processing
- **WHEN** payment is being processed
- **THEN** the button SHALL be disabled
- **AND** show a loading indicator
