/**
 * Stripe Connect Service Tests
 * Tests for contractor onboarding to Stripe Connect
 */

import { PrismaClient } from '@prisma/client';
import { StripeConnectService } from '../services/stripeConnectService';

// Mock Stripe
jest.mock('@/modules/payments/services/stripeService', () => ({
  stripe: {
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  },
}));

import { stripe } from '@/modules/payments/services/stripeService';

const mockPrisma = {
  contractorProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('StripeConnectService', () => {
  let stripeConnectService: StripeConnectService;

  beforeEach(() => {
    stripeConnectService = new StripeConnectService(mockPrisma);
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('TC-PAY-004-01: Create Connect account', () => {
    it('should create Stripe Connect Express account for contractor', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          id: 'contractor_user_456',
          email: 'contractor@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
        },
        stripeConnectAccountId: null,
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_test_connect_789',
        type: 'express',
        country: 'MX',
        email: 'contractor@example.com',
        charges_enabled: false,
        payouts_enabled: false,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          contractor_id: 'contractor_user_456',
          contractor_profile_id: 'contractor_profile_123',
        },
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);

      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({
        ...mockContractor,
        stripeConnectAccountId: 'acct_test_connect_789',
      });

      const result = await stripeConnectService.createConnectAccount(
        'contractor_user_456'
      );

      expect(result.accountId).toBe('acct_test_connect_789');
      expect(result.chargesEnabled).toBe(false);
      expect(result.payoutsEnabled).toBe(false);

      // Should create Express account with correct parameters
      expect(stripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'MX',
        email: 'contractor@example.com',
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          contractor_id: 'contractor_user_456',
          contractor_profile_id: 'contractor_profile_123',
        },
      });
    });

    it('should throw error if contractor profile not found', async () => {
      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        stripeConnectService.createConnectAccount('nonexistent_contractor')
      ).rejects.toThrow('Contractor profile not found: nonexistent_contractor');
    });
  });

  describe('TC-PAY-004-02: Generate onboarding link', () => {
    it('should create account onboarding link for KYC', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        stripeConnectAccountId: 'acct_test_789',
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/s/acct_test_789/onboarding',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      (stripe.accountLinks.create as jest.Mock).mockResolvedValue(mockAccountLink);

      const result = await stripeConnectService.createOnboardingLink(
        'contractor_user_456'
      );

      expect(result.url).toBe(
        'https://connect.stripe.com/setup/s/acct_test_789/onboarding'
      );
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Should create account link with correct URLs
      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test_789',
        refresh_url: 'http://localhost:3000/contractors/onboarding/refresh',
        return_url: 'http://localhost:3000/contractors/onboarding/complete',
        type: 'account_onboarding',
      });
    });

    it('should throw error if contractor has no Connect account', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        stripeConnectAccountId: null, // No Connect account yet
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      await expect(
        stripeConnectService.createOnboardingLink('contractor_user_456')
      ).rejects.toThrow(
        'Contractor contractor_user_456 has no Connect account. Create one first.'
      );

      expect(stripe.accountLinks.create).not.toHaveBeenCalled();
    });

    it('should throw error if contractor profile not found', async () => {
      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        stripeConnectService.createOnboardingLink('nonexistent_contractor')
      ).rejects.toThrow();
    });

    it('should use custom APP_URL from environment', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://reparaya.mx';

      const mockContractor = {
        userId: 'contractor_user_456',
        stripeConnectAccountId: 'acct_test_789',
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      (stripe.accountLinks.create as jest.Mock).mockResolvedValue({
        url: 'https://connect.stripe.com/setup/s/test',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      await stripeConnectService.createOnboardingLink('contractor_user_456');

      const createCall = (stripe.accountLinks.create as jest.Mock).mock.calls[0][0];

      expect(createCall.refresh_url).toBe(
        'https://reparaya.mx/contractors/onboarding/refresh'
      );
      expect(createCall.return_url).toBe(
        'https://reparaya.mx/contractors/onboarding/complete'
      );
    });
  });

  describe('TC-PAY-004-03: Retrieve account status', () => {
    it('should retrieve Connect account status', async () => {
      const mockAccount = {
        id: 'acct_test_789',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      (stripe.accounts.retrieve as jest.Mock).mockResolvedValue(mockAccount);

      const result = await stripeConnectService.getAccountStatus('acct_test_789');

      expect(result.accountId).toBe('acct_test_789');
      expect(result.chargesEnabled).toBe(true);
      expect(result.payoutsEnabled).toBe(true);

      expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_test_789');
    });

    it('should handle account not yet fully onboarded', async () => {
      const mockAccount = {
        id: 'acct_test_pending',
        type: 'express',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      };

      (stripe.accounts.retrieve as jest.Mock).mockResolvedValue(mockAccount);

      const result = await stripeConnectService.getAccountStatus(
        'acct_test_pending'
      );

      expect(result.chargesEnabled).toBe(false);
      expect(result.payoutsEnabled).toBe(false);
    });

    it('should throw error if account does not exist', async () => {
      (stripe.accounts.retrieve as jest.Mock).mockRejectedValue(
        new Error('No such account: acct_nonexistent')
      );

      await expect(
        stripeConnectService.getAccountStatus('acct_nonexistent')
      ).rejects.toThrow('No such account: acct_nonexistent');
    });
  });

  describe('TC-PAY-004-04: Store Connect account ID', () => {
    it('should store Connect account ID in contractor profile', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
        stripeConnectAccountId: null,
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_new_connect_id',
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);

      const updatedContractor = {
        ...mockContractor,
        stripeConnectAccountId: 'acct_new_connect_id',
      };

      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue(
        updatedContractor
      );

      await stripeConnectService.createConnectAccount('contractor_user_456');

      expect(mockPrisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: 'contractor_profile_123' },
        data: { stripeConnectAccountId: 'acct_new_connect_id' },
      });
    });

    it('should allow creating Connect account even if one already exists', async () => {
      // This might happen if contractor wants to replace their account
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
        stripeConnectAccountId: 'acct_old_123',
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockNewAccount = {
        id: 'acct_new_456',
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockNewAccount);

      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({
        ...mockContractor,
        stripeConnectAccountId: 'acct_new_456',
      });

      const result = await stripeConnectService.createConnectAccount(
        'contractor_user_456'
      );

      expect(result.accountId).toBe('acct_new_456');

      // Should update to new account ID
      expect(mockPrisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: 'contractor_profile_123' },
        data: { stripeConnectAccountId: 'acct_new_456' },
      });
    });
  });

  describe('TC-PAY-004-05: Verify account capabilities', () => {
    it('should request transfers capability when creating account', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_test_789',
        capabilities: {
          transfers: { requested: true },
        },
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);
      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({});

      await stripeConnectService.createConnectAccount('contractor_user_456');

      const createCall = (stripe.accounts.create as jest.Mock).mock.calls[0][0];

      expect(createCall.capabilities).toEqual({
        transfers: { requested: true },
      });
    });

    it('should return current capability status when retrieving account', async () => {
      const mockAccount = {
        id: 'acct_test_789',
        charges_enabled: true,
        payouts_enabled: true,
        capabilities: {
          transfers: { active: true },
        },
      };

      (stripe.accounts.retrieve as jest.Mock).mockResolvedValue(mockAccount);

      const result = await stripeConnectService.getAccountStatus('acct_test_789');

      expect(result.chargesEnabled).toBe(true);
      expect(result.payoutsEnabled).toBe(true);
    });
  });

  describe('Business type and country', () => {
    it('should create account with business_type individual for contractors', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_test_789',
        business_type: 'individual',
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);
      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({});

      await stripeConnectService.createConnectAccount('contractor_user_456');

      const createCall = (stripe.accounts.create as jest.Mock).mock.calls[0][0];

      expect(createCall.business_type).toBe('individual');
    });

    it('should create account with country MX for Mexico', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_test_789',
        country: 'MX',
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);
      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({});

      await stripeConnectService.createConnectAccount('contractor_user_456');

      const createCall = (stripe.accounts.create as jest.Mock).mock.calls[0][0];

      expect(createCall.country).toBe('MX');
    });
  });

  describe('Metadata tracking', () => {
    it('should include contractor IDs in account metadata', async () => {
      const mockContractor = {
        id: 'contractor_profile_123',
        userId: 'contractor_user_456',
        user: {
          email: 'contractor@example.com',
        },
      };

      (mockPrisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(
        mockContractor
      );

      const mockAccount = {
        id: 'acct_test_789',
        metadata: {
          contractor_id: 'contractor_user_456',
          contractor_profile_id: 'contractor_profile_123',
        },
        charges_enabled: false,
        payouts_enabled: false,
      };

      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);
      (mockPrisma.contractorProfile.update as jest.Mock).mockResolvedValue({});

      await stripeConnectService.createConnectAccount('contractor_user_456');

      const createCall = (stripe.accounts.create as jest.Mock).mock.calls[0][0];

      expect(createCall.metadata).toEqual({
        contractor_id: 'contractor_user_456',
        contractor_profile_id: 'contractor_profile_123',
      });
    });
  });
});
