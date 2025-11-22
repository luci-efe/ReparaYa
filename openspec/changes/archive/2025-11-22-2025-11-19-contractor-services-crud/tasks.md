# Tasks: Contractor Services CRUD + Publication

**Change ID:** `2025-11-19-contractor-services-crud`
**Status:** In Progress
**Created:** 2025-11-19
**Last Updated:** 2025-11-20

---

## Progress Overview

- **Total Tasks:** 50
- **Completed:** 47 (94%)
- **In Progress:** 0
- **Blocked:** 3 (critical issues)

**Last Validation:** 2025-11-20
**Validation Report:** See `/CONTRACTOR_SERVICES_VALIDATION_REPORT.md`

### Critical Blockers (Must Fix Before Archive)

1. 🔴 **Database Schema Misalignment** - Supabase schema not aligned with Prisma
   - Missing enum types (ServiceVisibilityStatus, Currency, etc.)
   - Incomplete Service.categoryId migration
   - Missing ServiceCategory fields (sortOrder, isActive)

2. 🔴 **TASK-034: Missing ImageUploadService Tests** - 0% coverage
   - Violates 70% coverage requirement
   - Must write unit tests before archive

3. 🔴 **TASK-049/050: Integration Test Failures** - 26/46 tests failing (56% failure rate)
   - Mock setup issues with Prisma and Auth
   - Must fix before archive

**Estimated Effort to Complete:** 14-19 hours

---

## Phase 1: Foundation & Schema (Week 1)

### Database Schema & Migration

- [ ] **TASK-001:** Create Prisma schema for `ServiceCategory` model
  - Fields: id, name, slug, description, parentId, createdAt, updatedAt
  - Indexes: unique on slug, index on parentId
  - Self-referential relation for hierarchy

- [ ] **TASK-002:** Create Prisma schema for `Service` model
  - Fields: id, contractorId, categoryId, title, description, basePrice, currency, durationMinutes, visibilityStatus, lastPublishedAt, createdAt, updatedAt
  - Relations: contractor (ContractorProfile), category (ServiceCategory), images (ServiceImage[])
  - Indexes: contractorId, categoryId, visibilityStatus, compound (contractorId + visibilityStatus)
  - Enums: ServiceVisibilityStatus (DRAFT, ACTIVE, PAUSED, ARCHIVED), Currency (MXN)

- [ ] **TASK-003:** Create Prisma schema for `ServiceImage` model
  - Fields: id, serviceId, s3Url, s3Key, order, width, height, altText, uploadedAt
  - Relations: service (Service)
  - Indexes: serviceId, compound (serviceId + order)

- [ ] **TASK-004:** Generate Prisma migration for service tables
  - Run `npx prisma migrate dev --name add_contractor_services`
  - Verify migration SQL is correct
  - Test rollback capability

- [ ] **TASK-005:** Create seed script for service categories
  - Location: `prisma/seeds/serviceCategories.ts`
  - Seed at least 10 main categories (Plomería, Electricidad, Carpintería, Limpieza, Pintura, Jardinería, etc.)
  - Include 3-5 subcategories per main category
  - Make seed script idempotent (check for existing categories)

- [ ] **TASK-006:** Update main seed script to include service categories
  - Import and call serviceCategories seed
  - Ensure proper ordering (categories before services)

### Validation Layer

- [ ] **TASK-007:** Create Zod schema for service creation (`CreateServiceDTO`)
  - Validate: title (5-100 chars), categoryId (UUID), description (50-2000 chars)
  - Validate: basePrice (50-50000 MXN), currency (MXN only), durationMinutes (30-480)
  - Default visibilityStatus to DRAFT

- [ ] **TASK-008:** Create Zod schema for service update (`UpdateServiceDTO`)
  - All fields optional except serviceId
  - Same validation rules as creation
  - Conditional validation based on current state

- [ ] **TASK-009:** Create Zod schema for image upload request (`ImageUploadRequestDTO`)
  - Validate: fileName, mimeType (image/jpeg, image/png, image/webp), fileSize (max 10MB)

- [ ] **TASK-010:** Create Zod schema for image upload confirmation (`ImageUploadConfirmDTO`)
  - Validate: s3Url, s3Key, width, height, altText (optional)

- [ ] **TASK-011:** Write unit tests for all Zod validators
  - Test valid inputs
  - Test boundary conditions (min/max lengths, prices, durations)
  - Test invalid inputs (wrong types, out of range)
  - Location: `src/modules/services/__tests__/validators.test.ts`

### Repository Layer

- [ ] **TASK-012:** Create `ServiceRepository` interface
  - Methods: create, findById, findByContractorId, update, delete
  - Methods: findActiveServices (public catalog), findByCategory
  - Methods: updateVisibilityStatus, getImagesCount

- [ ] **TASK-013:** Implement `ServiceRepository` with Prisma
  - Location: `src/modules/services/repositories/serviceRepository.ts`
  - Implement all interface methods
  - Use Prisma transactions where needed
  - Handle optimistic locking with updatedAt checks

- [ ] **TASK-014:** Create `ServiceImageRepository` interface
  - Methods: create, findByServiceId, deleteById, updateOrder

- [ ] **TASK-015:** Implement `ServiceImageRepository` with Prisma
  - Location: `src/modules/services/repositories/serviceImageRepository.ts`
  - Implement all interface methods
  - Validate max 5 images per service

- [ ] **TASK-016:** Write unit tests for `ServiceRepository`
  - Test CRUD operations
  - Test filtering and pagination
  - Test error handling
  - Location: `src/modules/services/__tests__/serviceRepository.test.ts`

- [ ] **TASK-017:** Write unit tests for `ServiceImageRepository`
  - Test image CRUD operations
  - Test max images constraint
  - Test ordering logic
  - Location: `src/modules/services/__tests__/serviceImageRepository.test.ts`

---

## Phase 2: Business Logic & State Machine (Week 1-2)

### Service Logic

- [ ] **TASK-018:** Create `ServiceService` class with business logic
  - Location: `src/modules/services/services/serviceService.ts`
  - Methods: createService, updateService, deleteService
  - Methods: getServiceById, getContractorServices, getActiveServices
  - Inject repositories as dependencies

- [ ] **TASK-019:** Implement service creation logic
  - Validate contractor is verified (for immediate publication)
  - Set default status to DRAFT
  - Validate category exists
  - Return created service with relations

- [ ] **TASK-020:** Implement service update logic
  - Validate ownership or admin role
  - If service is ACTIVE, re-validate publication requirements
  - Use optimistic locking (check updatedAt)
  - Return updated service

- [ ] **TASK-021:** Implement service deletion logic
  - Check for active bookings (future constraint - skip for now)
  - Soft delete: set status to ARCHIVED
  - Hard delete: only if status is DRAFT and never published

### State Machine

- [ ] **TASK-022:** Create `ServiceStateMachine` class
  - Location: `src/modules/services/services/serviceStateMachine.ts`
  - Methods: canTransition, validatePublicationRequirements, transitionTo

- [ ] **TASK-023:** Implement state transition validation
  - DRAFT → ACTIVE: requires verified contractor, images, valid fields
  - ACTIVE ↔ PAUSED: no restrictions
  - ACTIVE/PAUSED → DRAFT: only if no active bookings (skip check for MVP)
  - ANY → ARCHIVED: soft delete, no restrictions

- [ ] **TASK-024:** Implement publication requirements check
  - Contractor must be verified
  - Service must have at least 1 image
  - All required fields valid (title, category, price, description, duration)

- [ ] **TASK-025:** Write unit tests for `ServiceStateMachine`
  - Test all valid transitions
  - Test blocked transitions
  - Test publication requirements validation
  - Location: `src/modules/services/__tests__/serviceStateMachine.test.ts`

- [ ] **TASK-026:** Write unit tests for `ServiceService`
  - Test create, update, delete operations
  - Test authorization checks
  - Test state transition integration
  - Location: `src/modules/services/__tests__/serviceService.test.ts`

### Authorization

- [ ] **TASK-027:** Create authorization helper functions
  - Location: `src/modules/services/utils/authz.ts`
  - Functions: isServiceOwner, canEditService, canPublishService, canModerateService

- [ ] **TASK-028:** Write unit tests for authorization helpers
  - Test owner checks
  - Test role-based access
  - Test admin permissions
  - Location: `src/modules/services/__tests__/authz.test.ts`

---

## Phase 3: Image Upload (Week 2)

### AWS S3 Integration

- [ ] **TASK-029:** Create S3 configuration file
  - Location: `src/lib/aws/s3Config.ts`
  - Export constants: MAX_IMAGE_SIZE_MB, MAX_IMAGES_PER_SERVICE, PRESIGNED_URL_EXPIRY
  - Export S3 bucket name and region from env

- [ ] **TASK-030:** Create S3 client wrapper
  - Location: `src/lib/aws/s3Client.ts`
  - Initialize S3Client with credentials from env
  - Export singleton instance

- [ ] **TASK-031:** Create presigned URL generation service
  - Location: `src/modules/services/services/imageUploadService.ts`
  - Method: generatePresignedUploadUrl(serviceId, fileName, mimeType, fileSize)
  - Validate ownership, image count, file metadata
  - Generate S3 key: `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`
  - Return presigned PUT URL with 1-hour expiry

- [ ] **TASK-032:** Create image upload confirmation handler
  - Method: confirmImageUpload(serviceId, s3Url, s3Key, metadata)
  - Validate ownership
  - Save image metadata to database
  - Return saved ServiceImage

- [ ] **TASK-033:** Create image deletion service
  - Method: deleteImage(serviceId, imageId)
  - Validate ownership
  - Delete from S3
  - Delete from database
  - Return success status

- [ ] **TASK-034:** Write unit tests for `ImageUploadService`
  - Mock S3 client
  - Test presigned URL generation
  - Test validation logic
  - Test error handling
  - Location: `src/modules/services/__tests__/imageUploadService.test.ts`

---

## Phase 4: API Endpoints (Week 2)

### Public Endpoints

- [ ] **TASK-035:** Create `GET /api/services` (public catalog)
  - Location: `apps/web/app/api/services/route.ts`
  - Query params: page, limit, categoryId, search
  - Return only ACTIVE services
  - Return limited fields (hide internal data)
  - Implement pagination

- [ ] **TASK-036:** Create `GET /api/services/:id` (public detail)
  - Location: `apps/web/app/api/services/[id]/route.ts`
  - Return service if ACTIVE
  - Return 404 if DRAFT/PAUSED/ARCHIVED and not owner
  - Include images and category relations

### Contractor Endpoints

- [ ] **TASK-037:** Create `POST /api/services` (create service)
  - Require authentication
  - Require CONTRACTOR role
  - Validate request body with Zod
  - Call ServiceService.createService
  - Return 201 with created service

- [ ] **TASK-038:** Create `GET /api/services/me` (list owned services)
  - Location: `apps/web/app/api/services/me/route.ts`
  - Require authentication
  - Require CONTRACTOR role
  - Return all services owned by current contractor
  - Include images and category

- [ ] **TASK-039:** Create `PATCH /api/services/:id` (update service)
  - Require authentication
  - Validate ownership
  - Validate request body with Zod
  - Call ServiceService.updateService
  - Return 200 with updated service

- [ ] **TASK-040:** Create `PATCH /api/services/:id/publish` (publish service)
  - Require authentication
  - Validate ownership
  - Call ServiceStateMachine.transitionTo(ACTIVE)
  - Return 200 or 400 if requirements not met

- [ ] **TASK-041:** Create `PATCH /api/services/:id/pause` (pause service)
  - Require authentication
  - Validate ownership
  - Call ServiceStateMachine.transitionTo(PAUSED)
  - Return 200 with updated service

- [ ] **TASK-042:** Create `DELETE /api/services/:id` (delete service)
  - Require authentication
  - Validate ownership
  - Call ServiceService.deleteService
  - Return 204

### Image Upload Endpoints

- [ ] **TASK-043:** Create `POST /api/services/:id/images/upload-url` (request presigned URL)
  - Location: `apps/web/app/api/services/[id]/images/upload-url/route.ts`
  - Require authentication
  - Validate ownership
  - Validate request body (fileName, mimeType, fileSize)
  - Call ImageUploadService.generatePresignedUploadUrl
  - Return presigned URL

- [ ] **TASK-044:** Create `POST /api/services/:id/images/confirm` (confirm upload)
  - Location: `apps/web/app/api/services/[id]/images/confirm/route.ts`
  - Require authentication
  - Validate ownership
  - Call ImageUploadService.confirmImageUpload
  - Return saved image metadata

- [ ] **TASK-045:** Create `DELETE /api/services/:id/images/:imageId` (delete image)
  - Location: `apps/web/app/api/services/[id]/images/[imageId]/route.ts`
  - Require authentication
  - Validate ownership
  - Call ImageUploadService.deleteImage
  - Return 204

---

## Phase 5: Admin Moderation (Week 3)

- [ ] **TASK-046:** Create `GET /api/admin/services` (list all services)
  - Location: `apps/web/app/api/admin/services/route.ts`
  - Require ADMIN role
  - Return all services with filters (status, contractor, category)
  - Include pagination

- [ ] **TASK-047:** Create `PATCH /api/admin/services/:id/pause` (admin pause)
  - Require ADMIN role
  - Transition service to PAUSED
  - Log moderation action
  - Return 200

---

## Phase 6: Testing (Week 2-3)

### Unit Tests

- [ ] **TASK-048:** Ensure all unit tests pass
  - Run `npm run test -- src/modules/services`
  - Verify coverage ≥ 70%
  - Fix any failing tests

### Integration Tests

- [ ] **TASK-049:** Write integration tests for all endpoints
  - Location: `tests/integration/api/services.test.ts`
  - Test authentication/authorization scenarios
  - Test all CRUD operations
  - Test state transitions
  - Test image upload flow
  - Mock Clerk and S3 SDK
  - Use test database

- [ ] **TASK-050:** Run integration tests and verify coverage
  - Run full test suite
  - Verify integration coverage ≥ 80%
  - Document test results in STP-ReparaYa.md

---

## Acceptance Criteria

- ✅ All 50 tasks completed
- ✅ Database schema deployed and seeded
- ✅ All API endpoints functional
- ✅ Unit tests achieve ≥ 70% coverage
- ✅ Integration tests achieve ≥ 80% coverage
- ✅ All tests passing in CI/CD
- ✅ STP-ReparaYa.md updated with test cases and results
- ✅ PR merged to dev branch
- ✅ OpenSpec validation passes

---

## Notes

- This tasks.md will be updated as implementation progresses
- Each completed task should be marked with `[x]`
- Blockers should be documented immediately
- Testing is integrated throughout, not deferred to the end
