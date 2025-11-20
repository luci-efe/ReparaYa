-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable: Remove images array and add new fields to Service
ALTER TABLE "Service" DROP COLUMN "images";
ALTER TABLE "Service" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN';
ALTER TABLE "Service" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "Service" ADD COLUMN "visibilityStatus" "VisibilityStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Service" ADD COLUMN "lastPublishedAt" TIMESTAMP(3);

-- AlterTable: Make location fields optional (nullable)
ALTER TABLE "Service" ALTER COLUMN "locationLat" DROP NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "locationLng" DROP NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "locationAddress" DROP NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "coverageRadiusKm" DROP NOT NULL;

-- AlterTable: Add length constraints to existing columns
ALTER TABLE "Service" ALTER COLUMN "title" TYPE VARCHAR(100);
ALTER TABLE "Service" ALTER COLUMN "description" TYPE VARCHAR(2000);

-- CreateTable: ServiceImage for S3 metadata storage
CREATE TABLE "ServiceImage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" VARCHAR(500),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add indexes for performance
CREATE INDEX "Service_categoryId_visibilityStatus_idx" ON "Service"("categoryId", "visibilityStatus");
CREATE INDEX "Service_visibilityStatus_idx" ON "Service"("visibilityStatus");
CREATE INDEX "Service_contractorId_visibilityStatus_idx" ON "Service"("contractorId", "visibilityStatus");

-- DropIndex: Remove old indexes that are being replaced
DROP INDEX IF EXISTS "Service_categoryId_status_idx";

-- CreateIndex: ServiceImage indexes
CREATE INDEX "ServiceImage_serviceId_order_idx" ON "ServiceImage"("serviceId", "order");
CREATE INDEX "ServiceImage_serviceId_idx" ON "ServiceImage"("serviceId");

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Set default durationMinutes for existing services (60 minutes)
UPDATE "Service" SET "durationMinutes" = 60 WHERE "durationMinutes" IS NULL;

-- AlterTable: Make durationMinutes required after setting defaults
ALTER TABLE "Service" ALTER COLUMN "durationMinutes" SET NOT NULL;
