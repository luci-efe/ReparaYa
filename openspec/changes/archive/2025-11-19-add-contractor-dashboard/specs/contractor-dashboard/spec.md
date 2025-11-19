# contractor-dashboard Specification Delta

## ADDED Requirements

### Requirement: Contractor Dashboard Access

The system SHALL provide a dedicated dashboard interface for users with `role=CONTRACTOR` to access key contractor features and business information.

#### Scenario: Contractor accesses dashboard

- **WHEN** an authenticated user with `role=CONTRACTOR` navigates to `/contractors/dashboard`
- **THEN** the system SHALL render the contractor dashboard with verification status, quick access tiles, and placeholder sections
- **AND** the page SHALL load within 1.5 seconds on average network conditions

#### Scenario: Non-contractor cannot access contractor dashboard

- **WHEN** an authenticated user with `role=CLIENT` or `role=ADMIN` navigates to `/contractors/dashboard`
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** redirect the user to their appropriate dashboard

#### Scenario: Unauthenticated user redirected to login

- **WHEN** an unauthenticated user navigates to `/contractors/dashboard`
- **THEN** the system SHALL redirect to `/sign-in` with return URL parameter
- **AND** redirect back to dashboard after successful authentication

### Requirement: Verification Status Display

The system SHALL display the contractor's verification status (DRAFT or ACTIVE) prominently on the dashboard.

#### Scenario: DRAFT contractor sees pending status

- **WHEN** a contractor with `verified: false` views the dashboard
- **THEN** the system SHALL display a yellow badge with "⏱ En Revisión"
- **AND** show message "Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado."

#### Scenario: ACTIVE contractor sees verified status

- **WHEN** a contractor with `verified: true` views the dashboard
- **THEN** the system SHALL display a green badge with "✓ Verificado"
- **AND** show message "Tu perfil ha sido aprobado. Ya puedes publicar servicios."

### Requirement: Service Area Configuration Prompt

The system SHALL prompt contractors to configure their service area if not yet set.

#### Scenario: Show CTA when service area missing

- **WHEN** a contractor views the dashboard and has not configured their service area
- **THEN** the system SHALL display a Call-to-Action widget with message "Configura tu zona de operación para recibir solicitudes"
- **AND** provide a "Configurar →" button linking to service area configuration

#### Scenario: Hide CTA when service area configured

- **WHEN** a contractor views the dashboard and has already configured their service area
- **THEN** the system SHALL NOT display the service area CTA widget

### Requirement: Quick Access Navigation

The system SHALL provide quick access tiles to key contractor features.

#### Scenario: Display navigation tiles

- **WHEN** a contractor views the dashboard
- **THEN** the system SHALL display quick access tiles for:
  - "Mis Servicios" (link to services management)
  - "Disponibilidad" (link to calendar/availability)
  - "Mensajes" (link to messaging interface)
- **AND** each tile SHALL have an icon, title, and brief description

#### Scenario: Tiles navigate to correct routes

- **WHEN** a contractor clicks on a quick access tile
- **THEN** the system SHALL navigate to the corresponding route
- **AND** for placeholder routes, SHALL display a "Coming soon" message or placeholder page

### Requirement: Dashboard Shell and Navigation

The system SHALL provide a responsive dashboard layout with sidebar navigation on desktop and adaptive navigation on mobile.

#### Scenario: Desktop layout with sidebar

- **WHEN** a contractor views the dashboard on a device with screen width ≥ 1024px
- **THEN** the system SHALL display a fixed sidebar with navigation links
- **AND** the main content area SHALL be positioned to the right of the sidebar

#### Scenario: Tablet layout with collapsible sidebar

- **WHEN** a contractor views the dashboard on a device with screen width between 640px and 1024px
- **THEN** the system SHALL display a collapsible sidebar
- **AND** provide a hamburger menu icon to toggle sidebar visibility

#### Scenario: Mobile layout with bottom navigation

- **WHEN** a contractor views the dashboard on a device with screen width < 640px
- **THEN** the system SHALL hide the sidebar by default
- **AND** display a bottom navigation bar with key sections (Dashboard, Profile, Services, Messages)

### Requirement: Placeholder Sections

The system SHALL display placeholder sections for future contractor features.

#### Scenario: Display availability summary placeholder

- **WHEN** a contractor views the dashboard
- **THEN** the system SHALL display an "Upcoming Availability Blocks" section
- **AND** show placeholder message "No tienes bloqueos programados"

#### Scenario: Display metrics overview placeholder

- **WHEN** a contractor views the dashboard
- **THEN** the system SHALL display a "Metrics Overview" section with counters:
  - "Servicios Activos: 0"
  - "Reservas Pendientes: 0"
  - "Mensajes Sin Leer: 0"
  - "Calificación Promedio: N/A"

### Requirement: Loading and Error States

The system SHALL handle loading and error states gracefully on the contractor dashboard.

#### Scenario: Display loading state

- **WHEN** the dashboard is fetching contractor profile data
- **THEN** the system SHALL display skeleton loaders or a loading spinner
- **AND** disable interactive elements until data is loaded

#### Scenario: Display error state

- **WHEN** the dashboard fails to fetch contractor profile data
- **THEN** the system SHALL display an error message with retry option
- **AND** suggest contacting support if the error persists

#### Scenario: Display empty state

- **WHEN** a new contractor with no data views the dashboard
- **THEN** the system SHALL display an empty state message
- **AND** guide the contractor to complete their profile or create their first service

## ADDED Non-Functional Requirements

### Requirement: Accessibility (WCAG A/AA)

The dashboard SHALL comply with WCAG 2.1 Level A and AA accessibility standards.

#### Scenario: Keyboard navigation

- **WHEN** a contractor uses only keyboard to navigate the dashboard
- **THEN** all interactive elements SHALL be reachable via Tab key
- **AND** focus indicators SHALL be clearly visible (2px blue ring)
- **AND** Enter/Space keys SHALL activate buttons and links

#### Scenario: Screen reader support

- **WHEN** a contractor uses a screen reader (NVDA, JAWS, VoiceOver)
- **THEN** all navigation elements SHALL have proper ARIA labels
- **AND** semantic HTML elements SHALL be used (`<nav>`, `<main>`, `<aside>`, `<header>`)
- **AND** status messages SHALL be announced with `aria-live="polite"` or `role="status"`

#### Scenario: Skip to content link

- **WHEN** a contractor uses keyboard navigation
- **THEN** the first focusable element SHALL be a "Skip to main content" link
- **AND** activating the link SHALL move focus to the main content area

### Requirement: Responsive Design

The dashboard SHALL be fully responsive and functional on mobile, tablet, and desktop devices.

#### Scenario: Mobile rendering (≤640px)

- **WHEN** the dashboard is viewed on a device with screen width ≤ 640px
- **THEN** all sections SHALL stack vertically in a single column
- **AND** navigation SHALL be accessible via bottom navigation bar
- **AND** all interactive elements SHALL be touch-friendly (min 44x44px tap targets)

#### Scenario: Tablet rendering (640-1024px)

- **WHEN** the dashboard is viewed on a device with screen width between 640px and 1024px
- **THEN** quick access tiles SHALL be displayed in a 2-column grid
- **AND** sidebar SHALL be collapsible with hamburger menu

#### Scenario: Desktop rendering (≥1024px)

- **WHEN** the dashboard is viewed on a device with screen width ≥ 1024px
- **THEN** quick access tiles SHALL be displayed in a 3-column grid
- **AND** sidebar SHALL be fixed and always visible

### Requirement: Performance

The dashboard SHALL meet performance targets for initial load and interactivity.

#### Scenario: Initial load performance

- **WHEN** a contractor navigates to the dashboard
- **THEN** the page SHALL complete initial render within 1.5 seconds on average network (3G)
- **AND** First Contentful Paint (FCP) SHALL occur within 1.0 second
- **AND** Time to Interactive (TTI) SHALL be within 2.0 seconds

#### Scenario: Bundle size impact

- **WHEN** the dashboard is built for production
- **THEN** the JavaScript bundle increase SHALL be ≤ 20KB (gzipped)
- **AND** critical CSS SHALL be inlined for above-the-fold content

### Requirement: Maintainability and Extensibility

The dashboard SHALL be designed for easy extension and maintenance.

#### Scenario: Component modularity

- **WHEN** a developer needs to add a new dashboard section
- **THEN** they SHALL be able to create a new component in `src/components/contractors/`
- **AND** import and render it in the dashboard without modifying existing components

#### Scenario: Placeholder replacement

- **WHEN** a future feature (services CRUD, availability, messaging) is implemented
- **THEN** the corresponding placeholder component SHALL be replaceable without breaking changes
- **AND** no modifications to the dashboard shell SHALL be required

## Testing Requirements

All requirements SHALL be validated by the test cases defined in `/docs/md/STP-ReparaYa.md` section 4.1.X (Contractor Dashboard).

**Test coverage targets:**
- Unit tests: ≥ 70% coverage for all new components
- Integration tests: All access guard scenarios (CONTRACTOR allowed, CLIENT/ADMIN blocked)
- E2E tests: Manual execution of critical user flows (TC-CDASH-001 to TC-CDASH-007)
- Accessibility tests: Automated axe-core checks + manual keyboard/screen reader testing
- Responsive tests: Manual testing on mobile, tablet, desktop viewports

## Future Enhancements

The following enhancements are OUT OF SCOPE for this change but documented as extension points:

1. **Services CRUD**: Replace "Mis Servicios" placeholder with full service management interface
2. **Availability Calendar**: Replace AvailabilitySummary with interactive calendar
3. **Messaging Interface**: Replace "Mensajes" placeholder with real-time messaging UI
4. **Analytics Dashboard**: Replace MetricsOverview with real data from bookings, reviews, earnings
5. **Service Area Configuration**: Implement service area wizard and link from ServiceAreaCTA
6. **Onboarding Checklist**: Add progress widget to guide new contractors through setup steps

These enhancements will be implemented in separate OpenSpec changes with their own specs and testing plans.
