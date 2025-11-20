# Contractor Services CRUD - Implementation Summary

**Change ID:** `2025-11-19-contractor-services-crud`
**Branch:** `feature/contractor-services`
**Status:** Ready for Owner Validation (DO NOT MERGE YET)
**Date:** 2025-11-20

---

## 📋 What Was Delivered

This change provides a **complete OpenSpec proposal** and **scaffolding foundation** for implementing contractor service management (CRUD + publication) in ReparaYa.

### ✅ Deliverables Completed

1. **OpenSpec Specification** (`specs/contractor-services/spec.md`)
   - 9 requirements with detailed scenarios (85+ scenarios total)
   - Service state machine definition (DRAFT → ACTIVE → PAUSED → ARCHIVED)
   - API contracts for all endpoints
   - Data model (Prisma schemas for Service, ServiceCategory, ServiceImage)
   - Authorization rules and security considerations
   - Performance targets (P95 latency ≤ 500ms for mutations)
   - ✅ **Validated:** Passes `openspec validate --strict`

2. **Implementation Plan** (`tasks.md`)
   - 12 phased implementation plan (83 tasks total)
   - Task dependencies clearly marked
   - Parallelizable work identified
   - Success metrics defined

3. **Scaffolding Code** (No Business Logic Yet)
   - **Type System:** Complete TypeScript types for services, categories, images (`src/modules/services/types/`)
   - **Validators:** Zod schemas for all CRUD operations and image uploads (`src/modules/services/validators/`)
   - **Errors:** 11 custom error classes with type guards (`src/modules/services/errors/`)
   - **AWS S3 Abstraction:** `IStorageService` interface with TODOs (`src/lib/aws/s3StorageService.ts`)
   - **Repository Placeholders:** All CRUD methods stubbed with TODOs (`src/modules/services/repositories/`)
   - **Service Layer Placeholders:** Business logic stubs with TODOs (`src/modules/services/services/`)
   - **API Routes:** 8 route placeholders returning 501 Not Implemented (`app/api/services/`)

4. **AWS S3 Integration Guide** (`docs/guias/aws-s3-integracion-imagenes.md`)
   - Step-by-step IAM setup (user creation, restrictive policies)
   - S3 bucket configuration (encryption, CORS, lifecycle)
   - Presigned URL flow with architecture diagrams
   - Complete code examples (backend + frontend)
   - Environment variables documented (NOT added to code yet)
   - Troubleshooting section
   - Verification checklist

5. **Testing Plan Mapped to STP**
   - 40 test cases defined in proposal (TC-SERVICE-001 to TC-SERVICE-040)
   - Test types: Unit (11), Integration (23), Performance (4), Security (6)
   - Coverage goal: ≥70% in `src/modules/services`
   - **NOTE:** STP file (`docs/md/STP-ReparaYa.md`) NOT updated yet (to be done during implementation)

---

## 🚀 What's Ready to Implement

The scaffolding is **100% complete and type-safe**. The next developer can:

1. **Implement Repository Methods** (Phase T3 in tasks.md)
   - All method signatures defined with JSDoc
   - Clear TODOs with implementation hints
   - Start with `serviceRepository.create()` and build up

2. **Implement Service Business Logic** (Phase T4)
   - State machine validation logic
   - Publication requirements validation
   - Authorization checks

3. **Connect API Routes to Services** (Phase T7)
   - Replace 501 responses with actual service calls
   - Add authentication middleware (requireRole)
   - Add error mapping

4. **Implement AWS S3 Integration** (Phase T5)
   - Follow the comprehensive guide in `/docs/guias/`
   - Uncomment TODOs in `S3StorageService` class
   - Add AWS credentials to `.env.local`

5. **Write Tests** (Phase T8)
   - Use existing test patterns from `contractors` module
   - Mock Prisma and S3 SDK
   - Achieve ≥70% coverage

---

## 📦 What's NOT Implemented (By Design)

Per the requirements, the following are **intentionally not implemented** (scaffolding only):

- ❌ **No business logic** in repositories or services (only interfaces)
- ❌ **No AWS SDK calls** (S3StorageService throws errors with instructions)
- ❌ **No database queries** (Prisma methods are TODOs)
- ❌ **No API authentication** (routes return 501)
- ❌ **No tests** (test files not created yet)
- ❌ **No Prisma migrations** (schema defined in spec, not applied)
- ❌ **No environment variables** (documented in guide, not in .env)
- ❌ **No STP updates** (test cases defined in proposal, not in STP yet)

**Why?** This is a **planning and design phase**. The owner requested:
- Spec and plan first
- Scaffolding with contracts (no logic)
- Comprehensive AWS guide
- No actual implementation until validated

---

## 🔧 Technical Decisions Made

### 1. Type System

- **Enums:** `ServiceStatus`, `Currency` (TypeScript enums for type safety)
- **DTOs:** Separate types for creation, update, public view, owner view
- **Validation:** Zod schemas enforce business rules at API boundary

**Example:**
```typescript
createServiceSchema = z.object({
  title: z.string().trim().min(5).max(100),
  basePrice: z.number().min(50).max(50000).multipleOf(0.01),
  durationMinutes: z.number().int().min(30).max(480).multipleOf(15),
});
```

### 2. State Machine

**States:** DRAFT → ACTIVE → PAUSED → ARCHIVED

**Transitions:**
- DRAFT → ACTIVE (requires: verified contractor, ≥1 image, valid data)
- ACTIVE ↔ PAUSED (reversible)
- ACTIVE/PAUSED → DRAFT (only if no active bookings)
- Any → ARCHIVED (soft delete)

**Validation:** `isValidStateTransition()` method in serviceService.ts (TODO)

### 3. AWS S3 Architecture

**Pattern:** Presigned URLs for direct client-to-S3 uploads

**Flow:**
1. Client requests presigned URL from backend
2. Backend validates (ownership, image count, MIME type, size)
3. Backend generates presigned PUT URL (1-hour expiry)
4. Client uploads directly to S3
5. Client confirms upload; backend saves metadata to DB

**Benefits:**
- No backend bandwidth consumption
- Reduced latency
- AWS credentials never exposed to client
- Server maintains control via validation

### 4. Image Validation

**Client-Side:**
- MIME type: `image/jpeg`, `image/png`, `image/webp`
- Max size: 10 MB
- Min dimensions: 800x600 (recommended, not enforced)

**Server-Side:**
- MIME type validation (trust nothing from client)
- File size validation
- Max images per service: 5
- Ownership validation (only service owner can upload)

### 5. Error Handling

**Custom Errors:**
- `ServiceNotFoundError` → 404
- `UnauthorizedServiceActionError` → 403
- `ServicePublicationRequirementsNotMetError` → 400
- `InvalidServiceStateTransitionError` → 400
- `ImageLimitExceededError` → 400
- `S3UploadFailedError` → 500 (retryable)

**Type Guards:** `isServiceError()`, `isCategoryError()`, `isImageError()`

---

## 📊 Data Model

### Service Table

```prisma
model Service {
  id                String          @id @default(uuid())
  contractorId      String          // FK to User (CONTRACTOR role)
  categoryId        String          // FK to ServiceCategory
  title             String          @db.VarChar(100)
  description       String          @db.Text
  basePrice         Decimal         @db.Decimal(12, 2)
  currency          Currency        @default(MXN)
  durationMinutes   Int
  visibilityStatus  ServiceStatus   @default(DRAFT)
  lastPublishedAt   DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([contractorId, visibilityStatus])
  @@index([categoryId, visibilityStatus])
  @@index([visibilityStatus, lastPublishedAt])
}
```

**Indexes:** Optimized for:
- Contractor's own services listing
- Public catalog filtering by category
- Sorting by publication date

### ServiceCategory Table (Hierarchical)

```prisma
model ServiceCategory {
  id          String   @id @default(uuid())
  name        String   // "Plomería", "Electricidad"
  slug        String   @unique  // "plomeria", "electricidad"
  description String
  parentId    String?  // Self-referential for hierarchy

  @@index([slug])
  @@index([parentId])
}
```

**Hierarchy Example:**
- Plomería (parent)
  - Instalación (child)
  - Reparación (child)
  - Mantenimiento (child)

### ServiceImage Table

```prisma
model ServiceImage {
  id          String   @id @default(uuid())
  serviceId   String   // FK to Service
  s3Url       String   @db.Text
  s3Key       String   @db.Text
  order       Int      @default(0)  // Display order 0-4
  width       Int?
  height      Int?
  altText     String?  @db.VarChar(255)
  uploadedAt  DateTime @default(now())

  @@index([serviceId, order])
}
```

---

## 🧪 Testing Strategy

### Unit Tests (11 cases)

- Zod validator tests (title, price, duration, images)
- State transition validation tests
- Publication requirements validation tests

### Integration Tests (23 cases)

- API endpoint tests (POST, GET, PATCH, DELETE)
- Authentication tests (requireRole enforcement)
- Authorization tests (ownership validation)
- Image upload flow tests

### Performance Tests (4 cases)

- Service creation: P95 ≤ 500ms
- Service listing: P95 ≤ 300ms
- Presigned URL generation: P95 ≤ 200ms
- S3 upload: < 5s for 5MB file

### Security Tests (6 cases)

- CONTRACTOR role enforcement
- Ownership validation (cannot edit others' services)
- Admin moderation permissions
- Public visibility rules

---

## 🔐 Security Considerations

### 1. AWS Credentials

- **NEVER** commit to repository
- Use environment variables
- Rotate every 90 days
- Use restrictive IAM policies (principle of least privilege)

**IAM Policy (from guide):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::reparaya-media-dev/contractor-services/*"
    }
  ]
}
```

### 2. Presigned URLs

- Short expiry (1 hour)
- Server-side generation only
- Validation before generation (ownership, limits)
- MIME type validation (server-side)

### 3. Authorization

- All mutations require authentication
- Ownership validation on every write
- Role-based access control (CONTRACTOR, ADMIN, CLIENT)
- Public reads limited to ACTIVE services only

### 4. Input Validation

- Zod schemas at API boundary
- Server-side validation (never trust client)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (sanitize text fields)

---

## 🌐 Environment Variables

**Documented in guide, NOT added to code yet:**

```bash
# AWS General
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...

# S3 Buckets
AWS_S3_BUCKET_MEDIA=reparaya-media-dev

# Image Limits
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600
AWS_S3_MAX_IMAGE_SIZE_MB=10
AWS_S3_MAX_IMAGES_PER_SERVICE=5
AWS_S3_CONTRACTOR_SERVICE_PREFIX=contractor-services/
```

**Owner:** Add these to `.env.local` when implementing S3StorageService.

---

## 📈 Success Criteria (From Proposal)

- ✅ OpenSpec spec validated with `--strict` flag
- ✅ Tasks.md created with 12 phases (83 tasks)
- ✅ Scaffolding compiles without TypeScript errors (only pre-existing errors in other files)
- ✅ AWS S3 guide created with step-by-step instructions
- ✅ All types, validators, and error classes defined
- ✅ API routes defined with clear TODOs
- ⏳ **NOT YET:** Prisma migrations (defined in spec, not applied)
- ⏳ **NOT YET:** Tests written (plan defined, files not created)
- ⏳ **NOT YET:** STP updated (test cases defined in proposal)
- ⏳ **NOT YET:** Business logic implemented (all TODOs)

---

## 🚧 Next Steps for Implementation

### Immediate (Week 1)

1. **Apply Prisma Migration** (T1.1-T1.6)
   ```bash
   cd apps/web
   npx prisma migrate dev --name add_contractor_services
   npx prisma generate
   ```

2. **Seed Categories** (T1.5)
   - Create `prisma/seeds/categories.ts`
   - Seed 10+ categories (Plomería, Electricidad, Carpintería, etc.)

3. **Implement Repository Layer** (T3.1-T3.6)
   - Start with `serviceRepository.create()`
   - Use existing `contractorProfileRepository` as reference
   - Mock Prisma in unit tests

### Mid-Term (Week 1-2)

4. **Implement Service Business Logic** (T4.1-T4.9)
   - State machine validation
   - Publication requirements check
   - Authorization logic

5. **Connect API Routes** (T7.1-T7.10)
   - Replace 501 responses with service calls
   - Add authentication middleware
   - Add error mapping

### Later (Week 2-3)

6. **Implement AWS S3 Integration** (T5.1-T5.6)
   - Follow guide in `/docs/guias/aws-s3-integracion-imagenes.md`
   - Uncomment TODOs in `S3StorageService`
   - Test presigned URL flow locally

7. **Write Tests** (T8.1-T8.10)
   - Unit tests for validators, repositories, services
   - Integration tests for API endpoints
   - Coverage ≥70%

8. **Update STP** (T10.1-T10.2)
   - Add section 4.1.X: Gestión de Servicios del Contratista
   - Document all 40 test cases with detailed procedures

9. **Open PR** (T12.1-T12.6)
   - Owner will validate and open PR to `dev`
   - Address CodeRabbit feedback
   - Merge after approval

---

## 📝 Important Notes

### For the Owner

1. **DO NOT MERGE YET:** This branch is scaffolding only. Validate the approach before proceeding.

2. **Review Checklist:**
   - Does the spec cover all requirements?
   - Is the state machine correct (DRAFT → ACTIVE → PAUSED)?
   - Are the image limits appropriate (10MB, 5 images)?
   - Is the S3 architecture acceptable (presigned URLs)?
   - Are the validation rules too strict/lenient?

3. **AWS Setup Required:**
   - Create IAM user with restrictive policy (see guide)
   - Create S3 bucket with CORS and encryption
   - Add credentials to `.env.local` (NOT committed)

4. **Dependencies:**
   - Contractor Location module is in progress (186/198 tasks)
   - Services module can be implemented in parallel
   - Future: Connect to Booking module (will reference Service.id)

### For Future Developers

1. **Follow the Guide:** AWS S3 integration guide is comprehensive. Follow step-by-step.

2. **Test-Driven Development:** Write tests alongside implementation. Don't wait until the end.

3. **Incremental Progress:** Implement phase by phase. Don't try to do everything at once.

4. **Ask Questions:** If requirements are unclear, ask the owner before implementing.

5. **Update STP:** Document test cases in STP **before** writing code.

---

## 🔗 Related Documents

- **Proposal:** `openspec/changes/2025-11-19-contractor-services-crud/proposal.md`
- **Tasks:** `openspec/changes/2025-11-19-contractor-services-crud/tasks.md`
- **Spec:** `openspec/changes/2025-11-19-contractor-services-crud/specs/contractor-services/spec.md`
- **AWS Guide:** `docs/guias/aws-s3-integracion-imagenes.md`
- **STP:** `docs/md/STP-ReparaYa.md` (to be updated)
- **Project Context:** `openspec/project.md`

---

## 📊 Metrics

- **Lines of Code:** ~3,500 (types, validators, errors, stubs, guide)
- **Files Created:** 15 (scaffolding + guide)
- **Commits:** 4 atomic commits
- **Validation:** ✅ Passes `openspec validate --strict`
- **Build:** ✅ No new TypeScript errors
- **Coverage:** N/A (no tests yet)

---

## 🎉 Summary

This change provides a **complete foundation** for implementing contractor service management. The spec is validated, the architecture is sound, and the scaffolding is ready. The next developer can start implementing immediately following the tasks.md plan.

**Key Achievements:**
- ✅ Complete OpenSpec specification (9 requirements, 85+ scenarios)
- ✅ Phased implementation plan (83 tasks)
- ✅ Type-safe scaffolding (no business logic)
- ✅ Comprehensive AWS S3 guide (967 lines)
- ✅ Clear separation of concerns (types, validators, repos, services)
- ✅ Security-first approach (presigned URLs, IAM policies)

**Ready for:** Owner validation → Implementation → Testing → PR → Merge

---

**Branch:** `feature/contractor-services`
**Status:** ✅ Ready for Owner Review
**OpenSpec Validation:** ✅ Passing
**Build Status:** ✅ No New Errors
