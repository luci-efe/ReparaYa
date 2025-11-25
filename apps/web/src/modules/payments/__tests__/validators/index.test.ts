/**
 * Validators Tests
 * Tests for Zod schemas and metadata sanitization
 */

import {
  createCheckoutSessionSchema,
  createPayoutSchema,
  processRefundSchema,
  sanitizeMetadata,
} from '../../validators';

describe('Payments Validators', () => {
  describe('createCheckoutSessionSchema', () => {
    it('should validate valid booking ID (UUID)', () => {
      const validData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createCheckoutSessionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookingId).toBe(
          '550e8400-e29b-41d4-a716-446655440000'
        );
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        bookingId: 'not-a-valid-uuid',
      };

      const result = createCheckoutSessionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid booking ID');
      }
    });

    it('should reject missing bookingId', () => {
      const result = createCheckoutSessionSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('createPayoutSchema', () => {
    it('should validate valid payout input', () => {
      const validData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createPayoutSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid booking ID', () => {
      const invalidData = {
        bookingId: 'invalid-id',
      };

      const result = createPayoutSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('processRefundSchema', () => {
    it('should validate refund with booking ID only (full refund)', () => {
      const validData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = processRefundSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate refund with amount (partial refund)', () => {
      const validData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 16.5,
      };

      const result = processRefundSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate refund with reason', () => {
      const validData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Customer requested cancellation',
      };

      const result = processRefundSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        amount: -10,
      };

      const result = processRefundSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('positive');
      }
    });

    it('should reject zero amount', () => {
      const invalidData = {
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0,
      };

      const result = processRefundSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('TC-SEC-001-03: Metadata sanitization', () => {
    it('should remove sensitive keys from metadata', () => {
      const unsafeMetadata = {
        booking_id: 'booking_123',
        service_id: 'service_456',
        password: 'super-secret',
        api_token: 'sk_test_123',
        client_secret: 'cs_test_456',
      };

      const sanitized = sanitizeMetadata(unsafeMetadata);

      expect(sanitized).toHaveProperty('booking_id', 'booking_123');
      expect(sanitized).toHaveProperty('service_id', 'service_456');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('api_token');
      expect(sanitized).not.toHaveProperty('client_secret');
    });

    it('should only allow primitive values (string, number, boolean)', () => {
      const mixedMetadata = {
        string_value: 'valid',
        number_value: 123,
        boolean_value: true,
        object_value: { nested: 'not allowed' },
        array_value: ['not', 'allowed'],
        null_value: null,
        undefined_value: undefined,
      };

      const sanitized = sanitizeMetadata(mixedMetadata);

      expect(sanitized).toHaveProperty('string_value', 'valid');
      expect(sanitized).toHaveProperty('number_value', 123);
      expect(sanitized).toHaveProperty('boolean_value', true);
      expect(sanitized).not.toHaveProperty('object_value');
      expect(sanitized).not.toHaveProperty('array_value');
      expect(sanitized).not.toHaveProperty('null_value');
      expect(sanitized).not.toHaveProperty('undefined_value');
    });

    it('should filter keys case-insensitively', () => {
      const unsafeMetadata = {
        booking_id: 'booking_123',
        PASSWORD: 'secret1',
        Secret: 'secret2',
        TOKEN: 'secret3',
        valid_key: 'valid',
      };

      const sanitized = sanitizeMetadata(unsafeMetadata);

      expect(sanitized).toHaveProperty('booking_id');
      expect(sanitized).toHaveProperty('valid_key');
      expect(sanitized).not.toHaveProperty('PASSWORD');
      expect(sanitized).not.toHaveProperty('Secret');
      expect(sanitized).not.toHaveProperty('TOKEN');
    });

    it('should handle empty metadata', () => {
      const sanitized = sanitizeMetadata({});

      expect(sanitized).toEqual({});
    });

    it('should filter keys containing dangerous substrings', () => {
      const unsafeMetadata = {
        user_password: 'secret',
        stripe_secret_key: 'sk_live_123',
        api_token_value: 'token_123',
        booking_id: 'booking_123',
        contractor_id: 'contractor_456',
      };

      const sanitized = sanitizeMetadata(unsafeMetadata);

      expect(sanitized).toHaveProperty('booking_id');
      expect(sanitized).toHaveProperty('contractor_id');
      expect(sanitized).not.toHaveProperty('user_password');
      expect(sanitized).not.toHaveProperty('stripe_secret_key');
      expect(sanitized).not.toHaveProperty('api_token_value');
    });

    it('should preserve valid metadata unchanged', () => {
      const validMetadata = {
        booking_id: 'booking_123',
        service_id: 'service_456',
        client_id: 'client_789',
        amount: 110.0,
        is_advance: true,
      };

      const sanitized = sanitizeMetadata(validMetadata);

      expect(sanitized).toEqual(validMetadata);
    });

    it('should handle metadata with special characters in values', () => {
      const metadataWithSpecialChars = {
        description: 'Plumbing repair @ customer site',
        notes: 'Customer prefers 9-5 schedule',
        client_email: 'test@example.com',
      };

      const sanitized = sanitizeMetadata(metadataWithSpecialChars);

      expect(sanitized).toEqual(metadataWithSpecialChars);
    });

    it('should be deterministic and repeatable', () => {
      const metadata = {
        booking_id: 'booking_123',
        password: 'secret',
        amount: 100,
      };

      const sanitized1 = sanitizeMetadata(metadata);
      const sanitized2 = sanitizeMetadata(metadata);

      expect(sanitized1).toEqual(sanitized2);
    });
  });

  describe('Integration with Stripe metadata limits', () => {
    it('should produce metadata that fits Stripe limits', () => {
      // Stripe allows up to 50 keys, 500 chars per key, 500 chars per value
      const validMetadata = {
        booking_id: 'b'.repeat(40), // 40 chars (well under 500)
        service_id: 's'.repeat(40),
        client_id: 'c'.repeat(40),
      };

      const sanitized = sanitizeMetadata(validMetadata);

      const keyCount = Object.keys(sanitized).length;
      expect(keyCount).toBeLessThanOrEqual(50);

      for (const [key, value] of Object.entries(sanitized)) {
        expect(key.length).toBeLessThanOrEqual(500);
        expect(String(value).length).toBeLessThanOrEqual(500);
      }
    });
  });
});
