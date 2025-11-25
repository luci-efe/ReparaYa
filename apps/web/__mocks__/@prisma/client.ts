/**
 * Mock global de Prisma Client para tests unitarios
 * Este mock intercepta todas las llamadas a @prisma/client
 *
 * NOTA: Los tests de integración deben usar jest.requireActual('@prisma/client')
 * para obtener el cliente real y conectarse a la base de datos.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrismaClient = any;

// Enum exports matching Prisma schema (from dev branch)
export enum BookingStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  ON_ROUTE = 'ON_ROUTE',
  ON_SITE = 'ON_SITE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum PaymentType {
  ANTICIPO = 'ANTICIPO',
  LIQUIDACION = 'LIQUIDACION',
  REEMBOLSO = 'REEMBOLSO',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Helper para crear mocks de modelos con operaciones CRUD estándar (from feature branch)
const createModelMock = () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
});

export const mockPrismaClient: MockPrismaClient = {
  // User models
  user: createModelMock(),
  contractorProfile: createModelMock(),
  address: createModelMock(),

  // Service models
  category: createModelMock(),
  service: createModelMock(),
  availability: createModelMock(),

  // Booking models
  booking: createModelMock(),
  bookingStateHistory: createModelMock(),

  // Payment models
  payment: createModelMock(),
  processedWebhookEvent: createModelMock(),

  // Communication models
  message: createModelMock(),

  // Rating models
  rating: createModelMock(),
  serviceRatingStats: createModelMock(),

  // Admin models
  dispute: createModelMock(),
  adminAuditLog: createModelMock(),

  // Prisma utility methods
  $transaction: jest.fn((callback: (client: MockPrismaClient) => unknown) => callback(mockPrismaClient)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

export const PrismaClient = jest.fn(() => mockPrismaClient);
