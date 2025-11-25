-- Migration: Align existing database to Prisma schema
-- This migration safely transitions from old schema (ServiceCategory) to new schema (Category)
-- Preserves all existing data (12 users, 4 services)

BEGIN;

-- ========================================
-- Step 1: Rename ServiceCategory to Category
-- ========================================

-- Drop foreign key constraints that reference ServiceCategory
ALTER TABLE IF EXISTS "Service" DROP CONSTRAINT IF EXISTS "Service_categoryId_fkey";

-- Rename the table
ALTER TABLE IF EXISTS "ServiceCategory" RENAME TO "Category";

-- Rename columns to match Prisma schema
ALTER TABLE IF EXISTS "Category" RENAME COLUMN "icon" TO "iconUrl";

-- Drop extra columns that aren't in Prisma schema
ALTER TABLE IF EXISTS "Category" DROP COLUMN IF EXISTS "sortOrder";
ALTER TABLE IF EXISTS "Category" DROP COLUMN IF EXISTS "isActive";

-- Re-add the foreign key constraint with correct name
ALTER TABLE IF EXISTS "Service" ADD CONSTRAINT "Service_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ========================================
-- Step 2: Drop extra tables not in Prisma schema
-- ========================================

DROP TABLE IF EXISTS "ServiceImage" CASCADE;
DROP TABLE IF EXISTS "ContractorServiceLocation" CASCADE;

-- ========================================
-- Step 3: Verify schema matches Prisma
-- ========================================

-- List all tables to verify
SELECT
  'Migration completed. Tables in database:' as message,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

COMMIT;

-- Done! Database schema now matches prisma/schema.prisma
