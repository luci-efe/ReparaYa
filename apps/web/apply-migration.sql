-- Migration: Add Contractor Service Location
-- Date: 2025-11-19
-- Description: Creates ContractorServiceLocation table with geocoding and service zone support

-- CreateEnum
CREATE TYPE "GeocodingStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ServiceZoneType" AS ENUM ('RADIUS', 'POLYGON');

-- CreateTable
CREATE TABLE "ContractorServiceLocation" (
    "id" TEXT NOT NULL,
    "contractorProfileId" TEXT NOT NULL,
    "street" VARCHAR(200) NOT NULL,
    "exteriorNumber" VARCHAR(20) NOT NULL,
    "interiorNumber" VARCHAR(20),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(10) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "baseLatitude" DECIMAL(10,8),
    "baseLongitude" DECIMAL(11,8),
    "normalizedAddress" TEXT,
    "timezone" VARCHAR(50),
    "geocodingStatus" "GeocodingStatus" NOT NULL DEFAULT 'PENDING',
    "zoneType" "ServiceZoneType" NOT NULL,
    "radiusKm" INTEGER,
    "polygonCoordinates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorServiceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractorServiceLocation_contractorProfileId_key" ON "ContractorServiceLocation"("contractorProfileId");

-- CreateIndex
CREATE INDEX "ContractorServiceLocation_baseLatitude_baseLongitude_idx" ON "ContractorServiceLocation"("baseLatitude", "baseLongitude");

-- CreateIndex
CREATE INDEX "ContractorServiceLocation_city_state_idx" ON "ContractorServiceLocation"("city", "state");

-- AddForeignKey
ALTER TABLE "ContractorServiceLocation" ADD CONSTRAINT "ContractorServiceLocation_contractorProfileId_fkey" FOREIGN KEY ("contractorProfileId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
