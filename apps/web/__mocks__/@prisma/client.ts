/**
 * Mock global de Prisma Client para tests unitarios
 * Este mock intercepta todas las llamadas a @prisma/client
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrismaClient = any;

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
