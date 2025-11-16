/**
 * TC-DB-002: Pruebas de Cliente Prisma y TypeScript
 *
 * Casos de prueba:
 * - TC-DB-002-01: Cliente Prisma singleton no crea múltiples instancias
 * - TC-DB-002-02: Queries de Prisma usan tipos correctos (UUID, DateTime)
 */

import { PrismaClient } from '@prisma/client';
import { db } from '../../src/lib/db';

describe('TC-DB-002: Cliente Prisma y TypeScript', () => {
  describe('TC-DB-002-01: Cliente Prisma singleton no crea múltiples instancias', () => {
    it('debe retornar la misma instancia de PrismaClient en múltiples imports', () => {
      const db1 = db;
      const db2 = db;

      expect(db1).toBe(db2);
      expect(db1).toBeInstanceOf(PrismaClient);
    });

    it('no debe crear nuevas instancias en hot reload (desarrollo)', () => {
      // En desarrollo, Node.js hot reload puede crear múltiples instancias
      // El singleton debe prevenir esto usando globalThis
      const globalAny = globalThis as any;

      if (process.env.NODE_ENV !== 'production') {
        expect(globalAny.cachedPrisma).toBeDefined();
      }
    });
  });

  describe('TC-DB-002-02: Queries de Prisma usan tipos correctos', () => {
    let prisma: PrismaClient;
    let testUserId: string;

    beforeAll(async () => {
      prisma = db;

      // Crear usuario de prueba
      const testUser = await prisma.user.create({
        data: {
          clerkUserId: `clerk_test_types_${Date.now()}`,
          email: `test-types-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'Types',
          role: 'CLIENT',
        },
      });

      testUserId = testUser.id;
    });

    afterAll(async () => {
      // Limpiar datos de prueba
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
    });

    it('debe manejar UUIDs como strings', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(typeof user?.id).toBe('string');
      // UUID v4 format
      expect(user?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('debe manejar DateTime correctamente', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.createdAt).toBeInstanceOf(Date);
      expect(user?.updatedAt).toBeInstanceOf(Date);
      expect(user?.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('debe manejar Decimal para precios correctamente', async () => {
      // Crear categoría y servicio de prueba
      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          slug: `test-category-${Date.now()}`,
          description: 'Test Description',
        },
      });

      const contractor = await prisma.user.create({
        data: {
          clerkUserId: `clerk_contractor_${Date.now()}`,
          email: `contractor-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'Contractor',
          role: 'CONTRACTOR',
        },
      });

      const service = await prisma.service.create({
        data: {
          contractorId: contractor.id,
          categoryId: category.id,
          title: 'Test Service',
          description: 'Test Description',
          basePrice: 1234.56, // Decimal(12,2)
          locationLat: 19.4326,
          locationLng: -99.1332,
          locationAddress: 'Test Address',
          coverageRadiusKm: 10,
        },
      });

      expect(service.basePrice).toBeDefined();
      // Prisma retorna Decimals como Decimal objects
      const priceValue = Number(service.basePrice);
      expect(priceValue).toBe(1234.56);
      expect(priceValue).toBeGreaterThan(0);

      // Limpiar
      await prisma.service.delete({ where: { id: service.id } });
      await prisma.user.delete({ where: { id: contractor.id } });
      await prisma.category.delete({ where: { id: category.id } });
    });

    it('debe manejar arrays correctamente (Text[], JSON)', async () => {
      const contractor = await prisma.user.create({
        data: {
          clerkUserId: `clerk_array_${Date.now()}`,
          email: `array-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'Array',
          role: 'CONTRACTOR',
        },
      });

      const profile = await prisma.contractorProfile.create({
        data: {
          userId: contractor.id,
          businessName: 'Test Business',
          description: 'Test Description',
          specialties: ['plomería', 'electricidad', 'carpintería'],
          verificationDocuments: {
            ine: 's3://bucket/ine.pdf',
            comprobante: 's3://bucket/comprobante.pdf',
          },
        },
      });

      expect(Array.isArray(profile.specialties)).toBe(true);
      expect(profile.specialties).toHaveLength(3);
      expect(profile.specialties).toContain('plomería');

      expect(typeof profile.verificationDocuments).toBe('object');
      expect(profile.verificationDocuments).toHaveProperty('ine');

      // Limpiar
      await prisma.contractorProfile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { id: contractor.id } });
    });

    it('debe manejar enums correctamente con type-safety', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      // TypeScript debe inferir el tipo del enum
      expect(['CLIENT', 'CONTRACTOR', 'ADMIN']).toContain(user?.role);
      expect(['ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION']).toContain(user?.status);
    });
  });
});
