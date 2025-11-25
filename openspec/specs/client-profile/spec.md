# client-profile Specification

## Purpose
TBD - created by archiving change 2025-11-24-implement-client-profile-addresses. Update Purpose after archive.
## Requirements
### Requirement: Profile Display
The system SHALL display the authenticated client's profile information on the "Mi Perfil" page including:
- First name
- Last name
- Email (read-only, from Clerk)
- Phone number
- Avatar image (read-only, from Clerk)

#### Scenario: Client views their profile
- **WHEN** client navigates to `/clients/profile`
- **THEN** the system displays their current profile information
- **AND** email and avatar are shown as read-only fields
- **AND** firstName, lastName, and phone are shown as editable fields

#### Scenario: Profile loading state
- **WHEN** profile data is being fetched
- **THEN** the system displays skeleton loaders for each field
- **AND** form interactions are disabled

#### Scenario: Profile error state
- **WHEN** profile fetch fails
- **THEN** the system displays an error message
- **AND** provides a "Reintentar" (retry) button

---

### Requirement: Profile Edit
The system SHALL allow clients to edit their profile information with real-time validation.

#### Scenario: Client edits profile successfully
- **WHEN** client modifies firstName, lastName, or phone
- **AND** clicks "Guardar cambios"
- **AND** all validation passes
- **THEN** the system calls `PATCH /api/users/me`
- **AND** displays success toast/message
- **AND** updates the displayed profile data

#### Scenario: Phone validation - valid format
- **WHEN** client enters a 10-digit phone number
- **THEN** the field shows valid state (green border/checkmark)
- **AND** the form can be submitted

#### Scenario: Phone validation - invalid format
- **WHEN** client enters a phone number with fewer or more than 10 digits
- **THEN** the field shows error state (red border)
- **AND** displays error message: "El teléfono debe tener exactamente 10 dígitos"
- **AND** the submit button is disabled

#### Scenario: Name validation - valid
- **WHEN** client enters firstName or lastName between 1-100 characters
- **THEN** the field shows valid state

#### Scenario: Name validation - empty
- **WHEN** client clears firstName or lastName field
- **THEN** the field shows error state
- **AND** displays error message: "Este campo es requerido"

#### Scenario: Form submission loading state
- **WHEN** form is submitted and API call is in progress
- **THEN** the submit button shows loading spinner
- **AND** all form fields are disabled
- **AND** cancel/navigation is prevented

#### Scenario: Form submission error
- **WHEN** API call fails (network error, 400, 500)
- **THEN** the system displays error toast with message
- **AND** form remains editable for retry
- **AND** previously entered values are preserved

---

### Requirement: Profile Responsive Design
The profile page SHALL be responsive and accessible on mobile and desktop devices.

#### Scenario: Desktop layout
- **WHEN** viewport width ≥ 768px
- **THEN** form displays in single column with comfortable spacing
- **AND** labels appear above fields

#### Scenario: Mobile layout
- **WHEN** viewport width < 768px
- **THEN** form adapts to full-width fields
- **AND** submit button is sticky or clearly visible
- **AND** touch targets are at least 44x44px

---

### Requirement: Profile Accessibility
The profile form SHALL meet basic WCAG 2.1 AA accessibility requirements.

#### Scenario: Keyboard navigation
- **WHEN** user navigates with Tab key
- **THEN** focus moves through all interactive elements in logical order
- **AND** current focus is visually indicated

#### Scenario: Screen reader support
- **WHEN** screen reader is active
- **THEN** all form fields have associated labels
- **AND** error messages are announced
- **AND** success messages are announced

