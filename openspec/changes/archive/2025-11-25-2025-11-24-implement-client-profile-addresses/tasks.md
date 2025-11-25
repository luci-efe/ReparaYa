# Implementation Tasks

## 1. Shared Foundation

- [ ] 1.1 Create client-side Zod validation schemas mirroring backend (`src/lib/validations/user.ts`)
  - `updateProfileSchema`: firstName, lastName, phone (10 digits)
  - `createAddressSchema`: addressLine1 (5-200), city, state (2-100), postalCode (5 digits), isDefault
  - `updateAddressSchema`: all fields optional
- [ ] 1.2 Create shared form components for consistent UX
  - `FormField` component with label, input, error message
  - `FormButton` with loading state
  - `Modal` component for address forms
  - `ConfirmDialog` for delete confirmation

## 2. Client Profile Page (`/clients/profile`)

- [ ] 2.1 Create `ProfileForm` component (`src/components/clients/ProfileForm.tsx`)
  - Display fields: email (read-only), firstName, lastName, phone, avatar (read-only)
  - Integrate Zod validation
  - Loading state (skeleton loaders)
  - Error state with retry
  - Success toast on save
- [ ] 2.2 Create API hook for profile operations (`src/hooks/useProfile.ts` or inline)
  - `GET /api/users/me` for fetching profile
  - `PATCH /api/users/me` for updating profile
  - Handle loading, error, success states
- [ ] 2.3 Update `apps/web/app/clients/profile/page.tsx`
  - Replace placeholder with `ProfileForm` component
  - Pass user context from `requireRole('CLIENT')`
  - Server-side data fetching or client-side fetch on mount
- [ ] 2.4 Write unit tests for ProfileForm (`src/components/clients/__tests__/ProfileForm.test.tsx`)
  - Test form rendering with mock data
  - Test validation error display
  - Test successful submission
  - Test error handling

## 3. Client Addresses Page (`/clients/addresses`)

- [ ] 3.1 Create `AddressCard` component (`src/components/clients/AddressCard.tsx`)
  - Display address fields
  - Default badge ("Predeterminada")
  - Edit, Delete, Set Default action buttons
  - Responsive design (card layout)
- [ ] 3.2 Create `AddressList` component (`src/components/clients/AddressList.tsx`)
  - Grid/list of AddressCards
  - Empty state UI
  - Loading state (skeleton cards)
  - Error state with retry
  - "Agregar dirección" button
- [ ] 3.3 Create `AddressForm` component (`src/components/clients/AddressForm.tsx`)
  - Create/Edit mode (controlled by props)
  - Fields: addressLine1, addressLine2 (optional), city, state, postalCode, isDefault checkbox
  - Zod validation integration
  - Loading state on submit
  - Error handling
- [ ] 3.4 Create `AddressModal` wrapper (`src/components/clients/AddressModal.tsx`)
  - Modal/drawer for AddressForm
  - Handle open/close states
  - Focus trap and keyboard handling (Escape to close)
- [ ] 3.5 Create API hooks for address operations (`src/hooks/useAddresses.ts` or inline)
  - Fetch addresses from profile endpoint
  - `POST /api/users/me/addresses` for create
  - `PATCH /api/users/me/addresses/:id` for update
  - `DELETE /api/users/me/addresses/:id` for delete
  - Handle loading, error, success states
  - Refresh list after mutations
- [ ] 3.6 Create `DeleteAddressDialog` component (`src/components/clients/DeleteAddressDialog.tsx`)
  - Confirmation dialog
  - Loading state during deletion
  - Error handling
- [ ] 3.7 Update `apps/web/app/clients/addresses/page.tsx`
  - Replace placeholder with AddressList component
  - Integrate with AddressModal for create/edit
  - Handle delete confirmation flow
- [ ] 3.8 Write unit tests for address components
  - `AddressCard.test.tsx` - rendering, actions
  - `AddressList.test.tsx` - list, empty state, loading
  - `AddressForm.test.tsx` - validation, submission

## 4. Dashboard Integration

- [ ] 4.1 Update `ClientMetricsOverview` to fetch real address count
  - Modify to accept addresses prop or fetch internally
  - Display actual count instead of hardcoded 0
- [ ] 4.2 Update `WelcomeWidget` to use real address count
  - Already shows "Agregar dirección principal" link when count is 0
  - Verify integration with real data

## 5. Testing & Documentation

- [ ] 5.1 Update `docs/md/STP-ReparaYa.md` with new test cases
  - Add section 4.1.X for Client Profile UI tests (TC-PROFILE-*)
  - Add section 4.1.Y for Client Addresses UI tests (TC-ADDR-*)
  - Document test procedures
- [ ] 5.2 Run all existing tests to ensure no regressions
  - `npm run test` in apps/web
  - Verify backend tests still pass
- [ ] 5.3 Manual E2E testing
  - Test full profile edit flow
  - Test full address CRUD flow
  - Test business rules (BR-001, BR-002)
  - Test responsive design on mobile
  - Test keyboard accessibility

## 6. Final Verification

- [ ] 6.1 Code review checklist
  - TypeScript strict mode compliance
  - No `any` types
  - Proper error handling
  - Loading states implemented
  - Accessible (basic WCAG 2.1 AA)
- [ ] 6.2 Build verification
  - `npm run build` succeeds
  - `npm run lint` passes
  - No console errors
- [ ] 6.3 Cross-browser testing (Chrome, Firefox, Safari)
- [ ] 6.4 Create PR to `dev` branch

---

## Dependencies

| Task | Depends On |
|------|------------|
| 2.x (Profile) | 1.1, 1.2 |
| 3.x (Addresses) | 1.1, 1.2 |
| 4.x (Dashboard) | 3.x |
| 5.x (Testing) | 2.x, 3.x, 4.x |
| 6.x (Final) | All above |

## Parallelizable Work

- Tasks 2.x and 3.x can be developed in parallel after 1.x is complete
- Tests (2.4, 3.8) can be written alongside component development
- Documentation (5.1) can be started early
