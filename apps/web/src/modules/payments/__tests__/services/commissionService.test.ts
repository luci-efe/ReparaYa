/**
 * Commission Service Tests
 * Tests for BR-001, BR-002, BR-003 business rule calculations
 */

import { Decimal } from '@prisma/client/runtime/library';
import { calculateBookingAmounts } from '../../services/commissionService';

describe('CommissionService', () => {
  // Save original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env vars to defaults
    process.env = {
      ...originalEnv,
      PLATFORM_MARKUP_PERCENTAGE: '10',
      PLATFORM_COMMISSION_PERCENTAGE: '15',
      BOOKING_ADVANCE_PERCENTAGE: '30',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('calculateBookingAmounts', () => {
    describe('TC-BR-001-01: Calculate final price with 10% markup', () => {
      it('should apply exactly 10% markup to base price', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.finalPrice.toNumber()).toBe(110);
        expect(result.basePrice.toNumber()).toBe(100);
      });

      it('should work with decimal base prices', () => {
        const basePrice = new Decimal(50.50);
        const result = calculateBookingAmounts(basePrice);

        expect(result.finalPrice.toNumber()).toBe(55.55);
      });

      it('should work with large amounts', () => {
        const basePrice = new Decimal(1000);
        const result = calculateBookingAmounts(basePrice);

        expect(result.finalPrice.toNumber()).toBe(1100);
      });
    });

    describe('TC-BR-002-01: Calculate platform commission (15% of final)', () => {
      it('should calculate exactly 15% commission', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        // Final: $110, Commission: $110 * 0.15 = $16.50
        expect(result.comisionAmount.toNumber()).toBe(16.50);
      });
    });

    describe('TC-BR-002-02: Calculate contractor payout (85% of final)', () => {
      it('should calculate contractor receives 85% of final price', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        // Final: $110, Contractor: $110 * 0.85 = $93.50
        expect(result.contractorPayoutAmount.toNumber()).toBe(93.50);
      });

      it('contractor payout should equal final - commission', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        const expected = result.finalPrice.minus(result.comisionAmount);
        expect(result.contractorPayoutAmount.toNumber()).toBe(expected.toNumber());
      });
    });

    describe('TC-BR-003-01: Calculate advance payment (30% of final)', () => {
      it('should calculate exactly 30% as advance', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        // Final: $110, Advance: $110 * 0.30 = $33.00
        expect(result.anticipoAmount.toNumber()).toBe(33);
      });
    });

    describe('TC-BR-003-02: Calculate settlement (70% of final)', () => {
      it('should calculate exactly 70% as settlement', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        // Final: $110, Settlement: $110 * 0.70 = $77.00
        expect(result.liquidacionAmount.toNumber()).toBe(77);
      });

      it('advance + settlement should equal final price', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        const sum = result.anticipoAmount.plus(result.liquidacionAmount);
        expect(sum.toNumber()).toBe(result.finalPrice.toNumber());
      });
    });

    describe('TC-PAY-002-01: Full booking amount calculation flow', () => {
      it('should calculate all amounts correctly for $100 base', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.basePrice.toNumber()).toBe(100);
        expect(result.finalPrice.toNumber()).toBe(110);
        expect(result.anticipoAmount.toNumber()).toBe(33);
        expect(result.liquidacionAmount.toNumber()).toBe(77);
        expect(result.comisionAmount.toNumber()).toBe(16.50);
        expect(result.contractorPayoutAmount.toNumber()).toBe(93.50);
      });

      it('all amounts should use Decimal type', () => {
        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.basePrice).toBeInstanceOf(Decimal);
        expect(result.finalPrice).toBeInstanceOf(Decimal);
        expect(result.anticipoAmount).toBeInstanceOf(Decimal);
        expect(result.liquidacionAmount).toBeInstanceOf(Decimal);
        expect(result.comisionAmount).toBeInstanceOf(Decimal);
        expect(result.contractorPayoutAmount).toBeInstanceOf(Decimal);
      });
    });

    describe('TC-PAY-002-02: Decimal precision with $50.50', () => {
      it('should handle decimal prices without floating-point errors', () => {
        const basePrice = new Decimal(50.50);
        const result = calculateBookingAmounts(basePrice);

        expect(result.basePrice.toNumber()).toBe(50.50);
        expect(result.finalPrice.toNumber()).toBe(55.55);
        expect(result.anticipoAmount.toNumber()).toBe(16.67); // 55.55 * 0.30 = 16.665 → 16.67
        expect(result.liquidacionAmount.toNumber()).toBe(38.89); // 55.55 * 0.70 = 38.885 → 38.89
        expect(result.comisionAmount.toNumber()).toBe(8.33); // 55.55 * 0.15 = 8.3325 → 8.33
        expect(result.contractorPayoutAmount.toNumber()).toBe(47.22); // 55.55 * 0.85 = 47.2175 → 47.22
      });

      it('calculations should be deterministic and repeatable', () => {
        const basePrice = new Decimal(50.50);

        const result1 = calculateBookingAmounts(basePrice);
        const result2 = calculateBookingAmounts(basePrice);

        expect(result1.finalPrice.toNumber()).toBe(result2.finalPrice.toNumber());
        expect(result1.anticipoAmount.toNumber()).toBe(result2.anticipoAmount.toNumber());
        expect(result1.comisionAmount.toNumber()).toBe(result2.comisionAmount.toNumber());
      });
    });

    describe('TC-PAY-002-03: Edge case - minimum amount $0.01', () => {
      it('should handle very small amounts', () => {
        const basePrice = new Decimal(0.01);
        const result = calculateBookingAmounts(basePrice);

        // 0.01 * 1.10 = 0.011 → rounds to 0.01
        expect(result.finalPrice.toNumber()).toBe(0.01);

        // Note: Very small percentages of $0.01 may round to 0
        // 0.01 * 0.30 = 0.003 → rounds to 0.00
        // 0.01 * 0.70 = 0.007 → rounds to 0.01
        expect(result.anticipoAmount.toNumber()).toBeGreaterThanOrEqual(0);
        expect(result.liquidacionAmount.toNumber()).toBeGreaterThanOrEqual(0);

        // The sum should still be meaningful
        const sum = result.anticipoAmount.plus(result.liquidacionAmount);
        expect(sum.toNumber()).toBeGreaterThan(0);
      });

      it('should throw error for zero or negative prices', () => {
        expect(() => calculateBookingAmounts(new Decimal(0))).toThrow(
          'Base price must be greater than 0'
        );
        expect(() => calculateBookingAmounts(new Decimal(-10))).toThrow(
          'Base price must be greater than 0'
        );
      });
    });

    describe('Custom percentage configuration', () => {
      it('should respect custom markup percentage from env', () => {
        process.env.PLATFORM_MARKUP_PERCENTAGE = '20'; // 20% instead of 10%

        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.finalPrice.toNumber()).toBe(120); // $100 * 1.20
      });

      it('should respect custom commission percentage from env', () => {
        process.env.PLATFORM_COMMISSION_PERCENTAGE = '10'; // 10% instead of 15%

        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.comisionAmount.toNumber()).toBe(11); // $110 * 0.10
        expect(result.contractorPayoutAmount.toNumber()).toBe(99); // $110 - $11
      });

      it('should respect custom advance percentage from env', () => {
        process.env.BOOKING_ADVANCE_PERCENTAGE = '50'; // 50% instead of 30%

        const basePrice = new Decimal(100);
        const result = calculateBookingAmounts(basePrice);

        expect(result.anticipoAmount.toNumber()).toBe(55); // $110 * 0.50
        expect(result.liquidacionAmount.toNumber()).toBe(55); // $110 * 0.50
      });
    });
  });
});
