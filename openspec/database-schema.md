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

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Address (
  id text NOT NULL,
  userId text NOT NULL,
  addressLine1 text NOT NULL,
  addressLine2 text,
  city text NOT NULL,
  state text NOT NULL,
  postalCode text NOT NULL,
  country text NOT NULL DEFAULT 'MX'::text,
  lat numeric,
  lng numeric,
  isDefault boolean NOT NULL DEFAULT false,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Address_pkey PRIMARY KEY (id),
  CONSTRAINT Address_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);

CREATE TABLE public.AdminAuditLog (
  id text NOT NULL,
  adminId text NOT NULL,
  action text NOT NULL,
  targetType text NOT NULL,
  targetId text NOT NULL,
  metadata jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT AdminAuditLog_pkey PRIMARY KEY (id),
  CONSTRAINT AdminAuditLog_adminId_fkey FOREIGN KEY (adminId) REFERENCES public.User(id)
);

CREATE TABLE public.Availability (
  id text NOT NULL,
  serviceId text NOT NULL,
  date date NOT NULL,
  startTime timestamp without time zone NOT NULL,
  endTime timestamp without time zone NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'AVAILABLE'::"AvailabilityStatus",
  bookingId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Availability_pkey PRIMARY KEY (id),
  CONSTRAINT Availability_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Availability_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id)
);

CREATE TABLE public.Booking (
  id text NOT NULL,
  serviceId text NOT NULL,
  clientId text NOT NULL,
  contractorId text NOT NULL,
  availabilityId text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING_PAYMENT'::"BookingStatus",
  scheduledDate timestamp without time zone NOT NULL,
  address text NOT NULL,
  notes text,
  basePrice numeric NOT NULL,
  finalPrice numeric NOT NULL,
  anticipoAmount numeric NOT NULL,
  liquidacionAmount numeric NOT NULL,
  comisionAmount numeric NOT NULL,
  contractorPayoutAmount numeric NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Booking_pkey PRIMARY KEY (id),
  CONSTRAINT Booking_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Booking_clientId_fkey FOREIGN KEY (clientId) REFERENCES public.User(id),
  CONSTRAINT Booking_contractorId_fkey FOREIGN KEY (contractorId) REFERENCES public.User(id)
);

CREATE TABLE public.BookingStateHistory (
  id text NOT NULL,
  bookingId text NOT NULL,
  fromState USER-DEFINED NOT NULL,
  toState USER-DEFINED NOT NULL,
  changedBy text NOT NULL,
  notes text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT BookingStateHistory_pkey PRIMARY KEY (id),
  CONSTRAINT BookingStateHistory_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT BookingStateHistory_changedBy_fkey FOREIGN KEY (changedBy) REFERENCES public.User(id)
);

CREATE TABLE public.Category (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  slug text NOT NULL,
  iconUrl text,
  parentId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Category_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ContractorProfile (
  id text NOT NULL,
  userId text NOT NULL,
  businessName text NOT NULL,
  description text NOT NULL,
  specialties ARRAY,
  verified boolean NOT NULL DEFAULT false,
  verificationDocuments jsonb,
  stripeConnectAccountId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ContractorProfile_pkey PRIMARY KEY (id),
  CONSTRAINT ContractorProfile_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);

CREATE TABLE public.Dispute (
  id text NOT NULL,
  bookingId text NOT NULL,
  openedBy text NOT NULL,
  reason text NOT NULL,
  evidence jsonb,
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::"DisputeStatus",
  resolution text,
  resolutionNotes text,
  resolvedBy text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt timestamp without time zone,
  CONSTRAINT Dispute_pkey PRIMARY KEY (id),
  CONSTRAINT Dispute_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Dispute_openedBy_fkey FOREIGN KEY (openedBy) REFERENCES public.User(id),
  CONSTRAINT Dispute_resolvedBy_fkey FOREIGN KEY (resolvedBy) REFERENCES public.User(id)
);

CREATE TABLE public.Message (
  id text NOT NULL,
  bookingId text NOT NULL,
  senderId text NOT NULL,
  text character varying NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Message_pkey PRIMARY KEY (id),
  CONSTRAINT Message_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Message_senderId_fkey FOREIGN KEY (senderId) REFERENCES public.User(id)
);

CREATE TABLE public.Payment (
  id text NOT NULL,
  bookingId text NOT NULL,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'mxn'::text,
  stripePaymentIntentId text,
  stripeCheckoutSessionId text,
  stripeTransferId text,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::"PaymentStatus",
  metadata jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Payment_pkey PRIMARY KEY (id),
  CONSTRAINT Payment_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id)
);

CREATE TABLE public.ProcessedWebhookEvent (
  id text NOT NULL,
  stripeEventId text NOT NULL,
  eventType text NOT NULL,
  processedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ProcessedWebhookEvent_pkey PRIMARY KEY (id)
);

CREATE TABLE public.Rating (
  id text NOT NULL,
  bookingId text NOT NULL,
  serviceId text NOT NULL,
  clientId text NOT NULL,
  stars integer NOT NULL,
  comment character varying,
  moderationStatus USER-DEFINED NOT NULL DEFAULT 'PENDING'::"ModerationStatus",
  moderationNotes text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Rating_pkey PRIMARY KEY (id),
  CONSTRAINT Rating_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Rating_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Rating_clientId_fkey FOREIGN KEY (clientId) REFERENCES public.User(id)
);

CREATE TABLE public.Service (
  id text NOT NULL,
  contractorId text NOT NULL,
  title character varying NOT NULL,
  description character varying NOT NULL,
  basePrice numeric NOT NULL,
  locationLat numeric,
  locationLng numeric,
  locationAddress text,
  coverageRadiusKm integer,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"ServiceStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  categoryId text NOT NULL,
  images ARRAY DEFAULT ARRAY[]::text[],
  CONSTRAINT Service_pkey PRIMARY KEY (id),
  CONSTRAINT Service_contractorId_fkey FOREIGN KEY (contractorId) REFERENCES public.User(id),
  CONSTRAINT Service_categoryId_fkey FOREIGN KEY (categoryId) REFERENCES public.Category(id)
);

CREATE TABLE public.ServiceRatingStats (
  serviceId text NOT NULL,
  average numeric NOT NULL,
  totalRatings integer NOT NULL DEFAULT 0,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ServiceRatingStats_pkey PRIMARY KEY (serviceId),
  CONSTRAINT ServiceRatingStats_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id)
);

CREATE TABLE public.User (
  id text NOT NULL,
  clerkUserId text NOT NULL,
  email text NOT NULL,
  firstName text NOT NULL,
  lastName text NOT NULL,
  phone text,
  avatarUrl text,
  role USER-DEFINED NOT NULL DEFAULT 'CLIENT'::"UserRole",
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"UserStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT User_pkey PRIMARY KEY (id)
);

CREATE TABLE public.contractor_availability_blocks (
  id text NOT NULL,
  contractor_profile_id text NOT NULL,
  start_date_time timestamp with time zone NOT NULL,
  end_date_time timestamp with time zone NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contractor_availability_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT fk_contractor_profile_block FOREIGN KEY (contractor_profile_id) REFERENCES public.ContractorProfile(id)
);

CREATE TABLE public.contractor_availability_exceptions (
  id text NOT NULL,
  contractor_profile_id text NOT NULL,
  date date NOT NULL,
  intervals jsonb NOT NULL DEFAULT '[]'::jsonb,
  type text NOT NULL CHECK (type = ANY (ARRAY['AVAILABLE'::text, 'BLOCKED'::text])),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contractor_availability_exceptions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_contractor_profile_exception FOREIGN KEY (contractor_profile_id) REFERENCES public.ContractorProfile(id)
);

CREATE TABLE public.contractor_weekly_rules (
  id text NOT NULL,
  contractor_profile_id text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  intervals jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contractor_weekly_rules_pkey PRIMARY KEY (id),
  CONSTRAINT fk_contractor_profile FOREIGN KEY (contractor_profile_id) REFERENCES public.ContractorProfile(id)
);

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
