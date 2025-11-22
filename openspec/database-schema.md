# Database Schema Reference

**Source**: Supabase production database
**Last Updated**: 2025-11-21

## Purpose

This document is the **single source of truth** for the ReparaYa database schema as it exists in Supabase.

**⚠️ CRITICAL for Agents**: When planning ANY database-related work:
1. ✅ **Always consult this document first** to understand existing tables and relationships
2. ✅ **Never assume tables exist** - if it's not listed here, it doesn't exist in Supabase
3. ✅ **Create proposals for schema changes** via `/openspec:proposal` with comprehensive migration tests

## Database Info

- **Provider**: Supabase (PostgreSQL)
- **Project URL**: https://vmsqbguwjjpusedhapqo.supabase.co
- **ORM**: Prisma
- **Prisma Schema**: `apps/web/prisma/schema.prisma`

---

## Tables (Alphabetical)

### Address
User addresses for service delivery.

**Columns**:
- `id` (text, PK)
- `userId` (text, FK → User.id, NOT NULL)
- `addressLine1` (text, NOT NULL)
- `addressLine2` (text, nullable)
- `city` (text, NOT NULL)
- `state` (text, NOT NULL)
- `postalCode` (text, NOT NULL)
- `country` (text, NOT NULL, DEFAULT 'MX')
- `lat` (numeric, nullable) - Latitude
- `lng` (numeric, nullable) - Longitude
- `isDefault` (boolean, NOT NULL, DEFAULT false)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Purpose**: Store multiple addresses per user for service locations.

---

### AdminAuditLog
Audit trail for administrative actions.

**Columns**:
- `id` (text, PK)
- `adminId` (text, FK → User.id, NOT NULL)
- `action` (text, NOT NULL) - Action performed
- `targetType` (text, NOT NULL) - Entity type affected
- `targetId` (text, NOT NULL) - Entity ID affected
- `metadata` (jsonb, nullable) - Additional context
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Purpose**: Track all admin actions for compliance and debugging.

---

### Availability
Time slots for service booking availability.

**Columns**:
- `id` (text, PK)
- `serviceId` (text, FK → Service.id, NOT NULL)
- `date` (date, NOT NULL)
- `startTime` (timestamp, NOT NULL)
- `endTime` (timestamp, NOT NULL)
- `status` (AvailabilityStatus, NOT NULL, DEFAULT 'AVAILABLE')
- `bookingId` (text, FK → Booking.id, nullable)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: AvailabilityStatus**
- `AVAILABLE` - Slot open for booking
- `BOOKED` - Slot has been booked
- `BLOCKED` - Contractor blocked this slot

**Purpose**: Manage contractor availability windows for bookings.

---

### Booking
Service reservations/bookings.

**Columns**:
- `id` (text, PK)
- `serviceId` (text, FK → Service.id, NOT NULL)
- `clientId` (text, FK → User.id, NOT NULL)
- `contractorId` (text, FK → User.id, NOT NULL)
- `availabilityId` (text, NOT NULL) - References Availability slot
- `status` (BookingStatus, NOT NULL, DEFAULT 'PENDING_PAYMENT')
- `scheduledDate` (timestamp, NOT NULL)
- `address` (text, NOT NULL) - Service address
- `notes` (text, nullable) - Client notes
- `basePrice` (numeric, NOT NULL)
- `finalPrice` (numeric, NOT NULL)
- `anticipoAmount` (numeric, NOT NULL) - Advance payment
- `liquidacionAmount` (numeric, NOT NULL) - Final payment
- `comisionAmount` (numeric, NOT NULL) - Platform commission
- `contractorPayoutAmount` (numeric, NOT NULL) - Amount paid to contractor
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: BookingStatus**
- `PENDING_PAYMENT` - Awaiting anticipo
- `CONFIRMED` - Anticipo paid
- `IN_PROGRESS` - Service in progress
- `COMPLETED` - Service completed
- `PAID` - Fully paid
- `CANCELLED` - Cancelled
- `DISPUTED` - Under dispute

**Purpose**: Core booking entity with payment breakdown.

---

### BookingStateHistory
Audit log for booking status transitions.

**Columns**:
- `id` (text, PK)
- `bookingId` (text, FK → Booking.id, NOT NULL)
- `fromState` (BookingStatus, NOT NULL)
- `toState` (BookingStatus, NOT NULL)
- `changedBy` (text, FK → User.id, NOT NULL)
- `notes` (text, nullable)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Purpose**: Track all booking status changes for auditing.

---

### ContractorProfile
Professional contractor profiles.

**Columns**:
- `id` (text, PK)
- `userId` (text, FK → User.id, NOT NULL, UNIQUE)
- `businessName` (text, NOT NULL)
- `description` (text, NOT NULL) - Business description
- `specialties` (text[], nullable) - Service specialties array
- `verified` (boolean, NOT NULL, DEFAULT false) - KYC verification status
- `verificationDocuments` (jsonb, nullable) - Document metadata
- `stripeConnectAccountId` (text, nullable) - Stripe Connect ID
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Purpose**: One-to-one extension of User for contractors.

---

### ContractorServiceLocation
Contractor base location and coverage area.

**Columns**:
- `id` (text, PK)
- `contractorProfileId` (text, FK → ContractorProfile.id, NOT NULL)
- `street` (varchar, NOT NULL)
- `exteriorNumber` (varchar, NOT NULL)
- `interiorNumber` (varchar, nullable)
- `neighborhood` (varchar, nullable)
- `city` (varchar, NOT NULL)
- `state` (varchar, NOT NULL)
- `postalCode` (varchar, NOT NULL)
- `country` (varchar, NOT NULL)
- `baseLatitude` (numeric, nullable) - Geocoded coordinates
- `baseLongitude` (numeric, nullable)
- `normalizedAddress` (text, nullable) - AWS Location Service normalized
- `timezone` (varchar, nullable) - Timezone (from geo-tz)
- `geocodingStatus` (GeocodingStatus, NOT NULL, DEFAULT 'PENDING')
- `zoneType` (ZoneType, NOT NULL) - RADIUS or POLYGON
- `radiusKm` (integer, nullable) - Coverage radius (if RADIUS type)
- `polygonCoordinates` (jsonb, nullable) - Polygon GeoJSON (if POLYGON type)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: GeocodingStatus**
- `PENDING` - Not geocoded yet
- `SUCCESS` - Successfully geocoded
- `FAILED` - Geocoding failed

**Enum: ZoneType**
- `RADIUS` - Circular coverage area
- `POLYGON` - Custom polygon coverage

**Purpose**: Store contractor's base location and service coverage area.

---

### Dispute
Booking dispute resolution.

**Columns**:
- `id` (text, PK)
- `bookingId` (text, FK → Booking.id, NOT NULL)
- `openedBy` (text, FK → User.id, NOT NULL)
- `reason` (text, NOT NULL)
- `evidence` (jsonb, nullable) - Evidence data
- `status` (DisputeStatus, NOT NULL, DEFAULT 'OPEN')
- `resolution` (text, nullable) - Resolution summary
- `resolutionNotes` (text, nullable) - Detailed resolution notes
- `resolvedBy` (text, FK → User.id, nullable) - Admin who resolved
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `resolvedAt` (timestamp, nullable)

**Enum: DisputeStatus**
- `OPEN` - Newly opened
- `INVESTIGATING` - Under review
- `RESOLVED` - Resolved
- `CLOSED` - Closed

**Purpose**: Handle booking disputes between clients and contractors.

---

### Message
In-booking messaging between client and contractor.

**Columns**:
- `id` (text, PK)
- `bookingId` (text, FK → Booking.id, NOT NULL)
- `senderId` (text, FK → User.id, NOT NULL)
- `text` (varchar, NOT NULL) - Message content
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Purpose**: Chat messages scoped to a specific booking.

---

### Payment
Payment transactions (anticipo, liquidación, refunds).

**Columns**:
- `id` (text, PK)
- `bookingId` (text, FK → Booking.id, NOT NULL)
- `type` (PaymentType, NOT NULL)
- `amount` (numeric, NOT NULL)
- `currency` (text, NOT NULL, DEFAULT 'mxn')
- `stripePaymentIntentId` (text, nullable)
- `stripeCheckoutSessionId` (text, nullable)
- `stripeTransferId` (text, nullable) - For payouts
- `status` (PaymentStatus, NOT NULL, DEFAULT 'PENDING')
- `metadata` (jsonb, nullable) - Additional payment data
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: PaymentType**
- `ANTICIPO` - Advance payment
- `LIQUIDACION` - Final payment
- `REFUND` - Refund transaction

**Enum: PaymentStatus**
- `PENDING` - Initiated
- `PROCESSING` - Processing
- `SUCCEEDED` - Successful
- `FAILED` - Failed
- `CANCELLED` - Cancelled
- `REFUNDED` - Refunded

**Purpose**: Track all payment transactions with Stripe integration.

---

### ProcessedWebhookEvent
Webhook idempotency tracking.

**Columns**:
- `id` (text, PK)
- `stripeEventId` (text, NOT NULL, UNIQUE) - Stripe event ID
- `eventType` (text, NOT NULL)
- `processedAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Purpose**: Prevent duplicate processing of Stripe webhooks.

---

### Rating
Service ratings and reviews.

**Columns**:
- `id` (text, PK)
- `bookingId` (text, FK → Booking.id, NOT NULL)
- `serviceId` (text, FK → Service.id, NOT NULL)
- `clientId` (text, FK → User.id, NOT NULL)
- `stars` (integer, NOT NULL) - Rating 1-5
- `comment` (varchar, nullable) - Review text
- `moderationStatus` (ModerationStatus, NOT NULL, DEFAULT 'PENDING')
- `moderationNotes` (text, nullable) - Internal moderation notes
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: ModerationStatus**
- `PENDING` - Awaiting moderation
- `APPROVED` - Approved for display
- `REJECTED` - Rejected

**Purpose**: Client reviews of services with moderation.

---

### Service
Services offered by contractors.

**Columns**:
- `id` (text, PK)
- `contractorId` (text, FK → User.id, NOT NULL)
- `categoryId_old` (text, NOT NULL) - Legacy category field
- `categoryId` (text, FK → ServiceCategory.id, nullable) - New category field
- `category` (text, nullable) - Category name (denormalized)
- `title` (varchar, NOT NULL)
- `description` (varchar, NOT NULL)
- `basePrice` (numeric, NOT NULL)
- `currency` (varchar, NOT NULL, DEFAULT 'MXN')
- `durationMinutes` (integer, NOT NULL)
- `locationLat` (numeric, nullable)
- `locationLng` (numeric, nullable)
- `locationAddress` (text, nullable)
- `coverageRadiusKm` (integer, nullable)
- `status` (ServiceStatus, NOT NULL, DEFAULT 'ACTIVE')
- `visibilityStatus` (VisibilityStatus, NOT NULL, DEFAULT 'DRAFT')
- `lastPublishedAt` (timestamp, nullable)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: ServiceStatus**
- `ACTIVE` - Service is active
- `INACTIVE` - Temporarily inactive
- `DELETED` - Soft deleted

**Enum: VisibilityStatus**
- `DRAFT` - Not published
- `PUBLISHED` - Publicly visible
- `ARCHIVED` - No longer visible

**Purpose**: Service listings created by contractors.

**Note**: Use `categoryId` for new features. `categoryId_old` is for backward compatibility.

---

### ServiceCategory
Hierarchical service categories.

**Columns**:
- `id` (text, PK)
- `name` (text, NOT NULL)
- `description` (text, NOT NULL)
- `slug` (text, NOT NULL, UNIQUE)
- `icon` (text, nullable) - Icon identifier
- `parentId` (text, FK → ServiceCategory.id, nullable) - For hierarchy
- `sortOrder` (smallint, NOT NULL, DEFAULT 0)
- `isActive` (boolean, NOT NULL, DEFAULT true)
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Purpose**: Organize services into hierarchical categories (e.g., Home > Plumbing > Leak Repair).

---

### ServiceImage
Images for services (stored in S3).

**Columns**:
- `id` (text, PK)
- `serviceId` (text, FK → Service.id, NOT NULL)
- `s3Url` (text, NOT NULL) - Public S3 URL
- `s3Key` (text, NOT NULL) - S3 object key
- `order` (integer, NOT NULL) - Display order
- `width` (integer, nullable)
- `height` (integer, nullable)
- `altText` (varchar, nullable) - Accessibility text
- `uploadedAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

**Purpose**: Store service photos with ordering.

---

### ServiceRatingStats
Aggregated rating statistics (materialized view/cache).

**Columns**:
- `serviceId` (text, PK, FK → Service.id)
- `average` (numeric, NOT NULL) - Average rating
- `totalRatings` (integer, NOT NULL, DEFAULT 0) - Total count
- `updatedAt` (timestamp, NOT NULL)

**Purpose**: Pre-computed rating stats for fast queries.

---

### User
User accounts (integrated with Clerk).

**Columns**:
- `id` (text, PK)
- `clerkUserId` (text, NOT NULL, UNIQUE) - Clerk external ID
- `email` (text, NOT NULL)
- `firstName` (text, NOT NULL)
- `lastName` (text, NOT NULL)
- `phone` (text, nullable)
- `avatarUrl` (text, nullable)
- `role` (UserRole, NOT NULL, DEFAULT 'CLIENT')
- `status` (UserStatus, NOT NULL, DEFAULT 'ACTIVE')
- `createdAt` (timestamp, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updatedAt` (timestamp, NOT NULL)

**Enum: UserRole**
- `CLIENT` - Regular customer
- `CONTRACTOR` - Service provider
- `ADMIN` - Platform admin

**Enum: UserStatus**
- `ACTIVE` - Active account
- `SUSPENDED` - Suspended
- `DELETED` - Soft deleted

**Purpose**: Core user entity synced with Clerk for authentication.

---

## Entity Relationships

### One-to-One
- `User` ←→ `ContractorProfile` (contractors only)

### One-to-Many
- `User` → `Address` (user addresses)
- `User` → `Service` (as contractor)
- `User` → `Booking` (as client or contractor)
- `ContractorProfile` → `ContractorServiceLocation`
- `Service` → `ServiceImage`
- `Service` → `Availability`
- `Service` → `Rating`
- `Booking` → `Payment`
- `Booking` → `Message`
- `Booking` → `BookingStateHistory`
- `ServiceCategory` → `ServiceCategory` (self-referencing hierarchy)

### Many-to-One
- All entities with foreign keys reference parent tables

---

## Common Patterns

### ID Strategy
- All tables use `text` IDs (cuid2/nanoid recommended)
- Generated at application layer

### Timestamps
- `createdAt`: Auto-set on insert (DEFAULT CURRENT_TIMESTAMP)
- `updatedAt`: Application must update manually

### Soft Deletes
- Use status enums (e.g., `UserStatus.DELETED`, `ServiceStatus.DELETED`)
- Never hard DELETE user-facing data

### JSONB Usage
- `metadata`, `evidence`, `verificationDocuments`: Flexible structured data
- `polygonCoordinates`: GeoJSON for polygon coverage zones

---

## Schema Modification Workflow

### Before Changing Schema

1. **Create a proposal**: `/openspec:proposal` with schema changes
2. **Include comprehensive testing**:
   - Migration tests (up and down)
   - Data integrity tests
   - Constraint tests
   - Rollback tests
3. **Document impact**: Which queries/features are affected

### Making Changes

```bash
cd apps/web

# 1. Create migration
npx prisma migrate dev --name descriptive_migration_name

# 2. Review generated SQL
cat prisma/migrations/*/migration.sql

# 3. Test locally with full test suite
npm run test

# 4. Apply to Supabase (after approval)
npx prisma migrate deploy
```

### After Deployment

1. ✅ Update this document (`openspec/database-schema.md`)
2. ✅ Update `openspec/project.md` if needed
3. ✅ Archive the proposal

---

## Useful Commands

```bash
# Pull current schema from Supabase
npx prisma db pull

# Generate Prisma Client (after schema changes)
npx prisma generate

# Validate schema file
npx prisma validate

# Format schema file
npx prisma format

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Notes for Agents

- ✅ **This document is authoritative** - Don't assume tables exist if not listed here
- ✅ **Check relationships** before creating foreign keys
- ✅ **Use existing patterns** (text IDs, timestamp fields, soft deletes)
- ✅ **Always create proposals** for schema changes
- ❌ **Never modify schema directly** in Supabase UI
- ❌ **Never skip migration tests**
