-- Migration: Add partial unique index for Address.isDefault
-- Description: Ensures only one address per user can have isDefault = true at database level
-- This prevents race conditions and concurrency issues that could bypass application logic
-- Prisma does not support partial indexes natively, so this migration must be run manually

-- Create partial unique index on Address table
-- Only one row per userId can have isDefault = true
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_default_address"
ON "Address"("userId")
WHERE "isDefault" = true;

-- Verification query (should return 0 or 1 for each userId):
-- SELECT "userId", COUNT(*)
-- FROM "Address"
-- WHERE "isDefault" = true
-- GROUP BY "userId"
-- HAVING COUNT(*) > 1;
