/**
 * Mock global de Prisma Client para tests unitarios
 * Este mock intercepta todas las llamadas a @prisma/client
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrismaClient = any;

// Enum exports matching Prisma schema
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

export const mockPrismaClient: MockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  address: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((callback: (client: MockPrismaClient) => unknown) => callback(mockPrismaClient)),
};

export const PrismaClient = jest.fn(() => mockPrismaClient);
