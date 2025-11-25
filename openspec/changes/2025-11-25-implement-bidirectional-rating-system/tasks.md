# Tasks: Implement Bidirectional Rating System

## Phase 1: Database Schema & Migration

### 1.1 Update Prisma Schema
- [ ] Add `ClientRating` model to `prisma/schema.prisma`
- [ ] Add `ContractorRating` model to `prisma/schema.prisma`
- [ ] Add `UserRatingStats` model to `prisma/schema.prisma`
- [ ] Add `completedAt` field to `Booking` model
- [ ] Update `User` model with new rating relations
- [ ] Update `Booking` model with `clientRating` and `contractorRating` relations
- [ ] Remove old `Rating` model (will be replaced by `ClientRating`)
- [ ] Run `npx prisma format` to validate schema

**Verification:** `npx prisma validate` passes

### 1.2 Create Migration
- [ ] Generate migration: `npx prisma migrate dev --name bidirectional_ratings`
- [ ] Verify migration SQL is correct
- [ ] Test migration rollback: `npx prisma migrate reset` (dev only)

**Verification:** Migration applies cleanly, no data loss

---

## Phase 2: Ratings Module Backend

### 2.1 Types & Validators
- [ ] Create `src/modules/ratings/types/index.ts`
  - `CreateClientRatingDTO`
  - `CreateContractorRatingDTO`
  - `RatingResponse`
  - `HiddenRatingResponse`
  - `BookingRatingsResponse`
  - `UserRatingStatsResponse`
  - `ServiceRatingsResponse`
- [ ] Create `src/modules/ratings/validators/index.ts`
  - `createClientRatingSchema` (Zod)
  - `createContractorRatingSchema` (Zod)
  - `ratingQuerySchema` (Zod)

**Verification:** TypeScript compiles without errors

### 2.2 Error Classes
- [ ] Create `src/modules/ratings/errors/index.ts`
  - `RatingNotFoundError`
  - `DuplicateRatingError`
  - `BookingNotCompletedError`
  - `RatingNotAuthorizedError`
  - `RatingVisibilityError`

**Verification:** Error classes exported correctly

### 2.3 Repositories
- [ ] Create `src/modules/ratings/repositories/clientRatingRepository.ts`
  - `create(data)` - Create client rating
  - `findByBookingId(bookingId)` - Find rating for booking
  - `findByContractorId(contractorId, pagination)` - Contractor's received ratings
  - `findByServiceId(serviceId, pagination)` - Service ratings (public)
- [ ] Create `src/modules/ratings/repositories/contractorRatingRepository.ts`
  - `create(data)` - Create contractor rating
  - `findByBookingId(bookingId)` - Find rating for booking
  - `findByClientId(clientId, pagination)` - Client's received ratings
- [ ] Create `src/modules/ratings/repositories/statsRepository.ts`
  - `upsertUserStats(userId, role)` - Recalculate user stats
  - `upsertServiceStats(serviceId)` - Recalculate service stats (reuse existing)
  - `getUserStats(userId)` - Get user rating stats
  - `getServiceStats(serviceId)` - Get service rating stats

**Verification:** Unit tests pass for all repository methods

### 2.4 Services
- [ ] Create `src/modules/ratings/services/visibilityService.ts`
  - `canSeeRating(booking, viewerId)` - Check if rating is visible
  - `calculateRevealDeadline(completedAt)` - Get 7-day deadline
  - `formatRatingForViewer(rating, canSee)` - Format with visibility rules
- [ ] Create `src/modules/ratings/services/clientRatingService.ts`
  - `create(bookingId, clientId, data)` - Create with validations
  - `getByBookingId(bookingId)` - Get rating
  - `getForContractor(contractorId, pagination)` - Contractor's received
  - `getForService(serviceId, pagination)` - Service ratings
- [ ] Create `src/modules/ratings/services/contractorRatingService.ts`
  - `create(bookingId, contractorId, data)` - Create with validations
  - `getByBookingId(bookingId)` - Get rating
  - `getForClient(clientId, pagination)` - Client's received
- [ ] Create `src/modules/ratings/services/statsService.ts`
  - `recalculateUserStats(userId, role)` - Async stats update
  - `recalculateServiceStats(serviceId)` - Async stats update
  - `getUserStats(userId)` - Get cached stats
  - `getRatingDistribution(userId, role)` - Get 1-5 distribution
- [ ] Create `src/modules/ratings/services/moderationService.ts`
  - `approve(ratingId, adminId)` - Approve rating
  - `reject(ratingId, adminId, notes)` - Reject rating
  - `getPendingRatings(pagination)` - List pending moderation

**Verification:** Unit tests pass, all service methods work correctly

### 2.5 Module Index
- [ ] Create `src/modules/ratings/index.ts` - Public API exports

**Verification:** Module exports compile and are accessible

---

## Phase 3: API Endpoints

### 3.1 Booking Ratings Endpoints
- [ ] Create `app/api/bookings/[id]/ratings/route.ts`
  - `GET` - Get ratings for booking (respects visibility)
- [ ] Create `app/api/bookings/[id]/ratings/client/route.ts`
  - `POST` - Client submits rating (requires CLIENT role)
- [ ] Create `app/api/bookings/[id]/ratings/contractor/route.ts`
  - `POST` - Contractor submits rating (requires CONTRACTOR role)

**Verification:** API integration tests pass

### 3.2 User Rating Endpoints
- [ ] Create `app/api/users/[id]/rating-stats/route.ts`
  - `GET` - Public rating stats for any user
- [ ] Create `app/api/contractors/me/ratings/route.ts`
  - `GET` - Contractor's received ratings (paginated)
- [ ] Create `app/api/clients/me/ratings/route.ts`
  - `GET` - Client's received ratings (paginated)

**Verification:** API integration tests pass

### 3.3 Service Rating Endpoints
- [ ] Update `app/api/services/[id]/ratings/route.ts` (if exists) or create
  - `GET` - Service ratings (paginated, public)

**Verification:** API integration tests pass

### 3.4 Admin Moderation Endpoints
- [ ] Create `app/api/admin/ratings/pending/route.ts`
  - `GET` - List pending moderation (paginated)
- [ ] Create `app/api/admin/ratings/[id]/moderate/route.ts`
  - `POST` - Approve or reject rating

**Verification:** API integration tests pass, admin-only access enforced

---

## Phase 4: Frontend Components

### 4.1 Rating UI Components
- [ ] Create `src/components/ratings/RatingStars.tsx`
  - Read-only star display
  - Interactive star selection variant
  - Props: `value`, `onChange`, `readonly`, `size`
- [ ] Create `src/components/ratings/RatingForm.tsx`
  - Star selection + comment textarea
  - Character counter (500 max)
  - Submit button with loading state
  - Props: `onSubmit`, `isLoading`
- [ ] Create `src/components/ratings/RatingModal.tsx`
  - Modal wrapper for RatingForm
  - Header with booking info
  - Success/error states
  - Props: `booking`, `ratingType`, `onClose`, `onSuccess`
- [ ] Create `src/components/ratings/RatingCard.tsx`
  - Display single rating with stars, comment, date
  - Hidden state display for double-blind
  - Props: `rating`, `isHidden`
- [ ] Create `src/components/ratings/RatingsList.tsx`
  - Paginated list of RatingCards
  - Empty state
  - Props: `ratings`, `pagination`, `onPageChange`
- [ ] Create `src/components/ratings/RatingPromptBanner.tsx`
  - Banner prompting to rate
  - Shows on completed bookings without rating
  - Props: `booking`, `onRateClick`
- [ ] Create `src/components/ratings/UserRatingBadge.tsx`
  - Compact rating display (stars + count)
  - Props: `average`, `count`, `size`

**Verification:** Component tests pass, Storybook stories work (if applicable)

### 4.2 Component Tests
- [ ] Create `src/components/ratings/__tests__/RatingStars.test.tsx`
- [ ] Create `src/components/ratings/__tests__/RatingForm.test.tsx`
- [ ] Create `src/components/ratings/__tests__/RatingModal.test.tsx`
- [ ] Create `src/components/ratings/__tests__/RatingCard.test.tsx`

**Verification:** All component tests pass

---

## Phase 5: Dashboard Integration

### 5.1 Client Dashboard Updates
- [ ] Update `src/components/clients/ClientMetricsOverview.tsx`
  - Replace "N/A" with actual rating stats
  - Add hook to fetch user rating stats
  - Show "(X calificaciones)" subtitle
- [ ] Create `src/hooks/useUserRatingStats.ts`
  - Fetch `/api/users/[id]/rating-stats`
  - Return `{ average, totalRatings, isLoading, error }`

**Verification:** Client dashboard shows real rating data

### 5.2 Contractor Dashboard Updates
- [ ] Update `src/components/contractors/MetricsOverview.tsx`
  - Replace "N/A" with actual rating stats
  - Use `useUserRatingStats` hook
  - Show "(X calificaciones)" subtitle

**Verification:** Contractor dashboard shows real rating data

---

## Phase 6: Bookings Integration

### 6.1 Client Bookings Page
- [ ] Update `app/clients/bookings/page.tsx`
  - Remove placeholder, implement actual booking list
  - Show rating status for COMPLETED bookings
  - Add "Calificar" button for unrated bookings
- [ ] Create booking detail view (if not exists) or modal
  - Show rating prompt for COMPLETED unrated
  - Show rating status/content when available

**Verification:** Client can see bookings and rate completed ones

### 6.2 Contractor Bookings Page
- [ ] Create `app/contractors/bookings/page.tsx` (if not exists)
  - List contractor's bookings
  - Show rating status for COMPLETED bookings
  - Add "Calificar Cliente" button for unrated
- [ ] Implement booking detail view for contractor
  - Show rating prompt for COMPLETED unrated
  - Show rating status/content when available

**Verification:** Contractor can see bookings and rate clients

### 6.3 Booking Status Integration
- [ ] Update booking completion flow
  - Set `completedAt` timestamp when status → COMPLETED
  - Trigger rating eligibility

**Verification:** `completedAt` is set when booking completes

---

## Phase 7: Profile & Service Integration

### 7.1 Contractor Profile
- [ ] Update contractor public profile to show rating stats
- [ ] Add ratings section showing recent approved reviews

**Verification:** Contractor profile displays rating information

### 7.2 Service Detail
- [ ] Update service detail page
  - Show ServiceRatingStats (average, count)
  - List approved client ratings

**Verification:** Service pages show ratings

---

## Phase 8: Admin Moderation

### 8.1 Moderation Dashboard
- [ ] Create admin ratings moderation page (if admin module exists)
  - List pending ratings
  - Approve/reject actions
  - Filter by rating type (client/contractor)

**Verification:** Admin can moderate ratings

---

## Phase 9: Testing

### 9.1 Unit Tests
- [ ] `src/modules/ratings/__tests__/visibilityService.test.ts`
- [ ] `src/modules/ratings/__tests__/clientRatingService.test.ts`
- [ ] `src/modules/ratings/__tests__/contractorRatingService.test.ts`
- [ ] `src/modules/ratings/__tests__/statsService.test.ts`
- [ ] `src/modules/ratings/__tests__/clientRatingRepository.test.ts`
- [ ] `src/modules/ratings/__tests__/contractorRatingRepository.test.ts`

**Target:** 70%+ coverage on ratings module

### 9.2 Integration Tests
- [ ] `tests/integration/api/bookings/ratings.test.ts`
  - POST client rating
  - POST contractor rating
  - GET booking ratings (visibility tests)
- [ ] `tests/integration/api/users/rating-stats.test.ts`
- [ ] `tests/integration/api/services/ratings.test.ts`
- [ ] `tests/integration/api/admin/ratings-moderation.test.ts`

**Target:** All API endpoints covered

### 9.3 E2E Tests
- [ ] `tests/e2e/ratings/client-rates-contractor.spec.ts`
  - Full flow: complete booking → rate → see on dashboard
- [ ] `tests/e2e/ratings/contractor-rates-client.spec.ts`
  - Full flow: complete booking → rate → see on dashboard
- [ ] `tests/e2e/ratings/double-blind-visibility.spec.ts`
  - Verify ratings hidden until both submit

**Target:** Critical flows covered

---

## Phase 10: Documentation & Cleanup

### 10.1 Documentation
- [ ] Update `src/modules/ratings/README.md` with implementation details
- [ ] Update STP-ReparaYa.md with test cases (see Testing Plan below)

### 10.2 Cleanup
- [ ] Remove old `Rating` model references (if any)
- [ ] Remove `ServiceRatingStats` if replaced by `UserRatingStats` (verify first)
- [ ] Update OpenSpec spec after implementation

---

## Testing Plan

### Casos de prueba a documentar en STP:

| ID | Descripcion | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-009-01 | Cliente crea calificacion valida para contratista | Integracion | Alta | RF-009 |
| TC-RF-009-02 | Contratista crea calificacion valida para cliente | Integracion | Alta | RF-009 |
| TC-RF-009-03 | Rechazo de calificacion duplicada (cliente) | Integracion | Alta | RF-009 |
| TC-RF-009-04 | Rechazo de calificacion duplicada (contratista) | Integracion | Alta | RF-009 |
| TC-RF-009-05 | Visibilidad double-blind: rating oculto hasta ambos califiquen | Unitaria | Alta | RF-009 |
| TC-RF-009-06 | Visibilidad: ratings revelados cuando ambos califican | Unitaria | Alta | RF-009 |
| TC-RF-009-07 | Visibilidad: rating revelado por expiracion de 7 dias | Unitaria | Alta | RF-009 |
| TC-RF-009-08 | Calculo correcto de promedio de usuario | Unitaria | Media | RF-009 |
| TC-RF-009-09 | Solo calificaciones APPROVED cuentan en promedio | Unitaria | Media | RF-009 |
| TC-RF-009-10 | Validacion: stars debe ser 1-5 | Unitaria | Media | RF-009 |
| TC-RF-009-11 | Validacion: comentario max 500 caracteres | Unitaria | Media | RF-009 |
| TC-RF-009-12 | Solo cliente puede calificar al contratista | Integracion | Alta | RF-009 |
| TC-RF-009-13 | Solo contratista puede calificar al cliente | Integracion | Alta | RF-009 |
| TC-RF-009-14 | Dashboard cliente muestra promedio real | E2E | Media | RF-009 |
| TC-RF-009-15 | Dashboard contratista muestra promedio real | E2E | Media | RF-009 |
| TC-RF-009-16 | Modal de calificacion funciona correctamente | E2E | Alta | RF-009 |
| TC-RF-009-17 | Admin puede aprobar calificacion pendiente | Integracion | Media | RF-009 |
| TC-RF-009-18 | Admin puede rechazar calificacion pendiente | Integracion | Media | RF-009 |
| TC-RF-009-19 | Calificacion sin comentario se aprueba automaticamente | Unitaria | Media | RF-009 |
| TC-RF-009-20 | Calificacion con comentario queda PENDING | Unitaria | Media | RF-009 |

### Criterios de aceptacion:

- [ ] Cobertura de codigo >= 70% en `src/modules/ratings/`
- [ ] Todos los tests pasan en CI/CD
- [ ] Performance: P95 <= 200ms para endpoints de rating
- [ ] Seguridad: Validacion de autorizacion en todos los endpoints
- [ ] UX: Rating modal es responsive y accesible

### Estrategia de implementacion de tests:

**Archivos de test:**
- `src/modules/ratings/__tests__/*.test.ts` (unitarios)
- `tests/integration/api/bookings/ratings.test.ts`
- `tests/integration/api/users/rating-stats.test.ts`
- `tests/e2e/ratings/*.spec.ts`

**Mocks y fixtures:**
- Mock de Clerk para autenticacion
- Fixtures de bookings en estado COMPLETED
- Fixtures de usuarios (CLIENT, CONTRACTOR, ADMIN)

**Ambiente de test:**
- Base de datos de test (prisma migrate reset antes de tests)
- Clerk test environment

---

## Dependencies & Parallelization

### Can be done in parallel:
- Phase 2.1 (Types) + Phase 2.2 (Errors)
- Phase 4.1 (Components) can start after Phase 2.1 (Types)
- Phase 5 (Dashboard) can start after Phase 4.1 (Components)

### Sequential dependencies:
1. Phase 1 (Schema) must complete before Phase 2.3 (Repositories)
2. Phase 2 (Backend) must complete before Phase 3 (API)
3. Phase 3 (API) must complete before Phase 6 (Bookings Integration)
4. Phase 4 (Components) must complete before Phase 5-7 (Integration)

### Critical path:
```
Schema → Repositories → Services → API → Bookings Integration → E2E Tests
```
