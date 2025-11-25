/**
 * Booking Module Stub/Mock
 * Minimal implementation for payments testing until booking module exists
 */

import { Decimal } from '@prisma/client/runtime/library';

export interface BookingStub {
  id: string;
  serviceId: string;
  clientId: string;
  contractorId: string;
  status: string;
  scheduledDate: Date;
  address: string;
  basePrice: Decimal;
  finalPrice: Decimal;
  anticipoAmount: Decimal;
  liquidacionAmount: Decimal;
  comisionAmount: Decimal;
  contractorPayoutAmount: Decimal;
  service: {
    id: string;
    title: string;
    images: string[];
  };
  client: {
    id: string;
    email: string;
  };
  contractor: {
    id: string;
    contractorProfile?: {
      id: string;
      stripeConnectAccountId: string | null;
    };
  };
}

/**
 * Create a mock booking for testing
 */
export function createMockBooking(overrides?: Partial<BookingStub>): BookingStub {
  return {
    id: 'booking_test_123',
    serviceId: 'service_456',
    clientId: 'user_client_789',
    contractorId: 'user_contractor_abc',
    status: 'PENDING_PAYMENT',
    scheduledDate: new Date('2025-12-01T10:00:00Z'),
    address: 'Calle Test 123, Guadalajara',
    basePrice: new Decimal(100),
    finalPrice: new Decimal(110),
    anticipoAmount: new Decimal(33),
    liquidacionAmount: new Decimal(77),
    comisionAmount: new Decimal(16.50),
    contractorPayoutAmount: new Decimal(93.50),
    service: {
      id: 'service_456',
      title: 'Reparación de plomería',
      images: ['https://example.com/image1.jpg'],
    },
    client: {
      id: 'user_client_789',
      email: 'client@test.com',
    },
    contractor: {
      id: 'user_contractor_abc',
      contractorProfile: {
        id: 'contractor_profile_123',
        stripeConnectAccountId: 'acct_test_connect_123',
      },
    },
    ...overrides,
  };
}
