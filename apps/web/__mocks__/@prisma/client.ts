/**
 * Mock global de Prisma Client para tests unitarios
 * Este mock intercepta todas las llamadas a @prisma/client
 */

export const mockPrismaClient = {
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
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

export const PrismaClient = jest.fn(() => mockPrismaClient);
