# Contractor Services Specification

## Overview

### Purpose

This module enables verified contractors to create, manage, and publish their service offerings on the ReparaYa marketplace. It provides:

- **Service Catalog Management**: CRUD operations for contractor service offerings with complete metadata
- **Publication State Machine**: Lifecycle management through DRAFT, ACTIVE, PAUSED, and ARCHIVED states
- **Image Upload**: Secure AWS S3 integration for service images via presigned URLs
- **Service Category Taxonomy**: Hierarchical categorization (main categories + subcategories)
- **Authorization Controls**: Role-based access ensuring only verified contractors can publish active services

### Scope

**In Scope:**

- CRUD operations for contractor services (create, read, update, soft-delete)
- Service publication state machine (DRAFT → ACTIVE ↔ PAUSED → ARCHIVED)
- Service category taxonomy (main categories + subcategories)
- AWS S3 image upload via presigned URLs (max 5 images per service)
- Authorization: only verified contractors can publish; admins can moderate
- Public catalog endpoint (returns only ACTIVE services)
- Private contractor endpoint (returns all owned services with full details)
- Input validation with Zod schemas
- Comprehensive testing strategy (unit + integration + E2E)

**Out of Scope (Deferred to Future Versions):**

- Service availability scheduling (handled by contractor-availability module)
- Dynamic pricing rules (surge pricing, discounts, packages)
- Multi-currency support (MVP is MXN only)
- Service variants (size-based pricing, add-ons)
- Advanced image processing (resizing, watermarking, format conversion)
- Polygon-based service zones (MVP uses RADIUS from location module)
- Client reviews on services (handled by ratings module)
- AI-powered service recommendations
- Contractor portfolios (separate from service catalog)

### Dependencies

**Backend:**
- `auth`: Authentication via Clerk, role-based access control (CONTRACTOR, CLIENT, ADMIN)
- `contractors`: ContractorProfile with `verified` field (gates publication)
- `contractor-location`: ContractorServiceLocation for timezone and operation zones
- Prisma ORM: Database migrations for Service, ServiceCategory, ServiceImage models

**Frontend:**
- DashboardShell (layout for contractors)
- UI components: Card, Button, Input, forms with react-hook-form + Zod
- Image upload components with drag-and-drop support

**External:**
- AWS S3: Bucket `reparaya-media-dev` for image storage
- AWS SDK v3: `@aws-sdk/client-s3` (v3.620.0) for presigned URLs
- Clerk: Session management and role extraction
- Stripe: (future) service pricing integration with payments module

---

## Requirements

### Functional Requirements

#### RF-SRV-001: Service CRUD Operations

**Description:**
Contractors can create, read, update, and delete their service offerings with complete metadata.

**Acceptance Criteria:**

**Create Service:**
- **WHEN** an authenticated contractor calls `POST /api/services` with valid service data
- **THEN** the system SHALL create a Service record with `visibilityStatus: DRAFT` by default
- **AND** return HTTP 201 with the created service (id, title, categoryId, description, basePrice, currency, durationMinutes, visibilityStatus, contractorId, createdAt, updatedAt)

**Validation:**
- Title: 5-100 characters (required)
- CategoryId: valid UUID referencing ServiceCategory (required)
- Description: 50-2000 characters (required)
- BasePrice: Decimal, min 50.00 MXN, max 50,000.00 MXN (required)
- Currency: MXN only for MVP (required)
- DurationMinutes: integer, 30-480 minutes (required)
- Images: max 5 images

**Read Service (Public):**
- **WHEN** any user (authenticated or not) calls `GET /api/services/:id`
- **THEN** the system SHALL return HTTP 200 with limited public fields only if `visibilityStatus === ACTIVE`:
  - id, title, categoryId, description, basePrice, currency, durationMinutes, images, contractorId (basic info), lastPublishedAt
- **AND** SHALL NOT expose internal fields or draft/paused services

**Read Service (Owner):**
- **WHEN** the service owner calls `GET /api/services/:id` with authentication
- **THEN** the system SHALL return HTTP 200 with full service details regardless of visibility status

**List Owned Services:**
- **WHEN** an authenticated contractor calls `GET /api/services/me`
- **THEN** the system SHALL return HTTP 200 with array of all services owned by the contractor (all visibility states)

**Update Service:**
- **WHEN** a service owner calls `PATCH /api/services/:id` with updated fields
- **THEN** the system SHALL:
  - Validate the same rules as create
  - Update the service
  - Re-validate if status is ACTIVE (must maintain publication requirements)
  - Return HTTP 200 with updated service

**Soft Delete:**
- **WHEN** a service owner calls `DELETE /api/services/:id`
- **THEN** the system SHALL:
  - If service is in DRAFT and never published → allow hard delete (permanently remove)
  - Otherwise → soft delete (set visibilityStatus to ARCHIVED)
  - Return HTTP 204 No Content

**Errors:**
- 400: Validation failure (invalid title, price, duration, description, category)
- 401: Not authenticated
- 403: Not the service owner or not CONTRACTOR role
- 404: Service not found
- 409: Duplicate service detected (optional constraint)

**Test Cases:**
TC-SERVICE-001, TC-SERVICE-002, TC-SERVICE-003, TC-SERVICE-004, TC-SERVICE-012, TC-SERVICE-013, TC-SERVICE-014, TC-SERVICE-015, TC-SERVICE-016, TC-SERVICE-017, TC-SERVICE-018, TC-SERVICE-019, TC-SERVICE-023, TC-SERVICE-024

---

#### RF-SRV-002: Service Listing and Search

**Description:**
Public endpoint to list active services with optional filtering by category, contractor, price range, and search text.

**Acceptance Criteria:**

- **WHEN** any user calls `GET /api/services?category=UUID&minPrice=50&maxPrice=500&search=plomeria`
- **THEN** the system SHALL:
  - Return only services with `visibilityStatus === ACTIVE`
  - Filter by categoryId if provided
  - Filter by price range if minPrice/maxPrice provided
  - Search in title and description if search query provided
  - Support pagination (page, limit params)
  - Return HTTP 200 with array of services (public fields only)

**Query Parameters:**
- `category` (optional): UUID of ServiceCategory
- `minPrice` (optional): minimum price filter
- `maxPrice` (optional): maximum price filter
- `search` (optional): text search in title/description
- `page` (optional): pagination page number (default: 1)
- `limit` (optional): results per page (default: 20, max: 100)

**Response Fields:**
- id, title, categoryId, description, basePrice, currency, durationMinutes, images (URLs), contractorId, contractor (basic info: businessName, verified), lastPublishedAt

**Errors:**
- 400: Invalid query parameters

**Test Cases:**
TC-SERVICE-015, TC-SERVICE-017

---

#### RF-SRV-003: Publication State Machine

**Description:**
Services transition through defined states with business rule validation at each transition.

**States:**
- **DRAFT**: Service under construction; not public; editable without restrictions
- **ACTIVE**: Published and discoverable in catalog; requires validation; only verified contractors can publish
- **PAUSED**: Temporarily hidden from catalog; preserves data; can be reactivated
- **ARCHIVED**: Soft-deleted; not visible; can be restored by admins only

**State Transitions:**

```
DRAFT → ACTIVE (publish)
  Requirements:
    - Contractor must be verified (ContractorProfile.verified === true)
    - At least 1 image uploaded
    - All required fields valid (title, category, description, price, duration)
    - Price within allowed range (50-50,000 MXN)
    - Duration within allowed range (30-480 min)

ACTIVE → PAUSED (pause)
  Requirements:
    - Only service owner or admin can pause

PAUSED → ACTIVE (reactivate)
  Requirements:
    - Same as DRAFT → ACTIVE (re-validation)

ACTIVE/PAUSED → DRAFT (unpublish)
  Requirements:
    - No active/pending bookings exist (future constraint with booking module)

ACTIVE/PAUSED/DRAFT → ARCHIVED (soft delete)
  Requirements:
    - Only service owner or admin can archive
```

**Acceptance Criteria:**

**Publish Service (DRAFT → ACTIVE):**
- **WHEN** a verified contractor calls `PATCH /api/services/:id/publish`
- **THEN** the system SHALL:
  - Validate contractor is verified
  - Validate service has at least 1 image
  - Validate all required fields
  - Update `visibilityStatus` to ACTIVE
  - Set `lastPublishedAt` to current timestamp
  - Return HTTP 200 with updated service

**Pause Service (ACTIVE → PAUSED):**
- **WHEN** a service owner or admin calls `PATCH /api/services/:id/pause`
- **THEN** the system SHALL:
  - Update `visibilityStatus` to PAUSED
  - Return HTTP 200 with updated service

**Reactivate Service (PAUSED → ACTIVE):**
- **WHEN** a service owner calls `PATCH /api/services/:id/publish`
- **THEN** the system SHALL:
  - Re-validate publication requirements
  - Update `visibilityStatus` to ACTIVE
  - Return HTTP 200 with updated service

**Block Transitions:**
- **WHEN** an unverified contractor attempts to publish a service
- **THEN** the system SHALL return HTTP 403 Forbidden with error "Your profile must be verified before publishing services"

- **WHEN** a contractor attempts to publish a service without images
- **THEN** the system SHALL return HTTP 400 Bad Request with error "At least 1 image is required to publish a service"

**Errors:**
- 400: Publication requirements not met (missing images, invalid fields)
- 403: Not verified or not authorized
- 409: Invalid state transition

**Test Cases:**
TC-SERVICE-005, TC-SERVICE-006, TC-SERVICE-007, TC-SERVICE-008, TC-SERVICE-020, TC-SERVICE-021, TC-SERVICE-022

---

#### RF-SRV-004: Image Upload to AWS S3

**Description:**
Secure image upload flow using presigned URLs for direct client-to-S3 uploads.

**Upload Flow:**

1. **Request Upload URL:**
   - Client calls `POST /api/services/:id/images/upload-url` with image metadata
   - Server validates ownership and image metadata
   - Server generates presigned PUT URL (expires in 1 hour)
   - Server returns presigned URL + metadata

2. **Upload to S3:**
   - Client uploads image directly to S3 using presigned URL
   - S3 validates MIME type and size
   - Upload completes or fails

3. **Confirm Upload:**
   - Client calls `POST /api/services/:id/images/confirm` with S3 key
   - Server stores image metadata in database (ServiceImage record)
   - Server returns saved image metadata

**Acceptance Criteria:**

**Request Presigned URL:**
- **WHEN** a service owner calls `POST /api/services/:id/images/upload-url`
- **WITH** payload: `{ fileName: "image.jpg", fileSize: 5242880, mimeType: "image/jpeg" }`
- **THEN** the system SHALL:
  - Verify user is service owner
  - Validate service has < 5 images
  - Validate MIME type is one of: `image/jpeg`, `image/png`, `image/webp`
  - Validate file size ≤ 10 MB
  - Generate presigned PUT URL with 1-hour expiry
  - Generate S3 key: `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`
  - Return HTTP 200 with: `{ presignedUrl, s3Key, expiresAt }`

**Confirm Upload:**
- **WHEN** a service owner calls `POST /api/services/:id/images/confirm`
- **WITH** payload: `{ s3Key: "...", altText?: "..." }`
- **THEN** the system SHALL:
  - Verify user is service owner
  - Verify S3 object exists at s3Key
  - Create ServiceImage record with: `id, serviceId, s3Url, s3Key, order (auto-incremented), altText, width?, height?, uploadedAt`
  - Return HTTP 201 with image metadata

**Delete Image:**
- **WHEN** a service owner calls `DELETE /api/services/:id/images/:imageId`
- **THEN** the system SHALL:
  - Verify user is service owner
  - Delete ServiceImage record from database
  - Delete object from S3 (async)
  - Return HTTP 204 No Content

**Image Constraints:**
- Max 5 images per service
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 10 MB
- Recommended min dimensions: 800x600 pixels (enforced client-side)

**S3 Configuration:**
- Bucket: `reparaya-media-dev` (existing, configured in `.env`)
- Key pattern: `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`
- Presigned URL expiry: 1 hour (3600 seconds)

**Error Handling:**
- Retry logic on client (3 attempts for upload failures)
- Orphaned files: scheduled cleanup job (future enhancement)
- Upload cancellation: client can abort multipart uploads

**Errors:**
- 400: Invalid metadata, file too large, invalid MIME type, max images exceeded
- 403: Not service owner
- 404: Service not found, image not found

**Test Cases:**
TC-SERVICE-009, TC-SERVICE-010, TC-SERVICE-011, TC-SERVICE-025, TC-SERVICE-026, TC-SERVICE-027, TC-SERVICE-028, TC-SERVICE-029, TC-SERVICE-030

---

#### RF-SRV-005: Authorization and Access Control

**Description:**
Role-based access control for service management operations.

**Access Control Matrix:**

| Role | Create | Read Own | Read Public | Update | Delete | Publish | Admin Actions |
|------|--------|----------|-------------|--------|--------|---------|---------------|
| **CONTRACTOR (Owner)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (if verified) | ❌ |
| **CONTRACTOR (Other)** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CLIENT** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ADMIN** | ❌ | ✅ (all) | ✅ | ❌ | ❌ | ❌ | ✅ (moderate) |
| **Public** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Acceptance Criteria:**

**Contractor Owner:**
- **WHEN** a contractor creates, updates, deletes, or publishes their own service
- **THEN** the system SHALL allow the operation if the contractor owns the service

**Contractor Non-Owner:**
- **WHEN** a contractor attempts to modify another contractor's service
- **THEN** the system SHALL return HTTP 403 Forbidden with error "You do not have permission to modify this service"

**Client:**
- **WHEN** a client attempts to create or modify any service
- **THEN** the system SHALL return HTTP 403 Forbidden with error "Only contractors can manage services"

**Admin Moderation:**
- **WHEN** an admin calls `PATCH /api/admin/services/:id/pause`
- **THEN** the system SHALL pause the service (transition ACTIVE → PAUSED)
- **AND** record audit log with admin userId

- **WHEN** an admin calls `GET /api/admin/services`
- **THEN** the system SHALL return all services (any visibility state) with full details

**Public Access:**
- **WHEN** an unauthenticated user calls `GET /api/services` or `GET /api/services/:id`
- **THEN** the system SHALL return only ACTIVE services with public fields only

**Security Validations:**
1. **Authentication:** All mutations require valid Clerk session
2. **Ownership:** Verify `service.contractorId === contractor.id` before modifications
3. **Role Verification:** Check `user.role === 'CONTRACTOR'` for create/update/delete operations
4. **Input Sanitization:** Validate all inputs with Zod before persistence; escape text fields for XSS prevention
5. **Rate Limiting:** (future) 10 service creations per day per contractor; 10 image uploads per hour

**Errors:**
- 401: Not authenticated
- 403: Not authorized (wrong role, not owner, not verified)

**Test Cases:**
TC-SERVICE-013, TC-SERVICE-019, TC-SERVICE-024, TC-SERVICE-026, TC-SERVICE-031, TC-SERVICE-032, TC-SERVICE-033, TC-SERVICE-034, TC-SERVICE-035, TC-SERVICE-036

---

#### RF-SRV-006: Admin Service Moderation

**Description:**
Admins can moderate service visibility and access all services for auditing purposes.

**Acceptance Criteria:**

**Pause Service:**
- **WHEN** an admin calls `PATCH /api/admin/services/:id/pause`
- **THEN** the system SHALL:
  - Update `visibilityStatus` to PAUSED
  - Record audit log: `{ adminUserId, action: 'PAUSE', serviceId, timestamp, reason? }`
  - Return HTTP 200 with updated service

**Unpause Service:**
- **WHEN** an admin calls `PATCH /api/admin/services/:id/unpause`
- **THEN** the system SHALL:
  - Update `visibilityStatus` to ACTIVE
  - Record audit log
  - Return HTTP 200 with updated service

**List All Services:**
- **WHEN** an admin calls `GET /api/admin/services`
- **THEN** the system SHALL:
  - Return all services (any visibility state)
  - Include full details (no field hiding)
  - Support filtering by visibility status, contractor, category
  - Support pagination

**Audit Logging:**
- All admin moderation actions SHALL be logged to a separate audit table (future enhancement) or logged via application logs

**Constraints:**
- Admins CANNOT edit service content (title, description, price) - only visibility status
- Admins CANNOT create services on behalf of contractors

**Errors:**
- 403: User is not ADMIN role

**Test Cases:**
TC-SERVICE-034

---

### Non-Functional Requirements

#### RNF-SRV-001: Performance

**Description:**
Service operations must meet performance targets for responsive user experience.

**Acceptance Criteria:**

**Service Creation:**
- **P95 latency ≤ 500ms** for `POST /api/services`
- Includes: validation, database insert, response serialization

**Service Listing (Paginated):**
- **P95 latency ≤ 300ms** for `GET /api/services` (20 results per page)
- Includes: database query with filters, pagination, response serialization

**Presigned URL Generation:**
- **P95 latency ≤ 200ms** for `POST /api/services/:id/images/upload-url`
- Includes: AWS SDK call, S3 key generation, response

**Image Upload to S3:**
- **Complete in < 5 seconds** for 5MB file (target, not strict SLA)
- Direct client-to-S3 upload; latency depends on client network

**Optimizations:**
- Database indexes on: `contractorId`, `visibilityStatus`, `categoryId`, `basePrice`
- Avoid N+1 queries; use Prisma `include` strategically
- Limit listing max results to 100 per page
- Consider caching active service listings (future enhancement)

**Load Testing:**
- k6 script simulating 100 concurrent users for 60 seconds
- Test scenarios: listing, detail view, service creation
- Validate P95/P99 latency targets

**Test Cases:**
TC-SERVICE-037, TC-SERVICE-038, TC-SERVICE-039, TC-SERVICE-040

---

#### RNF-SRV-002: Reliability and Error Handling

**Description:**
System must handle failures gracefully with clear error messages and retry mechanisms.

**Acceptance Criteria:**

**Upload Failures:**
- Client implements retry logic (3 attempts) for S3 upload failures
- Display clear error messages to user:
  - "Upload failed. Retrying... (attempt 2/3)"
  - "Upload failed after 3 attempts. Please try again later."

**Validation Errors:**
- Return structured error responses with field-specific messages:
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "title", "message": "Title must be at least 5 characters" },
      { "field": "basePrice", "message": "Price must be at least 50.00 MXN" }
    ]
  }
  ```

**Database Failures:**
- Return HTTP 500 with generic error (do not expose internal details)
- Log full error server-side for debugging
- Display user-friendly message: "Something went wrong. Please try again."

**S3 Failures:**
- If presigned URL generation fails → return HTTP 503 with "Image upload service temporarily unavailable"
- If S3 upload fails → client retries; if all fail → display error
- Orphaned files in S3 → scheduled cleanup job runs weekly (future)

**Idempotency:**
- Service creation: not idempotent (each POST creates new service)
- Image upload confirmation: idempotent (multiple confirmations with same s3Key do not create duplicates)

**Test Cases:**
TC-SERVICE-030

---

#### RNF-SRV-003: Security

**Description:**
Protect service data and prevent unauthorized access or malicious uploads.

**Acceptance Criteria:**

**Input Validation:**
- All inputs validated with Zod schemas before processing
- Text fields (title, description) sanitized to prevent XSS
- File uploads validated: MIME type, size, extension

**Authentication:**
- All mutation endpoints require valid Clerk session
- Token validation on every request

**Authorization:**
- Ownership checks on all write operations
- Role checks for contractor-only operations
- Admin role required for moderation endpoints

**S3 Security:**
- Presigned URLs expire after 1 hour
- Bucket policy blocks public write access
- Only authenticated service owners can generate presigned URLs
- Server-side validation of MIME type and size before generating URL
- (Future) S3 bucket configured to scan for malware

**Rate Limiting:**
- (Future) 10 service creations per day per contractor
- (Future) 10 image upload requests per hour per contractor

**Audit Logging:**
- Admin moderation actions logged with timestamp, admin ID, action, service ID
- (Future) All mutations logged to audit table

**HTTPS Only:**
- All API endpoints served over HTTPS (enforced by Vercel)

**Test Cases:**
TC-SERVICE-026, TC-SERVICE-027, TC-SERVICE-031, TC-SERVICE-032, TC-SERVICE-033, TC-SERVICE-035, TC-SERVICE-036

---

#### RNF-SRV-004: Usability and Accessibility

**Description:**
Service management UI must be accessible and usable for all contractors, including those with disabilities.

**Acceptance Criteria:**

**Accessibility (WCAG 2.1 AA):**

- **Keyboard Navigation:**
  - All interactive elements accessible via Tab
  - Focus indicators visible (`focus:ring-2 focus:ring-blue-500`)
  - Escape key closes modals
  - Enter/Space activates buttons

- **ARIA Labels:**
  - `aria-label` on all form inputs
  - `aria-invalid` on inputs with validation errors
  - `aria-describedby` linking errors to inputs
  - `role="alert"` on error messages

- **Screen Reader Support:**
  - Status announcements for async actions ("Servicio publicado exitosamente")
  - Alt text required for all service images
  - Form labels properly associated with inputs

- **Color Contrast:**
  - Text contrast ratio ≥ 4.5:1
  - UI component contrast ratio ≥ 3:1

**Responsive Design:**

- **Mobile (375px - 767px):**
  - Full-width inputs and buttons
  - Stacked layout for forms
  - Touch targets ≥ 44x44px

- **Tablet (768px - 1023px):**
  - 2-column grid for form fields
  - Responsive image gallery

- **Desktop (1024px+):**
  - Multi-column layouts
  - Sidebar navigation
  - Drag-and-drop image upload

**Usability:**

- **Empty States:**
  - "No tienes servicios publicados" message with CTA button
  - "Crea tu primer servicio" onboarding tooltip

- **Validation Feedback:**
  - Real-time field validation on blur
  - Clear error messages in Spanish
  - Field-level error indicators (red borders, icons)

- **Confirmations:**
  - "¿Publicar servicio? Será visible para todos los clientes" (publish)
  - "¿Eliminar servicio? Esta acción no se puede deshacer" (delete)
  - "¿Pausar servicio? Dejará de aparecer en búsquedas" (pause)

- **Loading States:**
  - Skeleton loaders while fetching data
  - Button loading spinners during async actions
  - Progress indicators for image uploads

**Test Cases:**
(To be added in E2E test suite for UI/UX validation)

---

## Data Model

### Database Schema

#### Service

**Purpose:** Store contractor service offerings with metadata, pricing, and visibility state.

```prisma
model Service {
  id                  String              @id @default(uuid())
  contractorId        String
  categoryId          String
  title               String              @db.VarChar(100)
  description         String              @db.VarChar(2000)
  basePrice           Decimal             @db.Decimal(10, 2)
  currency            String              @default("MXN") @db.VarChar(3)
  durationMinutes     Int                 @db.SmallInt
  visibilityStatus    VisibilityStatus    @default(DRAFT)
  lastPublishedAt     DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  contractor          ContractorProfile   @relation(fields: [contractorId], references: [id], onDelete: Cascade)
  category            ServiceCategory     @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  images              ServiceImage[]
  bookings            Booking[]           // Future: relation to booking module

  @@index([contractorId, visibilityStatus])
  @@index([categoryId, visibilityStatus])
  @@index([basePrice, visibilityStatus])
  @@index([visibilityStatus, lastPublishedAt])
  @@map("services")
}

enum VisibilityStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}
```

**Fields:**
- `id`: UUID primary key
- `contractorId`: Foreign key to ContractorProfile
- `categoryId`: Foreign key to ServiceCategory
- `title`: Service name (5-100 chars)
- `description`: Detailed description (50-2000 chars)
- `basePrice`: Starting price in MXN (50.00 - 50,000.00)
- `currency`: Currency code (MXN for MVP)
- `durationMinutes`: Estimated service duration (30-480 min)
- `visibilityStatus`: Publication state (DRAFT, ACTIVE, PAUSED, ARCHIVED)
- `lastPublishedAt`: Timestamp of most recent publication (NULL if never published)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Indexes:**
- `(contractorId, visibilityStatus)`: Fast lookup of contractor's services by state
- `(categoryId, visibilityStatus)`: Fast category filtering for public catalog
- `(basePrice, visibilityStatus)`: Fast price range filtering
- `(visibilityStatus, lastPublishedAt)`: Fast listing of recently published services

**Constraints:**
- `onDelete: Cascade` for contractor: if contractor profile deleted → services deleted
- `onDelete: Restrict` for category: prevent category deletion if services exist

---

#### ServiceCategory

**Purpose:** Hierarchical taxonomy of service categories (main + subcategories).

```prisma
model ServiceCategory {
  id            String            @id @default(uuid())
  parentId      String?
  name          String            @db.VarChar(100)
  slug          String            @unique @db.VarChar(100)
  description   String?           @db.VarChar(500)
  icon          String?           @db.VarChar(50)
  sortOrder     Int               @default(0) @db.SmallInt
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  parent        ServiceCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children      ServiceCategory[] @relation("CategoryHierarchy")
  services      Service[]

  @@index([slug])
  @@index([parentId, sortOrder])
  @@map("service_categories")
}
```

**Fields:**
- `id`: UUID primary key
- `parentId`: NULL for main categories, UUID for subcategories
- `name`: Display name (e.g., "Plomería", "Instalación")
- `slug`: URL-friendly identifier (e.g., "plomeria", "instalacion")
- `description`: Optional description for category
- `icon`: Optional icon name for UI (e.g., "wrench", "hammer")
- `sortOrder`: Display order within parent (0-based)
- `isActive`: Flag to hide categories without deleting
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Hierarchy:**
- Main categories: `parentId === NULL`
- Subcategories: `parentId === <parent UUID>`

**Seed Data (Examples):**
```typescript
Main Categories:
- Plomería (slug: plomeria)
  - Instalación (slug: plomeria-instalacion)
  - Reparación (slug: plomeria-reparacion)
  - Mantenimiento (slug: plomeria-mantenimiento)
- Electricidad (slug: electricidad)
  - Instalación (slug: electricidad-instalacion)
  - Reparación (slug: electricidad-reparacion)
- Carpintería (slug: carpinteria)
- Limpieza (slug: limpieza)
- Pintura (slug: pintura)
- Jardinería (slug: jardineria)
```

**Indexes:**
- `slug`: Fast lookup by URL slug
- `(parentId, sortOrder)`: Fast retrieval of subcategories in order

---

#### ServiceImage

**Purpose:** Store metadata for service images uploaded to S3.

```prisma
model ServiceImage {
  id          String   @id @default(uuid())
  serviceId   String
  s3Url       String   @db.VarChar(500)
  s3Key       String   @db.VarChar(500)
  order       Int      @db.SmallInt
  width       Int?     @db.SmallInt
  height      Int?     @db.SmallInt
  altText     String?  @db.VarChar(200)
  uploadedAt  DateTime @default(now())

  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId, order])
  @@map("service_images")
}
```

**Fields:**
- `id`: UUID primary key
- `serviceId`: Foreign key to Service
- `s3Url`: Full S3 URL (e.g., `https://reparaya-media-dev.s3.us-west-2.amazonaws.com/contractor-services/...`)
- `s3Key`: S3 object key (e.g., `contractor-services/{contractorId}/{serviceId}/{uuid}.jpg`)
- `order`: Display order (0-4 for up to 5 images)
- `width`, `height`: Image dimensions (optional, extracted client-side)
- `altText`: Accessibility description (optional, recommended)
- `uploadedAt`: Upload timestamp

**Indexes:**
- `(serviceId, order)`: Fast retrieval of images in display order

**Constraints:**
- `onDelete: Cascade`: If service deleted → images deleted

---

### DTOs and Types

#### ServiceDTO (Input)

```typescript
// Create Service
export interface CreateServiceDTO {
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
}

// Update Service
export interface UpdateServiceDTO {
  categoryId?: string;
  title?: string;
  description?: string;
  basePrice?: number;
  durationMinutes?: number;
}
```

#### ServiceResponseDTO (Output)

```typescript
// Public response (ACTIVE services only)
export interface ServicePublicResponseDTO {
  id: string;
  title: string;
  categoryId: string;
  category?: ServiceCategoryDTO;
  description: string;
  basePrice: number;
  currency: string;
  durationMinutes: number;
  images: ServiceImageDTO[];
  contractor: {
    id: string;
    businessName: string;
    verified: boolean;
  };
  lastPublishedAt: Date | null;
}

// Private response (owner/admin)
export interface ServiceFullResponseDTO extends ServicePublicResponseDTO {
  contractorId: string;
  visibilityStatus: VisibilityStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ServiceCategoryDTO

```typescript
export interface ServiceCategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  children?: ServiceCategoryDTO[];
}
```

#### ServiceImageDTO

```typescript
export interface ServiceImageDTO {
  id: string;
  s3Url: string;
  order: number;
  width?: number;
  height?: number;
  altText?: string;
}

// Upload request
export interface ImageUploadRequestDTO {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Upload response
export interface ImageUploadResponseDTO {
  presignedUrl: string;
  s3Key: string;
  expiresAt: Date;
}

// Confirm upload
export interface ImageConfirmDTO {
  s3Key: string;
  altText?: string;
  width?: number;
  height?: number;
}
```

---

## API Contracts

### Service CRUD Endpoints

#### `POST /api/services`

**Description:** Create a new service (initial state: DRAFT)

**Auth:** Requires CONTRACTOR role

**Request:**
```json
{
  "categoryId": "uuid",
  "title": "Reparación de tuberías",
  "description": "Servicio profesional de reparación de tuberías con garantía de 6 meses. Incluye materiales básicos.",
  "basePrice": 500.00,
  "durationMinutes": 120
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "contractorId": "uuid",
  "categoryId": "uuid",
  "title": "Reparación de tuberías",
  "description": "Servicio profesional de reparación...",
  "basePrice": 500.00,
  "currency": "MXN",
  "durationMinutes": 120,
  "visibilityStatus": "DRAFT",
  "images": [],
  "lastPublishedAt": null,
  "createdAt": "2025-11-20T10:00:00Z",
  "updatedAt": "2025-11-20T10:00:00Z"
}
```

**Errors:**
- `400`: Validation failed (invalid title, price, duration, description, category)
- `401`: Not authenticated
- `403`: Not CONTRACTOR role

---

#### `GET /api/services/:id`

**Description:** Get single service (public or owner)

**Auth:** Optional (public can read ACTIVE; owner can read any state)

**Response:** `200 OK`

**Public (ACTIVE service):**
```json
{
  "id": "uuid",
  "title": "Reparación de tuberías",
  "categoryId": "uuid",
  "category": {
    "id": "uuid",
    "name": "Plomería",
    "slug": "plomeria"
  },
  "description": "Servicio profesional de reparación...",
  "basePrice": 500.00,
  "currency": "MXN",
  "durationMinutes": 120,
  "images": [
    {
      "id": "uuid",
      "s3Url": "https://...",
      "order": 0,
      "altText": "Tubería reparada"
    }
  ],
  "contractor": {
    "id": "uuid",
    "businessName": "Plomería Profesional GDL",
    "verified": true
  },
  "lastPublishedAt": "2025-11-20T12:00:00Z"
}
```

**Owner (any state):**
(Same as public + additional fields)
```json
{
  ...,
  "contractorId": "uuid",
  "visibilityStatus": "DRAFT",
  "createdAt": "2025-11-20T10:00:00Z",
  "updatedAt": "2025-11-20T10:00:00Z"
}
```

**Errors:**
- `404`: Service not found or not public (if unauthenticated/non-owner)

---

#### `GET /api/services`

**Description:** List services (public catalog - ACTIVE only)

**Auth:** Public (no auth required)

**Query Parameters:**
- `category` (optional): UUID of ServiceCategory
- `minPrice` (optional): minimum price filter
- `maxPrice` (optional): maximum price filter
- `search` (optional): text search in title/description
- `page` (optional): pagination page (default: 1)
- `limit` (optional): results per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "services": [
    {
      "id": "uuid",
      "title": "Reparación de tuberías",
      "categoryId": "uuid",
      "description": "Servicio profesional...",
      "basePrice": 500.00,
      "currency": "MXN",
      "durationMinutes": 120,
      "images": [...],
      "contractor": {
        "id": "uuid",
        "businessName": "Plomería Profesional GDL",
        "verified": true
      },
      "lastPublishedAt": "2025-11-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Errors:**
- `400`: Invalid query parameters

---

#### `GET /api/services/me`

**Description:** List all services owned by authenticated contractor

**Auth:** Requires CONTRACTOR role

**Response:** `200 OK`
```json
{
  "services": [
    {
      "id": "uuid",
      "contractorId": "uuid",
      "title": "Reparación de tuberías",
      "visibilityStatus": "ACTIVE",
      "basePrice": 500.00,
      "currency": "MXN",
      "images": [...],
      "createdAt": "2025-11-20T10:00:00Z",
      "updatedAt": "2025-11-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "contractorId": "uuid",
      "title": "Instalación de lavabos",
      "visibilityStatus": "DRAFT",
      "basePrice": 800.00,
      "currency": "MXN",
      "images": [],
      "createdAt": "2025-11-19T14:00:00Z",
      "updatedAt": "2025-11-19T14:00:00Z"
    }
  ]
}
```

**Errors:**
- `401`: Not authenticated
- `403`: Not CONTRACTOR role

---

#### `PATCH /api/services/:id`

**Description:** Update service (owner only)

**Auth:** Requires CONTRACTOR role + ownership

**Request:**
```json
{
  "title": "Reparación de tuberías y drenajes",
  "basePrice": 550.00,
  "description": "Servicio actualizado con drenajes incluidos..."
}
```

**Response:** `200 OK`
(Updated service object)

**Errors:**
- `400`: Validation failed
- `401`: Not authenticated
- `403`: Not owner or not CONTRACTOR
- `404`: Service not found

---

#### `DELETE /api/services/:id`

**Description:** Delete service (soft-delete if published, hard-delete if never published)

**Auth:** Requires CONTRACTOR role + ownership

**Response:** `204 No Content`

**Logic:**
- If service is DRAFT and `lastPublishedAt === null` → hard delete (permanent)
- Otherwise → soft delete (set `visibilityStatus` to ARCHIVED)

**Errors:**
- `401`: Not authenticated
- `403`: Not owner or not CONTRACTOR
- `404`: Service not found

---

### Publication State Endpoints

#### `PATCH /api/services/:id/publish`

**Description:** Publish service (DRAFT → ACTIVE or PAUSED → ACTIVE)

**Auth:** Requires CONTRACTOR role + ownership + verified contractor

**Response:** `200 OK`
(Updated service with `visibilityStatus: ACTIVE`, `lastPublishedAt` updated)

**Validation:**
- Contractor must be verified (`ContractorProfile.verified === true`)
- Service must have at least 1 image
- All required fields must be valid

**Errors:**
- `400`: Publication requirements not met (no images, invalid fields)
- `403`: Contractor not verified or not owner
- `404`: Service not found

---

#### `PATCH /api/services/:id/pause`

**Description:** Pause service (ACTIVE → PAUSED)

**Auth:** Requires CONTRACTOR role + ownership OR ADMIN role

**Response:** `200 OK`
(Updated service with `visibilityStatus: PAUSED`)

**Errors:**
- `403`: Not owner and not admin
- `404`: Service not found
- `409`: Service not in ACTIVE state

---

### Image Upload Endpoints

#### `POST /api/services/:id/images/upload-url`

**Description:** Request presigned URL for S3 upload

**Auth:** Requires CONTRACTOR role + ownership

**Request:**
```json
{
  "fileName": "image1.jpg",
  "fileSize": 5242880,
  "mimeType": "image/jpeg"
}
```

**Response:** `200 OK`
```json
{
  "presignedUrl": "https://reparaya-media-dev.s3.us-west-2.amazonaws.com/...",
  "s3Key": "contractor-services/{contractorId}/{serviceId}/{uuid}.jpg",
  "expiresAt": "2025-11-20T13:00:00Z"
}
```

**Validation:**
- Service has < 5 images
- MIME type in: `image/jpeg`, `image/png`, `image/webp`
- File size ≤ 10 MB

**Errors:**
- `400`: Invalid metadata, max images exceeded, file too large
- `403`: Not owner
- `404`: Service not found

---

#### `POST /api/services/:id/images/confirm`

**Description:** Confirm image upload and save metadata

**Auth:** Requires CONTRACTOR role + ownership

**Request:**
```json
{
  "s3Key": "contractor-services/{contractorId}/{serviceId}/{uuid}.jpg",
  "altText": "Tubería reparada",
  "width": 1024,
  "height": 768
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "serviceId": "uuid",
  "s3Url": "https://...",
  "s3Key": "contractor-services/...",
  "order": 0,
  "width": 1024,
  "height": 768,
  "altText": "Tubería reparada",
  "uploadedAt": "2025-11-20T12:30:00Z"
}
```

**Errors:**
- `400`: S3 object not found, invalid s3Key
- `403`: Not owner
- `404`: Service not found

---

#### `DELETE /api/services/:id/images/:imageId`

**Description:** Delete service image

**Auth:** Requires CONTRACTOR role + ownership

**Response:** `204 No Content`

**Logic:**
- Delete ServiceImage record from database
- Delete S3 object (async, best-effort)

**Errors:**
- `403`: Not owner
- `404`: Service or image not found

---

### Admin Moderation Endpoints

#### `PATCH /api/admin/services/:id/pause`

**Description:** Admin pauses service (moderation)

**Auth:** Requires ADMIN role

**Request:**
```json
{
  "reason": "Servicio reportado por clientes"
}
```

**Response:** `200 OK`
(Updated service with `visibilityStatus: PAUSED`)

**Audit Log:**
```json
{
  "adminUserId": "uuid",
  "action": "PAUSE",
  "serviceId": "uuid",
  "reason": "Servicio reportado por clientes",
  "timestamp": "2025-11-20T14:00:00Z"
}
```

**Errors:**
- `403`: Not ADMIN role
- `404`: Service not found

---

#### `PATCH /api/admin/services/:id/unpause`

**Description:** Admin unpauses service

**Auth:** Requires ADMIN role

**Response:** `200 OK`
(Updated service with `visibilityStatus: ACTIVE`)

**Errors:**
- `403`: Not ADMIN role
- `404`: Service not found

---

#### `GET /api/admin/services`

**Description:** List all services (any visibility state)

**Auth:** Requires ADMIN role

**Query Parameters:**
- `status` (optional): filter by VisibilityStatus
- `contractorId` (optional): filter by contractor
- `categoryId` (optional): filter by category
- `page`, `limit`: pagination

**Response:** `200 OK`
(Array of services with full details, all visibility states)

**Errors:**
- `403`: Not ADMIN role

---

## State Machine Diagram

### Service Visibility States

```
┌─────────────────────────────────────────────────────────────────┐
│                         Service Lifecycle                        │
└─────────────────────────────────────────────────────────────────┘

                             [Create Service]
                                    │
                                    ▼
                              ┌──────────┐
                              │  DRAFT   │ ◄─────────┐
                              └──────────┘           │
                                    │                │
                                    │ publish()      │ unpublish()
                                    │ Requirements:  │
                                    │ - verified     │
                                    │ - has images   │
                                    │ - valid data   │
                                    ▼                │
                              ┌──────────┐           │
                         ┌───►│  ACTIVE  │───────────┤
                         │    └──────────┘           │
                         │         │                 │
                reactivate()    pause()           unpublish()
                         │         │                 │
                         │         ▼                 │
                         │    ┌──────────┐           │
                         └────│  PAUSED  │───────────┘
                              └──────────┘
                                    │
                                    │ archive()
                                    │ (soft delete)
                                    ▼
                              ┌──────────┐
                              │ ARCHIVED │
                              └──────────┘
                                    │
                                    │ (admin restore)
                                    │ (future)
                                    ▼
                              ┌──────────┐
                              │  ACTIVE  │
                              └──────────┘
```

### Business Rules for State Transitions

**DRAFT → ACTIVE (publish):**
```typescript
function canPublish(service: Service, contractor: ContractorProfile): boolean {
  return (
    contractor.verified === true &&
    service.images.length >= 1 &&
    service.title.length >= 5 &&
    service.description.length >= 50 &&
    service.basePrice >= 50.00 &&
    service.basePrice <= 50000.00 &&
    service.durationMinutes >= 30 &&
    service.durationMinutes <= 480 &&
    service.categoryId !== null
  );
}
```

**ACTIVE → PAUSED (pause):**
```typescript
function canPause(user: User, service: Service): boolean {
  return (
    (user.role === 'CONTRACTOR' && user.contractorId === service.contractorId) ||
    user.role === 'ADMIN'
  );
}
```

**PAUSED → ACTIVE (reactivate):**
```typescript
function canReactivate(service: Service, contractor: ContractorProfile): boolean {
  return canPublish(service, contractor); // Same requirements as initial publish
}
```

**ACTIVE/PAUSED → DRAFT (unpublish):**
```typescript
function canUnpublish(service: Service): boolean {
  // Future: check no active/pending bookings
  return true; // For now, always allowed
}
```

**ANY → ARCHIVED (soft delete):**
```typescript
function canArchive(user: User, service: Service): boolean {
  return (
    (user.role === 'CONTRACTOR' && user.contractorId === service.contractorId) ||
    user.role === 'ADMIN'
  );
}
```

---

## Security and Authorization

### Access Control Matrix

| Action | CONTRACTOR (Owner) | CONTRACTOR (Other) | CLIENT | ADMIN | Public |
|--------|--------------------|--------------------|--------|-------|--------|
| **Create Service** | ✅ | ✅ (own services) | ❌ | ❌ | ❌ |
| **Read ACTIVE Service** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Read DRAFT/PAUSED Service** | ✅ (own) | ❌ | ❌ | ✅ | ❌ |
| **Update Service** | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| **Delete Service** | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| **Publish Service** | ✅ (own, if verified) | ❌ | ❌ | ❌ | ❌ |
| **Pause Service** | ✅ (own) | ❌ | ❌ | ✅ | ❌ |
| **Upload Image** | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| **Admin Moderation** | ❌ | ❌ | ❌ | ✅ | ❌ |

### Security Validations

**1. Authentication:**
- All mutation endpoints require valid Clerk session
- Extract user ID and role from session token
- Verify session not expired

**2. Authorization:**
- **Ownership Check:** Verify `service.contractorId === user.contractorId` before modifications
- **Role Check:** Verify `user.role === 'CONTRACTOR'` for service management operations
- **Verification Check:** Verify `contractor.verified === true` for publication
- **Admin Check:** Verify `user.role === 'ADMIN'` for moderation endpoints

**3. Input Sanitization:**
- Validate all inputs with Zod schemas before processing
- Escape HTML in text fields (title, description) to prevent XSS
- Validate MIME types and file sizes for image uploads
- Validate UUIDs format for IDs

**4. Rate Limiting (Future):**
- Limit service creations: 10 per day per contractor
- Limit image uploads: 10 per hour per contractor
- Limit API calls: 100 per minute per IP (DDoS protection)

**5. S3 Security:**
- Presigned URLs expire after 1 hour
- Server-side validation of MIME type and size before generating URL
- Bucket policy blocks public write access
- (Future) Malware scanning on uploaded files

**6. Audit Logging:**
- Log all admin moderation actions (timestamp, admin ID, action, service ID, reason)
- Log failed authorization attempts (potential security threat)
- (Future) Store audit logs in separate table for compliance

**7. HTTPS Only:**
- All API endpoints served over HTTPS (enforced by Vercel)
- Presigned URLs use HTTPS

---

## Testing Strategy

### Test Coverage Goals

- **Minimum code coverage:** ≥ 70% in `src/modules/services`
- **Recommended coverage:** ≥ 80% for critical paths (state transitions, authorization, publication logic)
- **Integration tests:** All API endpoints with authentication scenarios
- **Unit tests:** Service layer, validators, state machine logic
- **E2E tests:** Critical flows (create → upload images → publish → pause)
- **Performance tests:** k6 scripts for listing, detail, creation endpoints

### Test Cases Summary

All test cases are documented in `/docs/md/STP-ReparaYa.md` section **4.1.X: Gestión de Servicios del Contratista**.

#### Unit Tests (Service Logic & Validation)

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-SERVICE-001 | Validate service creation with valid data | Unitaria | Alta | RF-SRV-001 |
| TC-SERVICE-002 | Reject service creation with invalid title (< 5 chars) | Unitaria | Alta | RF-SRV-001 |
| TC-SERVICE-003 | Reject service creation with invalid price (< 50 MXN) | Unitaria | Alta | RF-SRV-001 |
| TC-SERVICE-004 | Reject service creation with invalid duration (< 30 min) | Unitaria | Alta | RF-SRV-001 |
| TC-SERVICE-005 | Validate state transition DRAFT → ACTIVE with all requirements | Unitaria | Alta | RF-SRV-003 |
| TC-SERVICE-006 | Block state transition DRAFT → ACTIVE if contractor unverified | Unitaria | Alta | RF-SRV-003 |
| TC-SERVICE-007 | Block state transition DRAFT → ACTIVE if missing images | Unitaria | Alta | RF-SRV-003 |
| TC-SERVICE-008 | Allow state transition ACTIVE ↔ PAUSED | Unitaria | Media | RF-SRV-003 |
| TC-SERVICE-009 | Validate image metadata (MIME type, size) | Unitaria | Alta | RF-SRV-004 |
| TC-SERVICE-010 | Reject image upload exceeding 10 MB limit | Unitaria | Alta | RF-SRV-004 |
| TC-SERVICE-011 | Reject image upload if service already has 5 images | Unitaria | Media | RF-SRV-004 |

#### Integration Tests (API Endpoints)

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-SERVICE-012 | POST /api/services creates service for authenticated contractor | Integración | Alta | RF-SRV-001 |
| TC-SERVICE-013 | POST /api/services returns 403 for non-contractor users | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-014 | POST /api/services returns 400 for invalid payload | Integración | Alta | RF-SRV-001 |
| TC-SERVICE-015 | GET /api/services/:id returns ACTIVE service to public | Integración | Alta | RF-SRV-002 |
| TC-SERVICE-016 | GET /api/services/:id returns 404 for DRAFT service to non-owner | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-017 | GET /api/services/me returns all owned services to contractor | Integración | Alta | RF-SRV-002 |
| TC-SERVICE-018 | PATCH /api/services/:id updates service for owner | Integración | Alta | RF-SRV-001 |
| TC-SERVICE-019 | PATCH /api/services/:id returns 403 for non-owner | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-020 | PATCH /api/services/:id/publish transitions DRAFT → ACTIVE | Integración | Alta | RF-SRV-003 |
| TC-SERVICE-021 | PATCH /api/services/:id/publish returns 400 if requirements unmet | Integración | Alta | RF-SRV-003 |
| TC-SERVICE-022 | PATCH /api/services/:id/pause transitions ACTIVE → PAUSED | Integración | Media | RF-SRV-003 |
| TC-SERVICE-023 | DELETE /api/services/:id soft-deletes service for owner | Integración | Media | RF-SRV-001 |
| TC-SERVICE-024 | DELETE /api/services/:id returns 403 for non-owner | Integración | Alta | RF-SRV-005 |

#### Image Upload Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-SERVICE-025 | POST /api/services/:id/images/upload-url generates presigned URL | Integración | Alta | RF-SRV-004 |
| TC-SERVICE-026 | POST /api/services/:id/images/upload-url validates ownership | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-027 | POST /api/services/:id/images/upload-url rejects invalid MIME type | Integración | Alta | RF-SRV-004 |
| TC-SERVICE-028 | POST /api/services/:id/images/confirm saves image metadata | Integración | Alta | RF-SRV-004 |
| TC-SERVICE-029 | DELETE /api/services/:id/images/:imageId removes image from S3 | Integración | Media | RF-SRV-004 |
| TC-SERVICE-030 | Image upload failure retries 3 times before error | Unitaria | Media | RNF-SRV-002 |

#### Authorization & Security Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-SERVICE-031 | Verify only CONTRACTOR role can create services | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-032 | Verify service owner can edit own services | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-033 | Verify non-owner cannot edit other contractor's services | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-034 | Verify ADMIN can pause services (moderation) | Integración | Media | RF-SRV-006 |
| TC-SERVICE-035 | Verify CLIENT cannot create or edit services | Integración | Alta | RF-SRV-005 |
| TC-SERVICE-036 | Verify unauthenticated users can only read ACTIVE services | Integración | Alta | RF-SRV-005 |

#### Performance & Non-Functional Tests

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-SERVICE-037 | Service creation completes in < 500ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| TC-SERVICE-038 | Service listing (paginated) completes in < 300ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| TC-SERVICE-039 | Presigned URL generation completes in < 200ms (P95) | Performance (k6) | Media | RNF-SRV-001 |
| TC-SERVICE-040 | Image upload to S3 completes in < 5s for 5MB file | Performance (k6) | Baja | RNF-SRV-002 |

### Test Implementation Strategy

**Files to Create:**
```
src/modules/services/__tests__/
├── serviceService.test.ts          # Business logic unit tests
├── serviceRepository.test.ts       # Data access unit tests
├── validators.test.ts              # Zod schema validation tests
└── stateMachine.test.ts            # State transition logic tests

tests/integration/api/
├── services.test.ts                # CRUD endpoint integration tests
├── services-images.test.ts         # Image upload integration tests
└── admin-services.test.ts          # Admin moderation integration tests

tests/performance/
└── services-load.js                # k6 performance tests

tests/e2e/
└── contractor-services.spec.ts     # Playwright E2E tests
```

**Mocks and Fixtures:**
- Mock Clerk SDK for authentication (use existing pattern from contractor tests)
- Mock AWS S3 SDK (`@aws-sdk/client-s3`) for presigned URL generation
- Fixtures for service data (DRAFT, ACTIVE, PAUSED states)
- Fixtures for contractor profiles (verified and unverified)
- Fixtures for service categories (seeded before tests)

**Integration Test Database:**
- Use test database with Prisma migrations applied
- Seed service categories before tests run
- Clean up services after each test suite
- Use transactions for test isolation

### Acceptance Criteria for Testing

Before archiving this change (`/openspec:archive`):

- ✅ All 40 test cases documented in STP before implementation starts
- ✅ Unit tests achieve ≥ 70% coverage in `src/modules/services`
- ✅ Integration tests achieve ≥ 80% coverage of API endpoints
- ✅ All tests pass in CI/CD pipeline
- ✅ No regression in existing contractor profile tests
- ✅ Performance tests validate P95 latency targets
- ✅ Security tests confirm authorization rules enforced
- ✅ STP updated with test execution results

---

## Environment Variables

### Existing Variables (Already Configured)

All necessary AWS variables are already configured in `.env`:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_MEDIA=reparaya-media-dev
```

### Proposed New Variables (Optional, Recommended)

These improve configurability and maintainability:

```env
# Image Upload Limits
AWS_S3_MAX_IMAGE_SIZE_MB=10
AWS_S3_MAX_IMAGES_PER_SERVICE=5
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600

# Image Processing (Future Enhancement)
AWS_S3_CONTRACTOR_SERVICE_PREFIX=contractor-services/
```

**Justification:**
- Makes limits adjustable without code changes
- Facilitates different configurations for dev/staging/prod
- Self-documenting configuration

**If not added:** Hardcode these values in `/lib/aws/s3Config.ts` with clear comments for future extraction.

---

## Related Documents

- **Contractor Profile Spec:** `openspec/specs/profiles/spec.md`
- **Contractor Location Spec:** `openspec/specs/contractor-location/spec.md`
- **Contractor Availability Spec:** `openspec/specs/contractor-availability/spec.md`
- **Project Architecture:** `openspec/project.md`
- **Test Plan:** `docs/md/STP-ReparaYa.md`
- **Environment Configuration:** `.env.example`

---

## Future Enhancements

### v2: Service Availability Scheduling

- Link services to contractor availability slots
- Allow clients to see available time slots when booking
- Automatic validation of service duration against available slots

### v3: Dynamic Pricing Rules

- Surge pricing based on demand
- Seasonal discounts
- Package deals (multiple services bundled)
- Coupon codes and promotions

### v4: Service Variants

- Size-based pricing (small/medium/large jobs)
- Add-ons and extras (materials, emergency service, same-day)
- Custom pricing calculator

### v5: Multi-Currency Support

- Support USD and other currencies
- Real-time exchange rate conversion
- Stripe multi-currency configuration

### v6: Advanced Image Processing

- Automatic resizing and optimization
- Watermarking for contractor branding
- Format conversion (WebP, AVIF)
- Image CDN with CloudFront

### v7: AI-Powered Recommendations

- Suggest optimal pricing based on market analysis
- Recommend service descriptions based on successful listings
- Auto-categorization of services using ML

### v8: Contractor Portfolios

- Separate portfolio section with past work photos
- Before/after galleries
- Client testimonials linked to services

---

## Appendix

### Glossary

- **Service:** A specific offering by a contractor (e.g., "Reparación de tuberías")
- **Service Category:** Taxonomic classification (e.g., "Plomería" → "Reparación")
- **Visibility Status:** Publication state (DRAFT, ACTIVE, PAUSED, ARCHIVED)
- **Presigned URL:** Time-limited URL for direct S3 uploads without exposing AWS credentials
- **Soft Delete:** Marking record as deleted (ARCHIVED) without permanently removing data
- **Hard Delete:** Permanent removal of record from database

### References

- **Proposal:** `openspec/changes/2025-11-19-contractor-services-crud/proposal.md`
- **STP:** `/docs/md/STP-ReparaYa.md`
- **Project Context:** `/openspec/project.md`
- **Prisma Schema:** `/apps/web/prisma/schema.prisma`
- **AWS S3 Documentation:** https://docs.aws.amazon.com/s3/
- **Clerk Documentation:** https://clerk.com/docs

---

**Version:** 1.0
**Date:** 2025-11-20
**Status:** Draft (pending approval)
**Author:** Claude Code (AI Development Assistant)
**Based on Proposal:** `openspec/changes/2025-11-19-contractor-services-crud/proposal.md`
