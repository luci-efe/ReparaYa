# Tasks: Contractor Services — CRUD + Publication

**Change ID:** `2025-11-19-contractor-services-crud`
**Status:** In Progress
**Last Updated:** 2025-11-20

---

## Task Checklist

### Phase 1: Database Schema & Category Taxonomy

- [ ] **T1.1** Add `ServiceCategory` model to Prisma schema with self-referential hierarchy
- [ ] **T1.2** Add `Service` model to Prisma schema with fields and indexes
- [ ] **T1.3** Add `ServiceImage` model to Prisma schema with S3 metadata
- [ ] **T1.4** Create and apply Prisma migration for new models
- [ ] **T1.5** Create seed script for initial service categories (10+ categories)
- [ ] **T1.6** Verify migration and seeds in dev database

### Phase 2: Type System & Validation

- [ ] **T2.1** Create `/modules/services/types/index.ts` with service DTOs and enums
- [ ] **T2.2** Create `/modules/services/types/category.ts` with category types
- [ ] **T2.3** Create `/modules/services/types/image.ts` with image metadata types
- [ ] **T2.4** Create `/modules/services/validators/index.ts` with Zod schemas for service CRUD
- [ ] **T2.5** Create `/modules/services/validators/category.ts` with category validation
- [ ] **T2.6** Create `/modules/services/validators/image.ts` with image upload validation
- [ ] **T2.7** Write unit tests for all Zod validators (TC-SERVICE-001 to TC-SERVICE-011)

### Phase 3: Repository Layer (Data Access)

- [ ] **T3.1** Create `/modules/services/repositories/serviceRepository.ts` with CRUD methods
- [ ] **T3.2** Create `/modules/services/repositories/categoryRepository.ts` with category queries
- [ ] **T3.3** Create `/modules/services/repositories/imageRepository.ts` with image metadata CRUD
- [ ] **T3.4** Write unit tests for serviceRepository (mock Prisma)
- [ ] **T3.5** Write unit tests for categoryRepository
- [ ] **T3.6** Write unit tests for imageRepository

### Phase 4: Service Layer (Business Logic)

- [ ] **T4.1** Create `/modules/services/services/serviceService.ts` with business logic
- [ ] **T4.2** Implement service creation logic (default state: DRAFT)
- [ ] **T4.3** Implement service update logic with state-based restrictions
- [ ] **T4.4** Implement service deletion logic (soft delete to ARCHIVED)
- [ ] **T4.5** Implement state machine for publication transitions (DRAFT → ACTIVE → PAUSED)
- [ ] **T4.6** Implement publication validation (verified contractor, required fields, images)
- [ ] **T4.7** Implement authorization checks (ownership, role-based access)
- [ ] **T4.8** Write unit tests for service business logic (TC-SERVICE-005 to TC-SERVICE-011)
- [ ] **T4.9** Create test fixtures for services in different states

### Phase 5: AWS S3 Integration (Preparation Only)

- [ ] **T5.1** Create `/lib/aws/s3StorageService.ts` interface (StorageService abstraction)
- [ ] **T5.2** Define presigned URL generation contract (method signatures, return types)
- [ ] **T5.3** Define image validation contract (MIME types, size limits, max count)
- [ ] **T5.4** Add TODOs for S3 implementation (connect to AWS SDK when ready)
- [ ] **T5.5** Document environment variables needed (AWS_S3_BUCKET_MEDIA, etc.) in comments
- [ ] **T5.6** Create mock S3 service for testing (`__mocks__/s3StorageService.ts`)

### Phase 6: Image Management Service

- [ ] **T6.1** Create `/modules/services/services/imageService.ts` with image logic
- [ ] **T6.2** Implement image metadata creation logic
- [ ] **T6.3** Implement image deletion logic (mark for cleanup)
- [ ] **T6.4** Implement image reordering logic
- [ ] **T6.5** Add validation for max images per service (5 images)
- [ ] **T6.6** Write unit tests for imageService using mocked S3

### Phase 7: API Endpoints (Placeholders)

- [ ] **T7.1** Create `/app/api/services/route.ts` (POST create, GET list public ACTIVE services)
- [ ] **T7.2** Create `/app/api/services/[id]/route.ts` (GET single, PATCH update, DELETE soft-delete)
- [ ] **T7.3** Create `/app/api/services/me/route.ts` (GET owned services for contractor)
- [ ] **T7.4** Create `/app/api/services/[id]/publish/route.ts` (PATCH DRAFT → ACTIVE)
- [ ] **T7.5** Create `/app/api/services/[id]/pause/route.ts` (PATCH ACTIVE → PAUSED)
- [ ] **T7.6** Create `/app/api/services/[id]/images/upload-url/route.ts` (POST presigned URL - STUB)
- [ ] **T7.7** Create `/app/api/services/[id]/images/confirm/route.ts` (POST save metadata - STUB)
- [ ] **T7.8** Create `/app/api/services/[id]/images/[imageId]/route.ts` (DELETE image - STUB)
- [ ] **T7.9** Add authentication middleware to all endpoints (requireRole, requireAnyRole)
- [ ] **T7.10** Add ownership validation to mutation endpoints

### Phase 8: Integration Tests (Essential Only)

- [ ] **T8.1** Create `tests/integration/api/services.test.ts` setup with test DB
- [ ] **T8.2** Write tests for POST /api/services (TC-SERVICE-012, TC-SERVICE-013, TC-SERVICE-014)
- [ ] **T8.3** Write tests for GET /api/services/:id (TC-SERVICE-015, TC-SERVICE-016)
- [ ] **T8.4** Write tests for GET /api/services/me (TC-SERVICE-017)
- [ ] **T8.5** Write tests for PATCH /api/services/:id (TC-SERVICE-018, TC-SERVICE-019)
- [ ] **T8.6** Write tests for PATCH /api/services/:id/publish (TC-SERVICE-020, TC-SERVICE-021)
- [ ] **T8.7** Write tests for PATCH /api/services/:id/pause (TC-SERVICE-022)
- [ ] **T8.8** Write tests for DELETE /api/services/:id (TC-SERVICE-023, TC-SERVICE-024)
- [ ] **T8.9** Write authorization tests (TC-SERVICE-031 to TC-SERVICE-036)
- [ ] **T8.10** Verify ≥70% code coverage in src/modules/services

### Phase 9: Error Handling & Edge Cases

- [ ] **T9.1** Create `/modules/services/errors/index.ts` with custom error classes
- [ ] **T9.2** Add ServiceNotFoundError, ServiceAlreadyExistsError
- [ ] **T9.3** Add InvalidServiceStateTransitionError
- [ ] **T9.4** Add UnauthorizedServiceActionError
- [ ] **T9.5** Add ImageLimitExceededError, InvalidImageFormatError
- [ ] **T9.6** Map errors to HTTP status codes in API routes

### Phase 10: Documentation

- [ ] **T10.1** Update `/docs/md/STP-ReparaYa.md` with section 4.1.X for service tests
- [ ] **T10.2** Document all 40 test cases (TC-SERVICE-001 to TC-SERVICE-040) with procedures
- [ ] **T10.3** Create `/docs/guias/aws-s3-integracion-imagenes.md` with AWS setup guide
- [ ] **T10.4** Document S3 bucket requirements (IAM, CORS, policies)
- [ ] **T10.5** Document presigned URL flow with diagrams
- [ ] **T10.6** Document environment variables and configuration
- [ ] **T10.7** Add JSDoc comments to all public methods in services layer

### Phase 11: Validation & CI/CD

- [ ] **T11.1** Run `npm run test` to verify all tests pass
- [ ] **T11.2** Run `npm run test:coverage` to verify ≥70% coverage
- [ ] **T11.3** Run `npm run type-check` to verify TypeScript compilation
- [ ] **T11.4** Run `openspec validate 2025-11-19-contractor-services-crud --strict`
- [ ] **T11.5** Fix any OpenSpec validation errors
- [ ] **T11.6** Run `npm run lint` and fix any linting issues

### Phase 12: Pull Request & Review

- [ ] **T12.1** Create atomic commits (spec, tasks, scaffolding, guide, tests)
- [ ] **T12.2** Push feature branch to origin
- [ ] **T12.3** Wait for owner validation (DO NOT open PR yet per instructions)
- [ ] **T12.4** (Owner) Open PR from feature/contractor-services → dev
- [ ] **T12.5** (Owner) Address CodeRabbit feedback
- [ ] **T12.6** (Owner) Merge PR after approval

---

## Dependencies Between Tasks

**Critical Path:**
1. **T1.x** (Schema) → **T2.x** (Types) → **T3.x** (Repository) → **T4.x** (Service Logic) → **T7.x** (API) → **T8.x** (Tests)
2. **T5.x** (AWS Prep) can run in parallel with **T3.x-T4.x**
3. **T10.x** (Docs) can run in parallel with **T8.x** (Tests)
4. **T11.x** (Validation) must run after all code is complete

**Parallelizable Work:**
- T5.x (AWS abstraction) + T3.x-T4.x (business logic)
- T10.3-T10.6 (AWS guide) + T8.x (integration tests)
- T9.x (error classes) + T8.x (test writing)

---

## Success Metrics

- ✅ All Prisma migrations applied successfully
- ✅ 10+ service categories seeded
- ✅ All TypeScript files compile without errors
- ✅ Code coverage ≥ 70% in `src/modules/services`
- ✅ All integration tests pass (TC-SERVICE-012 to TC-SERVICE-036)
- ✅ OpenSpec validation passes with --strict flag
- ✅ STP updated with all 40 test cases
- ✅ AWS S3 guide created in `/docs/guias/`
- ✅ No new environment variables added to code (only documented)
- ✅ Build passes without warnings

---

## Notes

- **Scaffolding Only:** Phase 5 (AWS S3) creates interfaces and TODOs only — no actual S3 calls
- **Minimal Tests:** Focus on essential test cases (40 total) — avoid overkill for CI/CD
- **No PR Yet:** Owner will validate before opening PR to dev
- **Atomic Commits:** (1) spec + tasks, (2) scaffolding, (3) tests, (4) docs
