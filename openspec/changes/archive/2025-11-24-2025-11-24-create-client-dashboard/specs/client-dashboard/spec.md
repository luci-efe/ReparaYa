# client-dashboard Specification

## Purpose

Provide a dedicated dashboard interface for users with `role=CLIENT`, allowing them to access relevant account information, bookings, messages, and settings from a central point with consistent navigation.

## ADDED Requirements

### Requirement: Client Dashboard Access (RF-CDASH-01)

The system SHALL provide a dedicated dashboard interface for users with `role=CLIENT` to access client functionalities and information.

#### Scenario: Client accesses dashboard

- **WHEN** an authenticated user with `role=CLIENT` navigates to `/clients/dashboard`
- **THEN** the system SHALL render the client dashboard with welcome widget, quick access tiles, and metrics sections
- **AND** the page SHALL load within 1.5 seconds on average network conditions

#### Scenario: Non-client cannot access client dashboard

- **WHEN** an authenticated user with `role=CONTRACTOR` or `role=ADMIN` navigates to `/clients/dashboard`
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** redirect the user to their appropriate dashboard

#### Scenario: Unauthenticated user redirected to login

- **WHEN** an unauthenticated user navigates to `/clients/dashboard`
- **THEN** the system SHALL redirect to `/sign-in` with return URL parameter
- **AND** redirect back to dashboard after successful authentication

### Requirement: Welcome Widget Display (RF-CDASH-02)

The system SHALL display a personalized welcome widget on the client dashboard.

#### Scenario: Client sees personalized welcome message

- **WHEN** a client views the dashboard
- **THEN** the system SHALL display a greeting with the user's name (firstName if available, otherwise email)
- **AND** display the user's avatar if configured
- **AND** display the count of saved addresses

#### Scenario: Client without name sees greeting with email

- **WHEN** a client without firstName configured views the dashboard
- **THEN** the system SHALL display the user's email as identifier in the greeting

### Requirement: Dashboard Layout and Shell (RF-CDASH-03)

The system SHALL provide a responsive layout with sidebar navigation on desktop and adaptive navigation on mobile.

#### Scenario: Desktop layout with sidebar

- **WHEN** a client views the dashboard on a device with screen width >= 1024px
- **THEN** the system SHALL display a fixed sidebar with navigation links
- **AND** the main content area SHALL be positioned to the right of the sidebar (ml-64)

#### Scenario: Mobile layout with slide-in sidebar

- **WHEN** a client views the dashboard on a device with screen width < 1024px
- **THEN** the system SHALL hide the sidebar by default
- **AND** display a hamburger menu button in the topbar
- **AND** the sidebar SHALL slide in from the left when the menu is clicked

#### Scenario: Sidebar closes on overlay click

- **WHEN** the mobile sidebar is open and the user clicks on the overlay
- **THEN** the system SHALL close the sidebar
- **AND** return focus to the main content

### Requirement: Quick Access Navigation (RF-CDASH-04)

The system SHALL provide quick access tiles to key client functionalities.

#### Scenario: Display navigation tiles

- **WHEN** a client views the dashboard
- **THEN** the system SHALL display quick access tiles for:
  - "Mis Reservas" (link to `/clients/bookings`)
  - "Buscar Servicios" (link to `/services` or search page)
  - "Mensajes" (link to `/clients/messages`)
- **AND** each tile SHALL have an icon, title, and brief description

#### Scenario: Tiles navigate to correct routes

- **WHEN** a client clicks on a quick access tile
- **THEN** the system SHALL navigate to the corresponding route
- **AND** for placeholder routes, SHALL display a "Coming soon" message

### Requirement: Sidebar Navigation Items (RF-CDASH-05)

The system SHALL provide sidebar navigation with client-specific items.

#### Scenario: Display client navigation items

- **WHEN** a client views the sidebar
- **THEN** the system SHALL display the following navigation items:
  - Dashboard (`/clients/dashboard`)
  - Mi Perfil (`/clients/profile`)
  - Mis Reservas (`/clients/bookings`)
  - Mensajes (`/clients/messages`)
  - Direcciones (`/clients/addresses`)
  - Configuracion (`/clients/settings`)
- **AND** each item SHALL have an icon and descriptive label

#### Scenario: Active item is highlighted

- **WHEN** a client is on a specific route (e.g., `/clients/bookings`)
- **THEN** the system SHALL visually highlight the corresponding navigation item
- **AND** apply `aria-current="page"` to the active link

### Requirement: Metrics Overview Display (RF-CDASH-06)

The system SHALL display a client metrics summary on the dashboard.

#### Scenario: Display placeholder metrics

- **WHEN** a client views the dashboard
- **THEN** the system SHALL display an "Activity Summary" section with metrics:
  - "Reservas Activas: 0"
  - "Mensajes Sin Leer: 0"
  - "Direcciones Guardadas: N" (where N is the actual address count)
  - "Calificaciones Dadas: N/A"

#### Scenario: Metrics in responsive grid

- **WHEN** a client views the metrics on desktop (>= 1024px)
- **THEN** the system SHALL display the metrics in a 4-column grid
- **WHEN** on mobile (< 640px)
- **THEN** the system SHALL display the metrics in a single column

### Requirement: Upcoming Bookings Section (RF-CDASH-07)

The system SHALL display an upcoming bookings section on the dashboard.

#### Scenario: Display empty bookings state

- **WHEN** a client with no upcoming bookings views the dashboard
- **THEN** the system SHALL display an "Upcoming Bookings" section
- **AND** display empty state message: "No tienes reservas próximas"
- **AND** display help text explaining how to create a booking

### Requirement: Loading and Error States (RF-CDASH-08)

The system SHALL handle loading and error states gracefully on the client dashboard.

#### Scenario: Display loading state

- **WHEN** the dashboard is loading user data
- **THEN** the system SHALL display skeleton loaders or a loading spinner
- **AND** disable interactive elements until data loads

#### Scenario: Display error state

- **WHEN** the dashboard fails to load user data
- **THEN** the system SHALL display an error message with retry option
- **AND** suggest contacting support if the error persists

### Requirement: Accessibility Compliance (RF-CDASH-09)

The system SHALL comply with WCAG 2.1 AA accessibility standards.

#### Scenario: Skip-to-content link

- **WHEN** a user navigates to the dashboard using keyboard
- **THEN** the system SHALL provide a "Skip to main content" link as the first focusable element
- **AND** the link SHALL be visible only when focused

#### Scenario: Keyboard navigation

- **WHEN** a user navigates the sidebar using keyboard
- **THEN** the system SHALL allow complete navigation with Tab and Enter/Space
- **AND** focusable elements SHALL have visible focus indicators
- **AND** Escape SHALL close the mobile sidebar if open

#### Scenario: Screen reader support

- **WHEN** a user with screen reader accesses the dashboard
- **THEN** the system SHALL provide appropriate ARIA landmarks (banner, navigation, main)
- **AND** each section SHALL have descriptive labels

### Requirement: Topbar with User Menu (RF-CDASH-10)

The system SHALL provide a topbar with logo and user menu.

#### Scenario: Display complete topbar

- **WHEN** a client views the dashboard
- **THEN** the system SHALL display a fixed topbar with:
  - ReparaYa logo (link to `/clients/dashboard`)
  - Hamburger menu button (visible only on mobile)
  - User menu (Clerk UserButton)

#### Scenario: Logo navigates to dashboard

- **WHEN** a client clicks on the logo
- **THEN** the system SHALL navigate to `/clients/dashboard`
