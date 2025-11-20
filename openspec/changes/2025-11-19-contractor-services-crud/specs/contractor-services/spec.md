# Contractor Services Specification

**Module:** `contractor-services`
**Version:** 1.0.0
**Status:** Proposed
**Last Updated:** 2025-11-20

---

## Purpose & Scope

This specification defines the service catalog functionality for ReparaYa contractors, enabling them to create, manage, and publish service offerings that clients can discover and book.

**In Scope:**
- CRUD operations for contractor services
- Service publication state machine (DRAFT → ACTIVE → PAUSED)
- Service category taxonomy
- Image upload preparation (AWS S3 presigned URLs)
- Authorization and ownership validation

**Out of Scope:**
- Service availability scheduling (see `availability` spec)
- Client booking flow (see `booking-checkout` spec)
- Payment processing (see `payments-webhooks` spec)
- Service reviews and ratings (see `ratings-reviews` spec)

---

## ADDED Requirements

### Requirement: Service CRUD Operations

The system SHALL allow contractors to create, read, update, and delete their service offerings with comprehensive metadata including title, category, description, pricing, duration, and state management.

#### Scenario: Contractor creates a new service draft

```gherkin
Given a verified contractor is authenticated
When they submit a new service with:
  - title: "Reparación de Fugas de Agua"
  - categoryId: valid category UUID
  - description: "Reparación profesional de fugas en tuberías..."
  - basePrice: 500.00
  - currency: MXN
  - durationMinutes: 120
Then the service is created with status DRAFT
And the service is not visible in public catalog
And the contractor can edit all fields without restrictions
```

#### Scenario: Contractor updates an existing DRAFT service

```gherkin
Given a contractor owns a service in DRAFT status
When they update the title to "Reparación de Fugas 24/7"
Then the service is updated immediately
And no validation is triggered (DRAFT allows free editing)
```

#### Scenario: Contractor attempts to delete service with active bookings

```gherkin
Given a contractor owns a service in ACTIVE status
And the service has 2 active bookings
When they attempt to delete the service
Then the operation fails with error "Cannot delete service with active bookings"
And the service remains in ACTIVE status
```

#### Scenario: Contractor soft-deletes a service with no bookings

```gherkin
Given a contractor owns a service in PAUSED status
And the service has no active bookings
When they delete the service
Then the service status changes to ARCHIVED
And the service is hidden from all listings
And the service can be restored by admins only
```

---

### Requirement: Service Retrieval & Filtering

The system SHALL provide different service views for public users, contractors (owners), and admins with appropriate data filtering based on role and ownership.

#### Scenario: Public user retrieves active services

```gherkin
Given multiple services exist:
  - Service A: ACTIVE (contractor_id: user-1)
  - Service B: DRAFT (contractor_id: user-2)
  - Service C: PAUSED (contractor_id: user-3)
When an unauthenticated user calls GET /api/services
Then only Service A is returned
And the response includes only public fields (id, title, description, basePrice, images)
And private fields (contractorProfile details) are excluded
```

#### Scenario: Contractor retrieves own services

```gherkin
Given contractor user-2 is authenticated
And they own 3 services:
  - Service B1: DRAFT
  - Service B2: ACTIVE
  - Service B3: PAUSED
When they call GET /api/services/me
Then all 3 services are returned regardless of status
And each service includes full details (including timestamps, visibility status)
```

#### Scenario: Admin retrieves all services for moderation

```gherkin
Given an admin user is authenticated
When they call GET /api/admin/services
Then all services across all contractors are returned
And each service includes moderation metadata (contractor verification status)
```

---

### Requirement: Service Publication State Machine

The system SHALL enforce a state machine for services with transitions (DRAFT, ACTIVE, PAUSED, ARCHIVED) and business rule validation at each transition point.

#### Scenario: Contractor publishes a service successfully

```gherkin
Given a contractor is verified (ContractorProfile.verified = true)
And they own a service in DRAFT status with:
  - title: "Electricidad Residencial"
  - categoryId: valid UUID
  - description: (valid 100-char description)
  - basePrice: 800.00
  - durationMinutes: 180
  - images: [ "https://s3.../image1.jpg" ] (1 image uploaded)
When they call PATCH /api/services/{id}/publish
Then the service status changes to ACTIVE
And lastPublishedAt is set to current timestamp
And the service becomes visible in public catalog
```

#### Scenario: Unverified contractor attempts to publish service

```gherkin
Given a contractor is NOT verified (ContractorProfile.verified = false)
And they own a service in DRAFT status with all required fields
When they call PATCH /api/services/{id}/publish
Then the operation fails with 403 Forbidden
And the error message is "Only verified contractors can publish services"
And the service remains in DRAFT status
```

#### Scenario: Contractor attempts to publish service without images

```gherkin
Given a verified contractor owns a service in DRAFT status
And the service has 0 images uploaded
When they call PATCH /api/services/{id}/publish
Then the operation fails with 400 Bad Request
And the error message is "At least 1 image is required to publish"
And the service remains in DRAFT status
```

#### Scenario: Contractor pauses an active service

```gherkin
Given a contractor owns a service in ACTIVE status
When they call PATCH /api/services/{id}/pause
Then the service status changes to PAUSED
And the service is hidden from public catalog
And existing bookings remain valid (if any)
```

#### Scenario: Contractor reactivates a paused service

```gherkin
Given a contractor owns a service in PAUSED status
And the service meets all publication requirements
When they call PATCH /api/services/{id}/publish
Then the service status changes to ACTIVE
And the service becomes visible in public catalog again
```

---

### Requirement: Image Upload & Management

The system SHALL allow contractors to upload service images to AWS S3 via presigned URLs with validation for file type, size, and quantity.

#### Scenario: Contractor requests presigned URL for image upload

```gherkin
Given a contractor owns a service with 2 existing images
When they call POST /api/services/{id}/images/upload-url with metadata:
  - fileName: "kitchen-repair.jpg"
  - fileType: "image/jpeg"
  - fileSize: 3145728 (3 MB)
Then a presigned PUT URL is generated with 1-hour expiry
And the URL allows direct upload to S3 path: contractor-services/{contractorId}/{serviceId}/{uuid}.jpg
And the response includes upload instructions
```

#### Scenario: Contractor exceeds maximum image limit

```gherkin
Given a contractor owns a service with 5 existing images (max limit)
When they call POST /api/services/{id}/images/upload-url
Then the operation fails with 400 Bad Request
And the error message is "Maximum 5 images per service"
```

#### Scenario: Contractor uploads invalid file type

```gherkin
Given a contractor owns a service
When they call POST /api/services/{id}/images/upload-url with:
  - fileType: "application/pdf"
Then the operation fails with 400 Bad Request
And the error message is "Only image files (JPEG, PNG, WebP) are allowed"
```

#### Scenario: Contractor confirms successful image upload

```gherkin
Given a contractor received a presigned URL
And they successfully uploaded an image to S3
When they call POST /api/services/{id}/images/confirm with:
  - s3Key: "contractor-services/user-123/service-456/uuid-789.jpg"
  - s3Url: "https://reparaya-media-dev.s3.amazonaws.com/..."
  - width: 1200
  - height: 900
  - altText: "Before photo of plumbing issue"
Then a ServiceImage record is created in the database
And the image is linked to the service
And the image order is set to the next available position (0-4)
```

#### Scenario: Contractor deletes an uploaded image

```gherkin
Given a contractor owns a service with 3 images
And imageId "img-123" belongs to this service
When they call DELETE /api/services/{id}/images/{imageId}
Then the ServiceImage record is soft-deleted (or marked for cleanup)
And the S3 object is scheduled for deletion (future: cleanup job)
And remaining images maintain their display order
```

---

### Requirement: Authorization & Ownership Validation

The system SHALL enforce strict ownership validation and role-based access control for all service mutations to prevent unauthorized access.

#### Scenario: Contractor creates a service (requires CONTRACTOR role)

```gherkin
Given a user with role CLIENT is authenticated
When they call POST /api/services with valid service data
Then the operation fails with 403 Forbidden
And the error message is "Only contractors can create services"
```

#### Scenario: Contractor edits own service successfully

```gherkin
Given contractor user-1 is authenticated
And they own service "service-abc"
When they call PATCH /api/services/service-abc with updated data
Then the service is updated successfully
```

#### Scenario: Contractor attempts to edit another contractor's service

```gherkin
Given contractor user-1 is authenticated
And service "service-xyz" is owned by contractor user-2
When contractor user-1 calls PATCH /api/services/service-xyz
Then the operation fails with 403 Forbidden
And the error message is "You can only edit your own services"
```

#### Scenario: Admin pauses a service for moderation

```gherkin
Given an admin user is authenticated
And service "service-abc" is owned by contractor user-1
And the service is in ACTIVE status
When the admin calls PATCH /api/admin/services/service-abc/pause
Then the service status changes to PAUSED
And an audit log entry is created (admin action)
And the contractor is notified (future: email/notification)
```

---

### Requirement: Admin Moderation Controls

The system SHALL allow administrators to pause or archive services for content moderation without deleting contractor data.

#### Scenario: Admin pauses inappropriate service

```gherkin
Given an admin user is authenticated
And service "service-bad" contains inappropriate content
And the service is in ACTIVE status
When the admin calls PATCH /api/admin/services/service-bad/pause
Then the service status changes to PAUSED
And the service is hidden from public catalog
And the original contractor can still view the service in their dashboard
```

---

### Requirement: Performance Requirements

The system SHALL meet performance targets for service CRUD operations to ensure responsive user experience.

#### Scenario: Service creation completes within latency target

```gherkin
Given a contractor submits a valid service creation request
When the request is processed
Then the operation completes in ≤ 500ms (P95)
And the database transaction is committed atomically
```

#### Scenario: Service listing query is optimized

```gherkin
Given a public user requests active services
When the query executes with pagination (20 items per page)
Then the query completes in ≤ 300ms (P95)
And results are sorted by lastPublishedAt DESC
And the query uses database indexes on (status, lastPublishedAt)
```

---

### Requirement: Image Upload Reliability

The system SHALL handle image upload failures gracefully with retry logic and clear error messaging.

#### Scenario: S3 upload fails due to network timeout

```gherkin
Given a contractor is uploading a 5MB image
And the S3 upload fails on first attempt (network timeout)
When the client automatically retries (up to 3 attempts)
Then the upload succeeds on retry #2
And the user is notified of the retry attempt
```

---

## Data Model

### Prisma Schema Additions

```prisma
// Service category taxonomy
model ServiceCategory {
  id          String   @id @default(uuid())
  name        String   // "Plomería", "Electricidad", etc.
  slug        String   @unique  // "plomeria", "electricidad"
  description String
  iconUrl     String?
  parentId    String?

  parent      ServiceCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ServiceCategory[] @relation("CategoryHierarchy")
  services    Service[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
  @@index([parentId])
}

// Contractor service offerings
model Service {
  id                String          @id @default(uuid())
  contractorId      String          // FK to User (must have role: CONTRACTOR)
  categoryId        String          // FK to ServiceCategory

  title             String          @db.VarChar(100)
  description       String          @db.Text
  basePrice         Decimal         @db.Decimal(12, 2)  // Min: 50.00, Max: 50000.00
  currency          Currency        @default(MXN)
  durationMinutes   Int             // Min: 30, Max: 480
  visibilityStatus  ServiceStatus   @default(DRAFT)

  lastPublishedAt   DateTime?       // Set when transitioned to ACTIVE
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  contractor        User            @relation(fields: [contractorId], references: [id], onDelete: Cascade)
  category          ServiceCategory @relation(fields: [categoryId], references: [id])
  images            ServiceImage[]

  @@index([contractorId, visibilityStatus])
  @@index([categoryId, visibilityStatus])
  @@index([visibilityStatus, lastPublishedAt])
}

// Service images stored in AWS S3
model ServiceImage {
  id          String   @id @default(uuid())
  serviceId   String   // FK to Service

  s3Url       String   @db.Text      // Full S3 URL
  s3Key       String   @db.Text      // S3 object key for deletion
  order       Int      @default(0)   // Display order 0-4
  width       Int?                   // Image dimensions (if available)
  height      Int?
  altText     String?  @db.VarChar(255)  // Accessibility description

  uploadedAt  DateTime @default(now())

  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId, order])
}

// Enums
enum ServiceStatus {
  DRAFT       // Under construction, not public
  ACTIVE      // Published and discoverable
  PAUSED      // Temporarily hidden
  ARCHIVED    // Soft-deleted
}

enum Currency {
  MXN         // Mexican Peso (only supported currency in MVP)
}
```

---

## API Contracts

### Public Endpoints

#### `GET /api/services`
**Description:** List all active services (public catalog)
**Auth:** None required
**Query Params:**
- `categoryId` (optional): Filter by category UUID
- `page` (optional, default: 1): Pagination page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200 OK):**
```json
{
  "services": [
    {
      "id": "uuid",
      "title": "Reparación de Fugas",
      "description": "Reparación profesional...",
      "basePrice": 500.00,
      "currency": "MXN",
      "durationMinutes": 120,
      "categoryName": "Plomería",
      "images": [
        {
          "url": "https://s3.../image1.jpg",
          "altText": "Photo description"
        }
      ],
      "contractorName": "Juan Pérez",
      "contractorRating": 4.8
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

#### `GET /api/services/:id`
**Description:** Get single service details (only if ACTIVE for public)
**Auth:** None required
**Response (200 OK):** Same structure as list item above
**Response (404 Not Found):** If service is DRAFT/PAUSED/ARCHIVED or doesn't exist

---

### Contractor Endpoints

#### `POST /api/services`
**Description:** Create a new service draft
**Auth:** Required (role: CONTRACTOR)
**Request Body:**
```json
{
  "title": "Reparación de Fugas de Agua",
  "categoryId": "uuid",
  "description": "Descripción detallada del servicio...",
  "basePrice": 500.00,
  "currency": "MXN",
  "durationMinutes": 120
}
```
**Response (201 Created):**
```json
{
  "id": "uuid",
  "visibilityStatus": "DRAFT",
  ...
}
```

#### `GET /api/services/me`
**Description:** List all services owned by authenticated contractor
**Auth:** Required (role: CONTRACTOR)
**Response (200 OK):** Array of all services (any status)

#### `PATCH /api/services/:id`
**Description:** Update service details (only owner)
**Auth:** Required (role: CONTRACTOR, must be owner)
**Request Body:** Partial service data
**Response (200 OK):** Updated service

#### `PATCH /api/services/:id/publish`
**Description:** Publish service (DRAFT → ACTIVE or PAUSED → ACTIVE)
**Auth:** Required (role: CONTRACTOR, must be owner + verified)
**Response (200 OK):** Service with visibilityStatus: ACTIVE
**Response (400 Bad Request):** If validation fails (missing images, unverified)

#### `PATCH /api/services/:id/pause`
**Description:** Pause service (ACTIVE → PAUSED)
**Auth:** Required (role: CONTRACTOR, must be owner)
**Response (200 OK):** Service with visibilityStatus: PAUSED

#### `DELETE /api/services/:id`
**Description:** Soft-delete service (→ ARCHIVED)
**Auth:** Required (role: CONTRACTOR, must be owner)
**Response (204 No Content)**
**Response (400 Bad Request):** If service has active bookings

---

### Image Upload Endpoints

#### `POST /api/services/:id/images/upload-url`
**Description:** Request presigned URL for S3 upload
**Auth:** Required (role: CONTRACTOR, must be owner)
**Request Body:**
```json
{
  "fileName": "kitchen-before.jpg",
  "fileType": "image/jpeg",
  "fileSize": 3145728
}
```
**Response (200 OK):**
```json
{
  "uploadUrl": "https://reparaya-media-dev.s3.amazonaws.com/...",
  "s3Key": "contractor-services/user-123/service-456/uuid.jpg",
  "expiresIn": 3600
}
```

#### `POST /api/services/:id/images/confirm`
**Description:** Confirm successful upload and save metadata
**Auth:** Required (role: CONTRACTOR, must be owner)
**Request Body:**
```json
{
  "s3Key": "contractor-services/...",
  "s3Url": "https://...",
  "width": 1200,
  "height": 900,
  "altText": "Before photo"
}
```
**Response (201 Created):** ServiceImage object

#### `DELETE /api/services/:id/images/:imageId`
**Description:** Delete image from service
**Auth:** Required (role: CONTRACTOR, must be owner)
**Response (204 No Content)**

---

### Admin Endpoints

#### `GET /api/admin/services`
**Description:** List all services across all contractors
**Auth:** Required (role: ADMIN)
**Response (200 OK):** Array of all services with moderation metadata

#### `PATCH /api/admin/services/:id/pause`
**Description:** Admin pause service for moderation
**Auth:** Required (role: ADMIN)
**Response (200 OK):** Service with visibilityStatus: PAUSED

---

## Security Considerations

1. **Ownership Validation:** Every mutation endpoint MUST verify that the authenticated user owns the service before allowing modifications
2. **Role-Based Access:** CREATE operations restricted to CONTRACTOR role only; ADMIN operations restricted to ADMIN role
3. **Publication Gating:** Only verified contractors (ContractorProfile.verified = true) can publish services to ACTIVE status
4. **S3 Presigned URLs:** Generated server-side with 1-hour expiry; never expose AWS credentials to client
5. **Image Validation:** Server-side MIME type validation; client-side file size checks
6. **Rate Limiting:** Image upload endpoints limited to 10 uploads/hour per contractor (future enhancement)
7. **Input Sanitization:** All text fields sanitized to prevent XSS; HTML tags stripped from title/description

---

## Testing Strategy

See `/docs/md/STP-ReparaYa.md` section 4.1.X for complete test procedures.

**Test Cases:** TC-SERVICE-001 through TC-SERVICE-040

**Coverage Goals:**
- Unit tests: ≥ 70% coverage in `src/modules/services`
- Integration tests: All API endpoints with auth scenarios
- Performance tests: P95 latency targets (k6)
- Security tests: Authorization and input validation

---

## Future Enhancements

1. **Service Availability Scheduling:** Link services to contractor availability calendar
2. **Dynamic Pricing:** Surge pricing, package deals, discounts
3. **Multi-Currency:** Support for USD, other currencies
4. **Advanced Image Processing:** Auto-resize, watermarking, format conversion
5. **Service Variants:** Size-based pricing, add-ons
6. **AI-Powered Recommendations:** Suggest services to clients based on history
7. **Contractor Portfolios:** Separate from service catalog for showcasing work
8. **Scheduled Publishing:** Auto-publish services at future dates
9. **Service Cloning:** Duplicate services with modifications
10. **Bulk Operations:** Pause/activate multiple services at once

---

## Related Specifications

- **Contractor Profiles:** `openspec/specs/profiles/spec.md`
- **Contractor Location:** `openspec/specs/contractor-location/spec.md`
- **Booking Checkout:** `openspec/specs/booking-checkout/spec.md`
- **Payments & Webhooks:** `openspec/specs/payments-webhooks/spec.md`
- **Ratings & Reviews:** `openspec/specs/ratings-reviews/spec.md`
