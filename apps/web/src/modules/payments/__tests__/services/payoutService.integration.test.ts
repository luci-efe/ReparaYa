/**
 * Payout Service Integration Tests
 * REAL tests that create Stripe Transfers to Connect accounts
 *
 * ⚠️ IMPORTANT: These tests require Stripe Connect to be enabled on your Stripe account
 *
 * To enable Stripe Connect:
 * 1. Go to https://dashboard.stripe.com/test/connect/accounts/overview
 * 2. Click "Get started with Connect"
 * 3. Complete the onboarding process
 *
 * These tests will be SKIPPED if Stripe Connect is not enabled.
 * This is expected behavior for accounts that haven't enabled Connect yet.
 */

import { PayoutService } from '../../services/payoutService';
import { stripe } from '../../services/stripeService';
import {
  createTestBooking,
  createTestContractor,
  cleanupTestData,
  disconnectDatabase,
  prisma,
} from '../helpers/testDatabase';

// Check if Stripe Connect is available
let stripeConnectEnabled = false;

beforeAll(async () => {
  try {
    // Try to create a test Connect account to verify Connect is enabled
    const testAccount = await stripe.accounts.create({
      type: 'express',
      country: 'MX',
      metadata: { test: 'connectivity_check' },
    });

    // Clean up test account
    await stripe.accounts.del(testAccount.id);
    stripeConnectEnabled = true;
    console.log('✅ Stripe Connect is enabled - running integration tests');
  } catch (error: any) {
    if (error.message?.includes('signed up for Connect')) {
      console.warn('⚠️  Stripe Connect is NOT enabled - skipping payout integration tests');
      console.warn('   To enable: https://dashboard.stripe.com/test/connect/accounts/overview');
      stripeConnectEnabled = false;
    } else {
      throw error;
    }
  }
});

const describeIfConnectEnabled = stripeConnectEnabled ? describe : describe.skip;

describeIfConnectEnabled('PayoutService - Real Integration Tests', () => {
  let payoutService: PayoutService;
  const testIds: { bookingIds: string[]; paymentIds: string[]; userIds: string[] } = {
    bookingIds: [],
    paymentIds: [],
    userIds: [],
  };

  beforeAll(() => {
    payoutService = new PayoutService(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(testIds);
    await disconnectDatabase();
  });

  describe('TC-RF-010-01: Create payout when booking COMPLETED', () => {
    it('should create REAL Stripe Transfer to contractor', async () => {
      // 1. Create contractor with Stripe Connect account
      const { user: contractor, profile } = await createTestContractor();
      testIds.userIds.push(contractor.id);

      // 2. Create REAL Connect account in Stripe
      const connectAccount = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        email: contractor.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          contractor_id: contractor.id,
          test: 'true',
        },
      });

      // 3. Update contractor profile with Connect account ID
      await prisma.contractorProfile.update({
        where: { id: profile.id },
        data: { stripeConnectAccountId: connectAccount.id },
      });

      // 4. Create booking with COMPLETED status
      const booking = await createTestBooking({
        contractorId: contractor.id,
        status: 'COMPLETED',
      });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId);

      // 5. Create REAL payout (Stripe Transfer)
      const result = await payoutService.createPayout(booking.id);
      testIds.paymentIds.push(result.payment.id);

      // 6. Verify transfer created in Stripe
      expect(result.stripeTransferId).toMatch(/^tr_/);
      expect(result.amount.toNumber()).toBe(93.50);

      const stripeTransfer = await stripe.transfers.retrieve(result.stripeTransferId);
      expect(stripeTransfer.amount).toBe(9350); // $93.50 in cents
      expect(stripeTransfer.destination).toBe(connectAccount.id);

      // 7. Verify payment record in database
      expect(result.payment.type).toBe('LIQUIDACION');
      expect(result.payment.status).toBe('SUCCEEDED');

      console.log(`✅ Real Stripe Transfer created: ${result.stripeTransferId}`);
      console.log(`   View in dashboard: https://dashboard.stripe.com/test/connect/transfers`);
      console.log(`   Connect account: ${connectAccount.id}`);
    }, 90000); // 90s timeout for Connect setup
  });

  describe('TC-RF-010-02: Payout amount matches 85% of final price', () => {
    it('should transfer exactly 85% to contractor', async () => {
      const { user: contractor, profile } = await createTestContractor();
      testIds.userIds.push(contractor.id);

      const connectAccount = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        email: contractor.email,
        capabilities: { transfers: { requested: true } },
      });

      await prisma.contractorProfile.update({
        where: { id: profile.id },
        data: { stripeConnectAccountId: connectAccount.id },
      });

      const booking = await createTestBooking({
        contractorId: contractor.id,
        status: 'COMPLETED',
        finalPrice: 110,
        contractorPayoutAmount: 93.50, // 110 * 0.85
      });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId);

      const result = await payoutService.createPayout(booking.id);
      testIds.paymentIds.push(result.payment.id);

      const stripeTransfer = await stripe.transfers.retrieve(result.stripeTransferId);
      expect(stripeTransfer.amount).toBe(9350); // Exactly $93.50

      console.log(`✅ Correct payout amount: $93.50 (85% of $110)`);
    }, 90000);
  });

  describe('TC-RF-010-04: Payout fails if contractor has no Connect account', () => {
    it('should throw error for missing Connect account', async () => {
      const { user: contractor } = await createTestContractor();
      testIds.userIds.push(contractor.id);

      // Don't create Connect account - should fail

      const booking = await createTestBooking({
        contractorId: contractor.id,
        status: 'COMPLETED',
      });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId);

      await expect(
        payoutService.createPayout(booking.id)
      ).rejects.toThrow();

      console.log(`✅ Error thrown for missing Connect account`);
    }, 60000);
  });

  describe('TC-RF-010-06: Payout is idempotent (prevents double payment)', () => {
    it('should return existing payout if already created', async () => {
      const { user: contractor, profile } = await createTestContractor();
      testIds.userIds.push(contractor.id);

      const connectAccount = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        email: contractor.email,
        capabilities: { transfers: { requested: true } },
      });

      await prisma.contractorProfile.update({
        where: { id: profile.id },
        data: { stripeConnectAccountId: connectAccount.id },
      });

      const booking = await createTestBooking({
        contractorId: contractor.id,
        status: 'COMPLETED',
      });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId);

      // Create first payout
      const result1 = await payoutService.createPayout(booking.id);
      testIds.paymentIds.push(result1.payment.id);

      const initialTransferId = result1.stripeTransferId;

      // Try to create again - should return existing
      const result2 = await payoutService.createPayout(booking.id);

      expect(result2.stripeTransferId).toBe(initialTransferId);
      expect(result2.payment.id).toBe(result1.payment.id);

      // Verify only ONE transfer was created in Stripe
      const transfers = await stripe.transfers.list({
        destination: connectAccount.id,
        limit: 10,
      });

      const bookingTransfers = transfers.data.filter(
        t => t.metadata?.booking_id === booking.id
      );
      expect(bookingTransfers.length).toBe(1);

      console.log(`✅ Idempotency verified: no duplicate transfer created`);
    }, 90000);
  });
});
