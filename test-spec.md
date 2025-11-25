# Stripe Payments Integration Test - Debugging Summary

## Problem Found ✅

The checkout service integration tests were failing because of a **Prisma client mock** that was intercepting all database calls.

### Root Cause

The file `apps/web/__mocks__/@prisma/client.ts` contained a global mock that only included 2 models (`user` and `address`). This mock was being automatically loaded by Jest for **all tests**, including integration tests that need the real Prisma client to connect to the database.

## Solutions Applied ✅

### 1. Fixed Integration Test Helper (testDatabase.ts)

Changed from:
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

To:
```typescript
// Use the REAL Prisma client for integration tests, not the mock!
const { PrismaClient } = jest.requireActual('@prisma/client');
const prisma = new PrismaClient();
```

**Result:** Integration tests now get the real Prisma client with all 15 models.

### 2. Updated Global Prisma Mock

Expanded the mock from 2 models to all 15 models from the schema:
- ✅ user, contractorProfile, address
- ✅ category, service, availability
- ✅ booking, bookingStateHistory
- ✅ payment, processedWebhookEvent
- ✅ message, rating, serviceRatingStats
- ✅ dispute, adminAuditLog

**Result:** Unit tests that use the mock now have access to all models.

## Current Status

### ✅ Fixed Issues

1. **Prisma Mock** - Unit tests work correctly
   - Test: `commissionService.test.ts` - **18/18 passing**
   - All business rule calculations working perfectly

2. **Integration Test Setup** - Prisma client loading correctly
   - All 15 models now available
   - No more "Cannot read properties of undefined (reading 'create')" errors

### ⚠️ Remaining Issue: Database Connectivity

Integration tests now fail at a different stage - **database connection**:

```
Error: P1001: Can't reach database server at `aws-1-us-west-1.compute.amazonaws.com:5432`
The table `public.Category` does not exist in the current database.
```

**Reason:**
- The Supabase database configured in `.env.local` is not accessible
- Connection string: `postgresql://postgres.vmsqbguwjjpusedhapqo:***@aws-1-us-west-1.compute.amazonaws.com:5432/postgres`
- This might be a network issue, firewall, or the database instance might be paused

## Recommendations

### Option 1: Fix Supabase Connection (Recommended for Production)

1. Verify Supabase project is active at https://supabase.com/dashboard
2. Check if database is paused (free tier pauses after inactivity)
3. Verify connection string is correct
4. Test connection:
   ```bash
   psql "postgresql://postgres.vmsqbguwjjpusedhapqo:Password01*5up@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
   ```
5. Run migrations:
   ```bash
   cd apps/web
   npx prisma db push
   ```

### Option 2: Use Local PostgreSQL for Tests (Recommended for Development)

Create `.env.test` for integration tests:
```bash
cd apps/web
cat > .env.test << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reparaya_test"
STRIPE_SECRET_KEY="sk_test_YOUR_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
EOF
```

Then:
```bash
# Start local PostgreSQL (Docker)
docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reparaya_test -p 5432:5432 -d postgres:15

# Push schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reparaya_test" npx prisma db push

# Run tests
npm test -- src/modules/payments/__tests__/services/checkoutService.integration.test.ts
```

### Option 3: Skip Integration Tests for Now

Focus on unit tests which are already working:
```bash
# Run all unit tests (mocked Prisma)
npm test -- src/modules/payments/__tests__/services/

# Current status:
# ✅ commissionService.test.ts - 18/18 passing
# ✅ checkoutService.test.ts - All passing (with mocks)
# ⚠️ *.integration.test.ts - Pending database connection
```

## Next Steps for Spec Finalization

1. **Connect to Database** (choose option above)
2. **Run Database Migrations**
   ```bash
   cd apps/web
   npx prisma db push
   ```
3. **Run Integration Tests**
   ```bash
   npm test -- src/modules/payments/__tests__/services/checkoutService.integration.test.ts
   ```
4. **Update STP Document** with test results
5. **Mark tasks complete** in `openspec/changes/implement-stripe-payments/tasks.md`

## Files Modified

✅ `apps/web/__mocks__/@prisma/client.ts` - Added all 15 Prisma models
✅ `apps/web/src/modules/payments/__tests__/helpers/testDatabase.ts` - Use real Prisma client

## Summary

**What was wrong:** Jest was using a mock Prisma client that only had 2 models instead of 15.

**What we fixed:**
- ✅ Integration tests now use real Prisma client
- ✅ Global mock updated to include all 15 models
- ✅ Unit tests passing (18/18 for commission service)

**What's left:** Connect to the database (Supabase or local PostgreSQL) to run integration tests.
