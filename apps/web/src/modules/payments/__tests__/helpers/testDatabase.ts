/**
 * Test Database Helpers
 * Real database operations for integration tests
 */

import { Decimal } from '@prisma/client/runtime/library';

// CRITICAL: Use the REAL Prisma client for integration tests, not the mock!
// jest.requireActual bypasses the __mocks__/@prisma/client.ts mock
const { PrismaClient } = jest.requireActual('@prisma/client');

// Create fresh Prisma client for tests (bypasses global cache)
const prisma = new PrismaClient();

// Debug: check if prisma is properly loaded
console.log('[testDatabase] Prisma loaded:', !!prisma);
console.log('[testDatabase] Has contractorProfile:', !!prisma?.contractorProfile);
console.log('[testDatabase] Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 10));

/**
 * Create a real test user in database
 */
export async function createTestUser(overrides?: Partial<any>) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `test_clerk_${Date.now()}_${Math.random()}`,
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'CLIENT',
      ...overrides,
    },
  });
  return user;
}

/**
 * Create a real test contractor in database with profile
 */
export async function createTestContractor() {
  const user = await createTestUser({ role: 'CONTRACTOR' });

  const profile = await prisma.contractorProfile.create({
    data: {
      userId: user.id,
      businessName: 'Test Contractor Business',
      description: 'Test contractor description',
      specialties: ['plumbing', 'electrical'],
      verified: true,
    },
  });

  return { user, profile };
}

/**
 * Create a real test service in database
 */
export async function createTestService(contractorId: string, categoryId: string) {
  const service = await prisma.service.create({
    data: {
      contractorId,
      categoryId,
      title: 'Test Plumbing Service',
      description: 'Test service description',
      basePrice: new Decimal(100),
      locationLat: new Decimal(19.4326), // Mexico City coords
      locationLng: new Decimal(-99.1332),
      locationAddress: 'Test Address, CDMX',
      coverageRadiusKm: 10,
      status: 'ACTIVE',
      images: [],
    },
  });
  return service;
}

/**
 * Create a real test category in database
 */
export async function createTestCategory() {
  // Check if category exists first
  const existing = await prisma.category.findFirst({
    where: { name: 'Test Category' },
  });

  if (existing) return existing;

  const category = await prisma.category.create({
    data: {
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test category for integration tests',
      iconUrl: 'test-icon',
    },
  });
  return category;
}

/**
 * Create a real test booking in database
 */
export async function createTestBooking(overrides?: Partial<any>) {
  const client = await createTestUser({ role: 'CLIENT' });
  const { user: contractor, profile } = await createTestContractor();
  const category = await createTestCategory();
  const service = await createTestService(contractor.id, category.id);

  // Create an availability slot for the booking
  const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
  const availability = await prisma.availability.create({
    data: {
      serviceId: service.id,
      date: scheduledDate,
      startTime: new Date(scheduledDate.getTime() + 9 * 3600000), // 9 AM
      endTime: new Date(scheduledDate.getTime() + 10 * 3600000), // 10 AM
      status: 'BOOKED',
    },
  });

  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      contractorId: contractor.id,
      serviceId: service.id,
      availabilityId: availability.id,
      status: 'PENDING_PAYMENT',
      address: 'Test Address, Guadalajara',
      basePrice: new Decimal(100),
      finalPrice: new Decimal(110),
      anticipoAmount: new Decimal(33),
      liquidacionAmount: new Decimal(77),
      comisionAmount: new Decimal(16.50),
      contractorPayoutAmount: new Decimal(93.50),
      scheduledDate,
      ...overrides,
    },
    include: {
      service: true,
      client: true,
      contractor: {
        include: {
          contractorProfile: true,
        },
      },
    },
  });

  return booking;
}

/**
 * Clean up test data - delete all test records
 */
export async function cleanupTestData(testIds: {
  bookingIds?: string[];
  paymentIds?: string[];
  userIds?: string[];
  serviceIds?: string[];
}) {
  // Delete in correct order due to foreign keys
  if (testIds.paymentIds?.length) {
    await prisma.payment.deleteMany({
      where: { id: { in: testIds.paymentIds } },
    });
  }

  if (testIds.bookingIds?.length) {
    await prisma.booking.deleteMany({
      where: { id: { in: testIds.bookingIds } },
    });
  }

  if (testIds.serviceIds?.length) {
    await prisma.service.deleteMany({
      where: { id: { in: testIds.serviceIds } },
    });
  }

  if (testIds.userIds?.length) {
    await prisma.contractorProfile.deleteMany({
      where: { userId: { in: testIds.userIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: testIds.userIds } },
    });
  }
}

/**
 * Disconnect from database (cleanup after tests)
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export { prisma };
