# Client Addresses UI Specification

## ADDED Requirements

### Requirement: Address List Display
The system SHALL display all addresses belonging to the authenticated client on the "Direcciones" page.

#### Scenario: Client views address list
- **WHEN** client navigates to `/clients/addresses`
- **THEN** the system fetches addresses from `GET /api/users/me`
- **AND** displays all addresses as cards
- **AND** highlights the default address with a badge "Predeterminada"

#### Scenario: Address card information
- **WHEN** addresses are displayed
- **THEN** each card shows:
  - addressLine1
  - addressLine2 (if present)
  - city, state, postalCode
  - "Predeterminada" badge (if isDefault: true)
  - Edit button
  - Delete button (if more than one address exists)
  - "Establecer como predeterminada" button (if not default)

#### Scenario: Empty state - no addresses
- **WHEN** client has zero addresses
- **THEN** the system displays empty state message: "No tienes direcciones guardadas"
- **AND** shows prominent "Agregar dirección" button
- **AND** displays helpful text: "Agrega una dirección para poder solicitar servicios"

#### Scenario: Loading state
- **WHEN** addresses are being fetched
- **THEN** the system displays skeleton cards
- **AND** action buttons are disabled

#### Scenario: Error state
- **WHEN** address fetch fails
- **THEN** the system displays error message
- **AND** provides "Reintentar" button

---

### Requirement: Create Address
The system SHALL allow clients to create new addresses with validation.

#### Scenario: Open create address form
- **WHEN** client clicks "Agregar dirección"
- **THEN** the system displays address form modal/drawer
- **AND** all fields are empty
- **AND** "isDefault" checkbox is available

#### Scenario: Create address - valid data
- **WHEN** client fills all required fields correctly:
  - addressLine1 (5-200 characters)
  - city (2-100 characters)
  - state (2-100 characters)
  - postalCode (exactly 5 digits)
- **AND** clicks "Guardar"
- **THEN** the system calls `POST /api/users/me/addresses`
- **AND** displays success message
- **AND** closes the form
- **AND** refreshes the address list

#### Scenario: Create address - as default (BR-002)
- **WHEN** client checks "Establecer como predeterminada"
- **AND** submits the form
- **THEN** the new address becomes the default
- **AND** previous default address loses its default status
- **AND** UI reflects the change immediately

#### Scenario: Address validation - postal code
- **WHEN** client enters postal code with less or more than 5 digits
- **THEN** field shows error state
- **AND** displays message: "El código postal debe tener exactamente 5 dígitos"

#### Scenario: Address validation - addressLine1 too short
- **WHEN** client enters addressLine1 with less than 5 characters
- **THEN** field shows error state
- **AND** displays message: "La dirección debe tener al menos 5 caracteres"

#### Scenario: Address validation - required fields
- **WHEN** client leaves addressLine1, city, state, or postalCode empty
- **THEN** respective field shows error state
- **AND** displays message: "Este campo es requerido"

---

### Requirement: Edit Address
The system SHALL allow clients to edit their existing addresses.

#### Scenario: Open edit address form
- **WHEN** client clicks "Editar" on an address card
- **THEN** the system displays address form modal/drawer
- **AND** fields are pre-populated with current values
- **AND** form title shows "Editar dirección"

#### Scenario: Edit address - valid changes
- **WHEN** client modifies address fields
- **AND** all validations pass
- **AND** clicks "Guardar cambios"
- **THEN** the system calls `PATCH /api/users/me/addresses/:id`
- **AND** displays success message
- **AND** closes the form
- **AND** refreshes the address list

#### Scenario: Edit address - set as default (BR-002)
- **WHEN** client checks "Establecer como predeterminada" during edit
- **AND** submits the form
- **THEN** this address becomes the default
- **AND** previous default loses its default status

---

### Requirement: Delete Address
The system SHALL allow clients to delete addresses with proper constraints.

#### Scenario: Delete address - confirmation
- **WHEN** client clicks "Eliminar" on an address card
- **THEN** the system shows confirmation dialog
- **AND** message: "¿Estás seguro de que deseas eliminar esta dirección?"
- **AND** provides "Cancelar" and "Eliminar" buttons

#### Scenario: Delete address - success
- **WHEN** client confirms deletion
- **AND** client has more than one address
- **THEN** the system calls `DELETE /api/users/me/addresses/:id`
- **AND** displays success message
- **AND** removes the address from the list

#### Scenario: Delete address - prevented (BR-001)
- **WHEN** client has only one address
- **THEN** the delete button is hidden or disabled
- **AND** tooltip explains: "No puedes eliminar tu única dirección"

#### Scenario: Delete address - error handling
- **WHEN** deletion fails due to server error
- **THEN** the system displays error message
- **AND** address remains in the list
- **AND** client can retry

---

### Requirement: Set Default Address
The system SHALL allow clients to set any address as their default.

#### Scenario: Set default via quick action
- **WHEN** client clicks "Establecer como predeterminada" on a non-default address
- **THEN** the system calls `PATCH /api/users/me/addresses/:id` with `{ isDefault: true }`
- **AND** displays success message
- **AND** updates the UI to reflect new default
- **AND** previous default address loses badge

#### Scenario: Default address indicator
- **WHEN** an address is the default
- **THEN** its card displays prominently "Predeterminada" badge
- **AND** "Establecer como predeterminada" button is hidden for that card

---

### Requirement: Address Responsive Design
The addresses page SHALL be responsive and usable on mobile and desktop devices.

#### Scenario: Desktop layout
- **WHEN** viewport width ≥ 768px
- **THEN** address cards display in a grid (2-3 columns)
- **AND** form modal appears centered with max-width

#### Scenario: Mobile layout
- **WHEN** viewport width < 768px
- **THEN** address cards stack vertically (1 column)
- **AND** form appears as full-screen drawer from bottom
- **AND** touch targets are at least 44x44px

---

### Requirement: Address Accessibility
The addresses page and forms SHALL meet basic WCAG 2.1 AA accessibility requirements.

#### Scenario: Form accessibility
- **WHEN** address form is open
- **THEN** focus is trapped within the modal
- **AND** Escape key closes the modal
- **AND** focus returns to trigger button on close

#### Scenario: Keyboard navigation
- **WHEN** user navigates address list with keyboard
- **THEN** each card's actions are focusable
- **AND** Enter/Space triggers the focused action

#### Scenario: Screen reader support
- **WHEN** screen reader is active
- **THEN** address list is announced as a list
- **AND** each card has meaningful label
- **AND** default status is announced
- **AND** confirmation dialogs are properly announced
