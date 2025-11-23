# Proposal: Contractor Services — CRUD + Publication

**Change ID:** `2025-11-19-contractor-services-crud`
**Created:** 2025-11-19
**Status:** Proposed
**Author:** OpenSpec Architect
**Priority:** High

---

## Context

ReparaYa is a marketplace platform connecting clients with home repair and maintenance contractors. Currently, the platform has:

1. **Contractor Profile Management** (`openspec/specs/profiles/spec.md`) — CRUD operations for contractor business profiles with verification workflows (DRAFT → ACTIVE states)
2. **Contractor Location & Operation Zones** (`2025-11-19-contractor-location-zone`) — Geographic positioning and service coverage areas (in proposal phase, 0/48 tasks)
3. **Authentication & Authorization** — Clerk integration with role-based access (CLIENT, CONTRACTOR, ADMIN)

**Gap Identified:**
Contractors can create verified profiles and define their operation zones, but they **cannot yet publish individual services** that clients can discover and book. The service catalog functionality is currently missing.

This proposal addresses the core **service lifecycle management** for contractors:
- Creating service offerings with pricing, descriptions, and media
- Managing service visibility states (DRAFT → ACTIVE → PAUSED)
- Uploading service images to AWS S3
- Ensuring only verified contractors can publish active services

---

## Objective

Enable verified contractors to create, edit, publish, and manage their service offerings through a robust CRUD system with state management and media upload capabilities.

**Success Criteria:**
1. Contractors can create service drafts with complete metadata (title, category, description, pricing, duration)
2. Services transition through well-defined states (DRAFT, ACTIVE, PAUSED) with business rule validation
3. Service images are securely uploaded to AWS S3 via presigned URLs with validation
4. Only service owners (contractors) can modify their services; admins can moderate
5. Public catalog exposes only ACTIVE services; drafts and paused services remain private
6. System achieves ≥70% code coverage with comprehensive integration and unit tests

---

## Scope

### In Scope

#### 1. CRUD Operations for Contractor Services

**Core Fields:**
- `title` (string, 5-100 chars, required)
- `categoryId` (UUID, foreign key to service taxonomy, required)
- `description` (string, 50-2000 chars, required)
- `basePrice` (Decimal, min: 50.00 MXN, max: 50000.00 MXN, required)
- `currency` (enum: MXN only for MVP, required)
- `durationMinutes` (int, 30-480 min, required)
- `visibilityStatus` (enum: DRAFT | ACTIVE | PAUSED, default: DRAFT)
- `contractorId` (UUID, foreign key to ContractorProfile, required)
- `images` (array of S3 URLs, max 5 images)
- `createdAt`, `updatedAt`, `lastPublishedAt` (timestamps)

**Operations:**
- **CREATE:** Contractors can create service drafts; initial state = DRAFT
- **READ:**
  - Public endpoint returns only ACTIVE services with limited fields
  - Private endpoint (contractor-only) returns all owned services with full details
- **UPDATE:** Only service owner can edit; restrictions apply when ACTIVE (see state transitions)
- **DELETE:** Soft-delete (set status to ARCHIVED) or hard-delete if never published

#### 2. Service Category Taxonomy

**Simple Hierarchy:**
- Main categories (required): Plomería, Electricidad, Carpintería, Limpieza, Pintura, Jardinería, etc.
- Subcategories (optional): e.g., Plomería → Instalación, Reparación, Mantenimiento

**Database Design:**
- `ServiceCategory` table with `parentId` for hierarchy
- Indexed by `slug` for efficient lookups
- Seeded with initial taxonomy via Prisma migration

#### 3. Publication State Machine

**States:**
- `DRAFT` — Service under construction; not public; editable without restrictions
- `ACTIVE` — Published and discoverable; editing triggers validation; requires:
  - At least 1 image
  - Valid price, category, description
  - Contractor must be verified (`ContractorProfile.verified = true`)
- `PAUSED` — Temporarily hidden from catalog; preserves data; can be reactivated
- `ARCHIVED` — Soft-deleted; not visible; can be restored by admins only

**Allowed Transitions:**
```
DRAFT → ACTIVE (if validation passes)
ACTIVE ↔ PAUSED
ACTIVE/PAUSED → DRAFT (only if no active bookings exist)
ACTIVE/PAUSED/DRAFT → ARCHIVED (soft delete)
```

**Business Rules:**
- Cannot publish (DRAFT → ACTIVE) if:
  - Contractor is not verified
  - Missing required fields (title, category, price, description, images)
  - Price outside allowed range
  - Invalid duration
- Cannot delete service with active/pending bookings (future constraint)
- Editing ACTIVE service requires re-validation before saving

#### 4. Image Upload to AWS S3

**Upload Flow (Presigned URL Pattern):**
1. Client requests upload permission: `POST /api/services/:id/images/upload-url`
2. Server validates:
   - User is service owner
   - Image count < 5
   - File metadata (MIME type, size) within limits
3. Server generates presigned PUT URL (expires in 1 hour)
4. Client uploads directly to S3 using presigned URL
5. Client confirms upload: `POST /api/services/:id/images/confirm`
6. Server stores S3 URL and metadata in database

**Image Validation:**
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
- **Max file size:** 10 MB
- **Max images per service:** 5
- **Min dimensions:** 800x600 pixels (recommended, enforced client-side)
- **S3 bucket:** `reparaya-media-dev` (existing, configured in `.env`)
- **S3 key pattern:** `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`

**Error Handling:**
- Failed uploads: Retry logic on client (3 attempts)
- Orphaned files: Scheduled cleanup job (future enhancement)
- Upload cancellation: Client can abort multipart uploads

**Metadata Storage:**
```typescript
ServiceImage {
  id: string
  serviceId: string
  s3Url: string       // Full S3 URL
  s3Key: string       // S3 object key
  order: int          // Display order (0-4)
  width?: int         // Image dimensions (if available)
  height?: int
  altText?: string    // Accessibility description
  uploadedAt: DateTime
}
```

#### 5. Authorization & Security

**Role-Based Access Control:**
- **CONTRACTOR (Owner):**
  - Create services (unlimited)
  - Edit/delete own services
  - Publish/pause own services (if verified)
  - Upload images to own services
- **CONTRACTOR (Non-Owner):**
  - Cannot access other contractors' private services
- **CLIENT:**
  - Read-only access to ACTIVE services
- **ADMIN:**
  - Read all services (any state)
  - Pause/unpublish services (moderation)
  - Cannot edit service content (only moderate visibility)

**API Endpoint Security:**
- All mutations require authentication (Clerk session)
- Ownership validation on every write operation
- Public reads limited to ACTIVE status + safe fields only
- Rate limiting on image upload endpoints (10 uploads/hour per contractor)

#### 6. Accessibility & UX Requirements

**Empty States:**
- "No services yet" message for contractors with zero services
- "Create your first service" CTA with onboarding tooltip

**Validation Feedback:**
- Real-time field validation on forms (Zod schemas)
- Clear error messages in Spanish (primary language)
- Field-level error indicators (red borders, icons)

**Confirmations:**
- Confirm before publishing (DRAFT → ACTIVE): "¿Publicar servicio? Será visible para todos los clientes"
- Confirm before deleting: "¿Eliminar servicio? Esta acción no se puede deshacer" (if hard delete)
- Confirm before pausing: "¿Pausar servicio? Dejará de aparecer en búsquedas"

**Responsive Design:**
- Mobile-first forms with touch-friendly inputs
- Image upload with drag-and-drop + file picker
- Service cards optimized for small screens

**Keyboard Navigation:**
- Tab order follows logical flow
- Focus indicators on all interactive elements
- Escape key closes modals

**Screen Reader Support:**
- ARIA labels on form fields
- Status announcements for async actions (e.g., "Servicio publicado exitosamente")
- Alt text required for uploaded images

### Out of Scope (Deferred to Future Changes)

- **Service Availability Scheduling** — Time slots and calendar management (future proposal)
- **Dynamic Pricing Rules** — Surge pricing, discounts, packages (future proposal)
- **Multi-Currency Support** — USD, other currencies (requires Stripe reconfiguration)
- **Service Variants** — Size-based pricing, add-ons (future proposal)
- **Advanced Image Processing** — Automatic resizing, watermarking, format conversion (future)
- **Polygon-Based Service Zones** — Currently only supports RADIUS from location spec
- **Client Reviews on Services** — Handled separately in ratings module
- **Service Recommendations** — AI-powered suggestions (future)
- **Contractor Portfolios** — Separate from service catalog (future)

---

## Dependencies

### Prerequisites (Must Be Completed First)

1. **Contractor Location & Operation Zones** (`2025-11-19-contractor-location-zone`)
   **Status:** Proposed (0/48 tasks)
   **Why:** Services will eventually be filtered by operation zones; location data is required for future booking distance calculations
   **Mitigation:** Can implement services CRUD without zone filtering in MVP; add filtering in Phase 2

2. **Contractor Profile Verification** (`openspec/specs/profiles/spec.md`)
   **Status:** Implemented
   **Why:** Only verified contractors can publish ACTIVE services; verification state gates publication

### External Dependencies

1. **AWS S3 Bucket:** `reparaya-media-dev` (already configured in `.env`)
2. **AWS SDK v3:** `@aws-sdk/client-s3` already installed (v3.620.0)
3. **Clerk Authentication:** Session management and role extraction
4. **Prisma ORM:** Database migrations for new tables

### Parallel Work (Can Proceed Independently)

- **Booking Module** — Can be developed in parallel; will reference `Service.id` once available
- **Search & Catalog Frontend** — UI can be built against mocked service data
- **Payment Integration** — Stripe Connect setup is independent

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Contractor location proposal delayed** | Medium | Medium | Implement services CRUD without zone-based filtering; add in Phase 2 |
| **S3 upload failures (network, quota)** | High | Low | Retry logic (3 attempts); clear error messages; fallback to manual upload via admin |
| **Image validation bypass (malicious files)** | High | Low | Server-side MIME type validation; S3 bucket policies block executable files; content scanning (future) |
| **State transition bugs (race conditions)** | Medium | Medium | Optimistic locking with `updatedAt` timestamp checks; database transactions for state changes |
| **Scalability of image storage costs** | Medium | Low | Implement image compression; lazy loading; CDN caching (CloudFront); future: tiered storage |
| **Service schema changes after production** | High | Medium | Use Prisma migrations carefully; avoid breaking changes; version API if needed |
| **Contractor spamming low-quality services** | Medium | Medium | Rate limits (10 services/day); admin moderation queue; future: automated quality checks |
| **Missing test coverage** | High | Low | Enforce ≥70% coverage in CI/CD; block PR merges if tests fail |

---

## Environment Variables

### Existing Variables (No Changes Required)

All necessary AWS variables are already configured in `.env`:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_MEDIA=reparaya-media-dev
```

### Proposed New Variables (Optional, Recommended for Configuration)

These are **not mandatory** but improve configurability and maintainability:

```env
# Image Upload Limits
AWS_S3_MAX_IMAGE_SIZE_MB=10                           # Max file size for validation
AWS_S3_MAX_IMAGES_PER_SERVICE=5                       # Max images per service
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600              # Presigned URL expiry (1 hour)

# Image Processing (Future Enhancement)
AWS_S3_CONTRACTOR_SERVICE_PREFIX=contractor-services/  # S3 key prefix for organization
```

**Justification:**
- Makes limits adjustable without code changes
- Facilitates different configurations for dev/staging/prod
- Self-documenting configuration

**If not added:** Hardcode these values in `/lib/aws/s3Config.ts` with clear comments for future extraction.

---

## Testing Plan

### Test Coverage Goals

- **Minimum code coverage:** ≥ 70% in `src/modules/services`
- **Recommended coverage:** ≥ 80% for critical paths (state transitions, authorization)
- **Integration tests:** All API endpoints with authentication scenarios
- **Unit tests:** Service logic, validators, state machine

### Test Cases to Document in STP

All test cases will be added to `/docs/md/STP-ReparaYa.md` section **4.1.X: Gestión de Servicios del Contratista** before implementation begins.

#### A. Unit Tests (Service Logic & Validation)

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **TC-SERVICE-001** | Validate service creation with valid data | Unitaria | Alta | RF-SRV-001 |
| **TC-SERVICE-002** | Reject service creation with invalid title (< 5 chars) | Unitaria | Alta | RF-SRV-001 |
| **TC-SERVICE-003** | Reject service creation with invalid price (< 50 MXN) | Unitaria | Alta | RF-SRV-001 |
| **TC-SERVICE-004** | Reject service creation with invalid duration (< 30 min) | Unitaria | Alta | RF-SRV-001 |
| **TC-SERVICE-005** | Validate state transition DRAFT → ACTIVE with all requirements | Unitaria | Alta | RF-SRV-003 |
| **TC-SERVICE-006** | Block state transition DRAFT → ACTIVE if contractor unverified | Unitaria | Alta | RF-SRV-003 |
| **TC-SERVICE-007** | Block state transition DRAFT → ACTIVE if missing images | Unitaria | Alta | RF-SRV-003 |
| **TC-SERVICE-008** | Allow state transition ACTIVE ↔ PAUSED | Unitaria | Media | RF-SRV-003 |
| **TC-SERVICE-009** | Validate image metadata (MIME type, size) | Unitaria | Alta | RF-SRV-004 |
| **TC-SERVICE-010** | Reject image upload exceeding 10 MB limit | Unitaria | Alta | RF-SRV-004 |
| **TC-SERVICE-011** | Reject image upload if service already has 5 images | Unitaria | Media | RF-SRV-004 |

#### B. Integration Tests (API Endpoints)

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **TC-SERVICE-012** | POST /api/services creates service for authenticated contractor | Integración | Alta | RF-SRV-001 |
| **TC-SERVICE-013** | POST /api/services returns 403 for non-contractor users | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-014** | POST /api/services returns 400 for invalid payload | Integración | Alta | RF-SRV-001 |
| **TC-SERVICE-015** | GET /api/services/:id returns ACTIVE service to public | Integración | Alta | RF-SRV-002 |
| **TC-SERVICE-016** | GET /api/services/:id returns 404 for DRAFT service to non-owner | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-017** | GET /api/services/me returns all owned services to contractor | Integración | Alta | RF-SRV-002 |
| **TC-SERVICE-018** | PATCH /api/services/:id updates service for owner | Integración | Alta | RF-SRV-001 |
| **TC-SERVICE-019** | PATCH /api/services/:id returns 403 for non-owner | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-020** | PATCH /api/services/:id/publish transitions DRAFT → ACTIVE | Integración | Alta | RF-SRV-003 |
| **TC-SERVICE-021** | PATCH /api/services/:id/publish returns 400 if requirements unmet | Integración | Alta | RF-SRV-003 |
| **TC-SERVICE-022** | PATCH /api/services/:id/pause transitions ACTIVE → PAUSED | Integración | Media | RF-SRV-003 |
| **TC-SERVICE-023** | DELETE /api/services/:id soft-deletes service for owner | Integración | Media | RF-SRV-001 |
| **TC-SERVICE-024** | DELETE /api/services/:id returns 403 for non-owner | Integración | Alta | RF-SRV-005 |

#### C. Image Upload Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **TC-SERVICE-025** | POST /api/services/:id/images/upload-url generates presigned URL | Integración | Alta | RF-SRV-004 |
| **TC-SERVICE-026** | POST /api/services/:id/images/upload-url validates ownership | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-027** | POST /api/services/:id/images/upload-url rejects invalid MIME type | Integración | Alta | RF-SRV-004 |
| **TC-SERVICE-028** | POST /api/services/:id/images/confirm saves image metadata | Integración | Alta | RF-SRV-004 |
| **TC-SERVICE-029** | DELETE /api/services/:id/images/:imageId removes image from S3 | Integración | Media | RF-SRV-004 |
| **TC-SERVICE-030** | Image upload failure retries 3 times before error | Unitaria | Media | RNF-SRV-002 |

#### D. Authorization & Security Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **TC-SERVICE-031** | Verify only CONTRACTOR role can create services | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-032** | Verify service owner can edit own services | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-033** | Verify non-owner cannot edit other contractor's services | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-034** | Verify ADMIN can pause services (moderation) | Integración | Media | RF-SRV-006 |
| **TC-SERVICE-035** | Verify CLIENT cannot create or edit services | Integración | Alta | RF-SRV-005 |
| **TC-SERVICE-036** | Verify unauthenticated users can only read ACTIVE services | Integración | Alta | RF-SRV-005 |

#### E. Performance & Non-Functional Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **TC-SERVICE-037** | Service creation completes in < 500ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| **TC-SERVICE-038** | Service listing (paginated) completes in < 300ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| **TC-SERVICE-039** | Presigned URL generation completes in < 200ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| **TC-SERVICE-040** | Image upload to S3 completes in < 5s for 5MB file | Performance (k6) | Baja | RNF-SRV-002 |

### Acceptance Criteria for Testing

- ✅ All 40 test cases documented in STP before implementation starts
- ✅ Unit tests achieve ≥ 70% coverage in `src/modules/services`
- ✅ Integration tests achieve ≥ 80% coverage of API endpoints
- ✅ All tests pass in CI/CD pipeline
- ✅ No regression in existing contractor profile tests
- ✅ Performance tests validate P95 latency targets
- ✅ Security tests confirm authorization rules enforced

### Test Implementation Strategy

**Files to Create:**
- `src/modules/services/__tests__/serviceService.test.ts` (unit tests for business logic)
- `src/modules/services/__tests__/serviceRepository.test.ts` (unit tests for data access)
- `src/modules/services/__tests__/validators.test.ts` (unit tests for Zod schemas)
- `tests/integration/api/services.test.ts` (integration tests for CRUD endpoints)
- `tests/integration/api/services-images.test.ts` (integration tests for image upload)
- `tests/integration/api/admin-services.test.ts` (integration tests for admin moderation)

**Mocks and Fixtures:**
- Mock Clerk SDK for authentication (existing pattern in `tests/integration/api/contractors.test.ts`)
- Mock AWS S3 SDK (`@aws-sdk/client-s3`) for presigned URL generation
- Fixtures for service data (draft, active, paused states)
- Fixtures for contractor profiles (verified and unverified)

**Integration Test Database:**
- Use test database with Prisma migrations applied
- Seed service categories before tests run
- Clean up services after each test suite

---

## Rollout Plan

### Phase 1: Foundation (Week 1)

**Goal:** Database schema, category taxonomy, basic CRUD without images

**Deliverables:**
1. Prisma schema additions (`Service`, `ServiceCategory`, `ServiceImage` models)
2. Database migration and index creation
3. Seed script for service categories
4. Zod validators for service data
5. Service repository (Prisma data access layer)
6. Unit tests for validators and repository

**Validation:**
- Migration applies successfully in dev environment
- Seed script populates 10+ categories
- Unit tests achieve ≥ 70% coverage

### Phase 2: Business Logic & State Machine (Week 1-2)

**Goal:** Service lifecycle management with state transitions

**Deliverables:**
1. Service service layer (business logic)
2. State machine implementation with validation rules
3. Authorization logic (ownership checks, role validation)
4. Unit tests for state transitions
5. Integration tests for service CRUD (without images)

**Validation:**
- State transitions enforce business rules correctly
- Authorization blocks unauthorized access
- Integration tests cover all CRUD operations

### Phase 3: Image Upload (Week 2)

**Goal:** AWS S3 integration with presigned URLs

**Deliverables:**
1. S3 client configuration (`/lib/aws/s3Client.ts`)
2. Presigned URL generation service
3. Image upload confirmation endpoint
4. Image deletion endpoint
5. Integration tests for image upload flow

**Validation:**
- Presigned URLs successfully upload to S3
- Image metadata saved correctly in database
- Failed uploads handled gracefully

### Phase 4: API Endpoints (Week 2)

**Goal:** REST API for service management

**Deliverables:**
1. `POST /api/services` (create service)
2. `GET /api/services/:id` (read single service)
3. `GET /api/services/me` (list owned services)
4. `PATCH /api/services/:id` (update service)
5. `PATCH /api/services/:id/publish` (publish service)
6. `PATCH /api/services/:id/pause` (pause service)
7. `DELETE /api/services/:id` (delete service)
8. Integration tests for all endpoints

**Validation:**
- All endpoints return correct HTTP status codes
- Authentication and authorization work correctly
- Public endpoints hide private services

### Phase 5: Admin Moderation (Week 3)

**Goal:** Admin controls for service moderation

**Deliverables:**
1. `PATCH /api/admin/services/:id/pause` (admin pause)
2. `GET /api/admin/services` (list all services)
3. Audit logging for admin actions
4. Integration tests for admin endpoints

**Validation:**
- Admins can pause any service
- Audit logs capture admin actions
- Non-admins cannot access admin endpoints

### Phase 6: Documentation & STP Updates (Week 3)

**Goal:** Complete testing documentation

**Deliverables:**
1. Update `/docs/md/STP-ReparaYa.md` with all 40 test cases
2. Update `/openspec/project.md` with service module link
3. Code documentation (JSDoc comments)
4. API documentation (if using Swagger/OpenAPI)

**Validation:**
- STP document includes detailed test procedures
- Project.md accurately reflects new capabilities

### Phase 7: Validation & Archive (Week 3)

**Goal:** Final validation and OpenSpec archival

**Deliverables:**
1. Run full test suite (unit + integration + performance)
2. Validate coverage ≥ 70%
3. Run `openspec validate 2025-11-19-contractor-services-crud --strict`
4. Create pull request to `dev` branch
5. After approval and merge, run `/openspec:archive`

**Validation:**
- All tests pass
- Coverage meets threshold
- OpenSpec validation passes
- PR approved and merged
- Change archived successfully

---

## Definition of Done

This proposal is complete when:

- ✅ **Database schema deployed:** `Service`, `ServiceCategory`, `ServiceImage` tables exist in production
- ✅ **Service categories seeded:** At least 10 main categories available
- ✅ **CRUD operations functional:** Contractors can create, read, update, delete services
- ✅ **State machine operational:** Services transition correctly between DRAFT, ACTIVE, PAUSED
- ✅ **Image upload working:** Presigned URLs enable direct S3 uploads; metadata saved
- ✅ **Authorization enforced:** Only owners can edit; only verified contractors can publish; admins can moderate
- ✅ **Public catalog functional:** GET /api/services returns only ACTIVE services
- ✅ **Tests comprehensive:** ≥ 70% coverage; all 40 test cases passing
- ✅ **STP updated:** All test cases documented in section 4.1.X
- ✅ **Performance validated:** P95 latency targets met (< 500ms for mutations)
- ✅ **Security validated:** Authorization tests pass; no unauthorized access possible
- ✅ **CI/CD passing:** All automated checks green
- ✅ **PR merged:** Changes integrated into `dev` branch
- ✅ **OpenSpec archived:** Change ID `2025-11-19-contractor-services-crud` marked as deployed

---

## Related Documents

- **Contractor Profile Spec:** `openspec/specs/profiles/spec.md`
- **Contractor Location Proposal:** `openspec/changes/2025-11-19-contractor-location-zone/`
- **Project Architecture:** `openspec/project.md`
- **Test Plan:** `docs/md/STP-ReparaYa.md`
- **Environment Configuration:** `.env.example`

---

## Questions & Clarifications

**Open Questions:**
1. Should services support multiple currencies in MVP, or enforce MXN only?
   **Decision:** MXN only for MVP; multi-currency requires Stripe configuration changes.

2. Should service deletion be soft (ARCHIVED state) or hard (permanent)?
   **Decision:** Soft delete by default; hard delete only if service never published (DRAFT only).

3. Should contractors be limited in number of services they can create?
   **Decision:** No hard limit for MVP; future: rate limiting (10 services/day) and quality moderation.

4. Should image uploads be sequential or allow batch uploads?
   **Decision:** Allow batch uploads (up to 5 images at once) for better UX.

5. Should we validate image dimensions server-side or client-side only?
   **Decision:** Client-side validation (800x600 min) with clear messaging; server-side enforcement deferred.

---

**Next Steps:**
Proceed to draft `specs/contractor-services/spec.md` with detailed requirements and BDD scenarios.
