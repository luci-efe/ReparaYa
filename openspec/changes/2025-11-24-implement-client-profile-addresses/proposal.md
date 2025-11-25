# Change: Implement Client Profile and Addresses UI

## Why

The client dashboard has placeholder pages for "Mi Perfil" and "Direcciones" that need to be implemented to allow clients to:
1. View and edit their profile information (firstName, lastName, phone, avatarUrl)
2. Manage their addresses (create, edit, delete, set as default)

The backend APIs and business logic are **already fully implemented** in the `src/modules/users/` module with complete validation, business rules (BR-001, BR-002), and test coverage. This change focuses on implementing the **frontend UI** to consume these existing APIs.

## What Changes

### Frontend (New Components)
- **Client Profile Page** (`/clients/profile`):
  - Display user profile information with edit capabilities
  - Form fields: firstName, lastName, phone
  - Avatar display (read-only, managed by Clerk)
  - Zod validation matching backend schemas

- **Client Addresses Page** (`/clients/addresses`):
  - List all user addresses with default indicator
  - Create new address modal/form
  - Edit existing address
  - Delete address (with confirmation)
  - Set address as default
  - Visual feedback for BR-001 (cannot delete last address)
  - Visual feedback for BR-002 (only one default)

### No Backend Changes
- APIs already exist: `GET/PATCH /api/users/me`, `POST/PATCH/DELETE /api/users/me/addresses/:id`
- Business rules implemented: BR-001, BR-002
- Validations: Zod schemas in place

### Integration
- Connect profile page to `GET /api/users/me` and `PATCH /api/users/me`
- Connect addresses page to address CRUD endpoints
- Update dashboard metrics to show real address count

## Impact

- **Affected specs:**
  - `client-dashboard` (MODIFIED - metrics integration)
  - NEW: `client-profile` (frontend spec for profile UI)
  - NEW: `client-addresses` (frontend spec for addresses UI)

- **Affected code:**
  - `apps/web/app/clients/profile/page.tsx` - Replace placeholder
  - `apps/web/app/clients/addresses/page.tsx` - Replace placeholder
  - `apps/web/src/components/clients/` - New form components
  - `apps/web/src/components/clients/ClientMetricsOverview.tsx` - Real data integration

## Testing Plan

### Casos de prueba a documentar en STP:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-PROFILE-001 | Cliente ve su perfil completo en Mi Perfil | E2E | Alta | RF-003 |
| TC-PROFILE-002 | Cliente edita firstName y lastName exitosamente | E2E | Alta | RF-003 |
| TC-PROFILE-003 | Cliente edita teléfono con formato válido (10 dígitos) | E2E | Alta | RF-003 |
| TC-PROFILE-004 | Validación rechaza teléfono inválido con mensaje de error | E2E | Media | RNF-001 |
| TC-PROFILE-005 | Formulario muestra loading state durante actualización | Unitaria | Media | RNF-002 |
| TC-ADDR-001 | Cliente ve lista de sus direcciones | E2E | Alta | RF-003 |
| TC-ADDR-002 | Cliente crea nueva dirección exitosamente | E2E | Alta | RF-003 |
| TC-ADDR-003 | Validación de código postal (5 dígitos) funciona | E2E | Alta | RNF-001 |
| TC-ADDR-004 | Cliente puede editar dirección existente | E2E | Media | RF-003 |
| TC-ADDR-005 | Cliente puede establecer dirección como predeterminada (BR-002) | E2E | Alta | BR-002 |
| TC-ADDR-006 | Cliente puede eliminar dirección (si tiene más de una) | E2E | Media | RF-003 |
| TC-ADDR-007 | Sistema previene eliminar única dirección (BR-001) | E2E | Alta | BR-001 |
| TC-ADDR-008 | Empty state cuando no hay direcciones | Unitaria | Media | RNF-002 |
| TC-ADDR-009 | Métricas del dashboard muestran conteo real de direcciones | Integración | Media | RF-CDASH-06 |

### Criterios de aceptación:

- Cobertura de código ≥ 70% en componentes nuevos
- Todos los casos de prueba pasan
- Formularios accesibles (WCAG 2.1 AA básico)
- Responsive design (móvil y escritorio)
- Estados de loading y error implementados
- Validación client-side con Zod (espejo del backend)

### Estrategia de implementación de tests:

**Archivos de test a crear:**
- `src/components/clients/__tests__/ProfileForm.test.tsx`
- `src/components/clients/__tests__/AddressList.test.tsx`
- `src/components/clients/__tests__/AddressForm.test.tsx`
- `tests/e2e/client-profile.spec.ts` (opcional, E2E manual aceptable)

**Mocks y fixtures:**
- Mock de fetch/API calls
- Fixtures de usuario y direcciones de prueba
- Mock de Clerk useUser hook (si necesario)

## Dependencies

- Existing backend APIs (already implemented and tested)
- TailwindCSS for styling
- Zod for client-side validation
- React Hook Form (or similar) for form management (optional)

## Risks

- **Low risk:** Backend is stable and well-tested
- **Medium risk:** Form UX needs careful design for mobile
- **Mitigation:** Follow existing dashboard component patterns
