/**
 * Stripe Connect Service
 * Handles contractor onboarding to Stripe Connect Express accounts
 */

import { PrismaClient } from '@prisma/client';
import { stripe } from '@/modules/payments/services/stripeService';
import {
  ConnectAccountResult,
  ConnectOnboardingLinkResult,
} from '@/modules/payments/types';

/**
 * Stripe Connect service for contractor onboarding
 */
export class StripeConnectService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create Stripe Connect Express account for contractor
   *
   * @param contractorId - Contractor ID (user ID)
   * @returns Connect account result
   */
  async createConnectAccount(
    contractorId: string
  ): Promise<ConnectAccountResult> {
    // Fetch contractor profile
    const contractor = await this.prisma.contractorProfile.findUnique({
      where: { userId: contractorId },
      include: { user: true },
    });

    if (!contractor) {
      throw new Error(`Contractor profile not found: ${contractorId}`);
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'MX',
      email: contractor.user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        contractor_id: contractorId,
        contractor_profile_id: contractor.id,
      },
    });

    // Update contractor profile with Connect account ID
    await this.prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: { stripeConnectAccountId: account.id },
    });

    console.log(
      `[StripeConnectService] Created Connect account for contractor ${contractorId}`,
      { accountId: account.id }
    );

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  /**
   * Generate onboarding link for contractor KYC
   *
   * @param contractorId - Contractor ID
   * @returns Onboarding link URL
   */
  async createOnboardingLink(
    contractorId: string
  ): Promise<ConnectOnboardingLinkResult> {
    const contractor = await this.prisma.contractorProfile.findUnique({
      where: { userId: contractorId },
    });

    if (!contractor?.stripeConnectAccountId) {
      throw new Error(
        `Contractor ${contractorId} has no Connect account. Create one first.`
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const accountLink = await stripe.accountLinks.create({
      account: contractor.stripeConnectAccountId,
      refresh_url: `${appUrl}/contractors/onboarding/refresh`,
      return_url: `${appUrl}/contractors/onboarding/complete`,
      type: 'account_onboarding',
    });

    console.log(
      `[StripeConnectService] Created onboarding link for contractor ${contractorId}`
    );

    return {
      url: accountLink.url,
      expiresAt: new Date(accountLink.expires_at * 1000),
    };
  }

  /**
   * Get Connect account status
   *
   * @param accountId - Stripe Connect account ID
   * @returns Account status
   */
  async getAccountStatus(
    accountId: string
  ): Promise<ConnectAccountResult> {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }
}

/**
 * Singleton instance
 */
let stripeConnectService: StripeConnectService | null = null;

export function getStripeConnectService(
  prisma: PrismaClient
): StripeConnectService {
  if (!stripeConnectService) {
    stripeConnectService = new StripeConnectService(prisma);
  }
  return stripeConnectService;
}
