/**
 * Commission Service
 * Implements business rules for payment calculations
 *
 * Business Rules:
 * - BR-001: Precio final = Precio base × (1 + markup%)
 * - BR-002: Comisión = Precio final × comisión%, Contratista recibe (100% - comisión%)
 * - BR-003: Anticipo = Precio final × anticipo%, Liquidación = Precio final × (100% - anticipo%)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { BookingAmounts } from '../types';

/**
 * Configuration for commission calculations
 * Read from environment variables
 */
interface CommissionConfig {
  /** Platform markup percentage (default: 10%) */
  markupPercentage: number;

  /** Platform commission percentage (default: 15%) */
  commissionPercentage: number;

  /** Booking advance payment percentage (default: 30%) */
  advancePercentage: number;
}

/**
 * Get commission configuration from environment
 */
function getCommissionConfig(): CommissionConfig {
  return {
    markupPercentage: parseFloat(
      process.env.PLATFORM_MARKUP_PERCENTAGE || '10'
    ),
    commissionPercentage: parseFloat(
      process.env.PLATFORM_COMMISSION_PERCENTAGE || '15'
    ),
    advancePercentage: parseFloat(
      process.env.BOOKING_ADVANCE_PERCENTAGE || '30'
    ),
  };
}

/**
 * Calculate all booking amounts according to business rules
 *
 * @param basePrice - Original service price (contractor's listed price)
 * @returns Complete breakdown of all amounts
 *
 * @example
 * const amounts = calculateBookingAmounts(new Decimal(100));
 * // Returns:
 * // {
 * //   basePrice: 100.00,
 * //   finalPrice: 110.00,
 * //   anticipoAmount: 33.00,
 * //   liquidacionAmount: 77.00,
 * //   comisionAmount: 16.50,
 * //   contractorPayoutAmount: 93.50
 * // }
 */
export function calculateBookingAmounts(basePrice: Decimal): BookingAmounts {
  const config = getCommissionConfig();

  // Validate input
  if (basePrice.lessThanOrEqualTo(0)) {
    throw new Error('Base price must be greater than 0');
  }

  // BR-001: Final price = Base price × (1 + markup%)
  // Example: $100 × 1.10 = $110
  const markupMultiplier = new Decimal(1).plus(
    new Decimal(config.markupPercentage).dividedBy(100)
  );
  const finalPrice = basePrice.times(markupMultiplier);

  // BR-003: Advance = Final price × advance%
  // Example: $110 × 0.30 = $33.00
  const anticipoAmount = finalPrice
    .times(new Decimal(config.advancePercentage).dividedBy(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // BR-003: Settlement = Final price × (100% - advance%)
  // Example: $110 × 0.70 = $77.00
  const settlementPercentage = new Decimal(100).minus(
    config.advancePercentage
  );
  const liquidacionAmount = finalPrice
    .times(settlementPercentage.dividedBy(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // BR-002: Platform commission = Final price × commission%
  // Example: $110 × 0.15 = $16.50
  const comisionAmount = finalPrice
    .times(new Decimal(config.commissionPercentage).dividedBy(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // BR-002: Contractor payout = Final price - Commission
  // Example: $110 - $16.50 = $93.50
  // Alternatively: $110 × 0.85 = $93.50
  const contractorPayoutAmount = finalPrice
    .minus(comisionAmount)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    basePrice,
    finalPrice: finalPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    anticipoAmount,
    liquidacionAmount,
    comisionAmount,
    contractorPayoutAmount,
  };
}

/**
 * Validate that commission configuration is reasonable
 * Called on module initialization
 */
export function validateCommissionConfig(): void {
  const config = getCommissionConfig();

  if (config.markupPercentage < 0 || config.markupPercentage > 100) {
    throw new Error(
      `Invalid PLATFORM_MARKUP_PERCENTAGE: ${config.markupPercentage}. Must be between 0-100.`
    );
  }

  if (
    config.commissionPercentage < 0 ||
    config.commissionPercentage > 100
  ) {
    throw new Error(
      `Invalid PLATFORM_COMMISSION_PERCENTAGE: ${config.commissionPercentage}. Must be between 0-100.`
    );
  }

  if (config.advancePercentage < 0 || config.advancePercentage > 100) {
    throw new Error(
      `Invalid BOOKING_ADVANCE_PERCENTAGE: ${config.advancePercentage}. Must be between 0-100.`
    );
  }

  // Log configuration for transparency
  console.log('[CommissionService] Configuration loaded:', {
    markupPercentage: `${config.markupPercentage}%`,
    commissionPercentage: `${config.commissionPercentage}%`,
    advancePercentage: `${config.advancePercentage}%`,
  });
}

// Validate configuration on module load
validateCommissionConfig();
