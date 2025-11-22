-- CreateEnum
CREATE TYPE "ServiceVisibilityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MXN');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon" VARCHAR(50),
    "sortOrder" SMALLINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_images" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "s3Url" VARCHAR(500) NOT NULL,
    "s3Key" VARCHAR(500) NOT NULL,
    "order" SMALLINT NOT NULL,
    "width" SMALLINT,
    "height" SMALLINT,
    "altText" VARCHAR(200),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_images_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add new fields to Service table
ALTER TABLE "Service"
ADD COLUMN "title" VARCHAR(100),
ADD COLUMN "description" VARCHAR(2000),
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
ADD COLUMN "durationMinutes" SMALLINT,
ADD COLUMN "visibilityStatus" "ServiceVisibilityStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "lastPublishedAt" TIMESTAMP(3);

-- Make location fields optional (change NOT NULL constraints)
ALTER TABLE "Service"
ALTER COLUMN "locationLat" DROP NOT NULL,
ALTER COLUMN "locationLng" DROP NOT NULL,
ALTER COLUMN "locationAddress" DROP NOT NULL,
ALTER COLUMN "coverageRadiusKm" DROP NOT NULL;

-- Update existing Service records with placeholder data for required new fields
-- Note: This is a one-time migration. Existing services will need manual review.
UPDATE "Service"
SET
  "title" = COALESCE("title", 'Service Title - Needs Update'),
  "description" = COALESCE("description", 'Service description - Needs Update'),
  "durationMinutes" = COALESCE("durationMinutes", 60);

-- Now make the new fields NOT NULL after populating
ALTER TABLE "Service"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "durationMinutes" SET NOT NULL;

-- Change basePrice precision from DECIMAL(12,2) to DECIMAL(10,2)
ALTER TABLE "Service"
ALTER COLUMN "basePrice" TYPE DECIMAL(10,2);

-- CreateIndex: ServiceCategory indexes
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");
CREATE INDEX "service_categories_slug_idx" ON "service_categories"("slug");
CREATE INDEX "service_categories_parentId_sortOrder_idx" ON "service_categories"("parentId", "sortOrder");

-- CreateIndex: ServiceImage indexes
CREATE INDEX "service_images_serviceId_order_idx" ON "service_images"("serviceId", "order");

-- CreateIndex: Service new composite indexes
CREATE INDEX "Service_contractorId_visibilityStatus_idx" ON "Service"("contractorId", "visibilityStatus");
CREATE INDEX "Service_categoryId_visibilityStatus_idx" ON "Service"("categoryId", "visibilityStatus");
CREATE INDEX "Service_basePrice_visibilityStatus_idx" ON "Service"("basePrice", "visibilityStatus");
CREATE INDEX "Service_visibilityStatus_lastPublishedAt_idx" ON "Service"("visibilityStatus", "lastPublishedAt");

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: The Service table already has a foreign key to Category table
-- We're adding support for the new ServiceCategory model while maintaining backward compatibility
-- The categoryId field will be migrated to reference service_categories in a future migration
