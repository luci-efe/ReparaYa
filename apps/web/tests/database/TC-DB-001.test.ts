/**
 * TC-DB-001: Pruebas de Infraestructura y Schema de Base de Datos
 *
 * Casos de prueba:
 * - TC-DB-001-01: Conexión a base de datos Supabase exitosa
 * - TC-DB-001-02: Migración inicial genera todas las tablas
 * - TC-DB-001-03: Índices creados correctamente
 * - TC-DB-001-04: Restricciones de integridad referencial funcionan
 * - TC-DB-001-05: Enums de Prisma coinciden con valores de specs
 */

import { PrismaClient } from '@prisma/client';

describe('TC-DB-001: Infraestructura y Schema de Base de Datos', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('TC-DB-001-01: Conexión a base de datos Supabase exitosa', () => {
    it('debe conectarse a Supabase y ejecutar una query simple', async () => {
      const result = await prisma.$queryRaw`SELECT version()` as unknown[];
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('debe poder verificar el estado de la conexión', async () => {
      await expect(prisma.$queryRaw`SELECT 1 as health`).resolves.toBeDefined();
    });
  });

  describe('TC-DB-001-02: Migración inicial genera todas las tablas', () => {
    const expectedTables = [
      'User',
      'ContractorProfile',
      'Address',
      'Category',
      'Service',
      'Availability',
      'Booking',
      'BookingStateHistory',
      'Payment',
      'ProcessedWebhookEvent',
      'Message',
      'Rating',
      'ServiceRatingStats',
      'Dispute',
      'AdminAuditLog',
    ];

    it('debe verificar que todas las tablas existen', async () => {
      const tables: any[] = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `;

      const tableNames = tables.map((t) => t.table_name);

      expectedTables.forEach((expectedTable) => {
        expect(tableNames).toContain(expectedTable);
      });
    });

    it('debe verificar que la tabla _prisma_migrations existe', async () => {
      const result: any[] = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
        ) as exists
      `;
      expect(result[0].exists).toBe(true);
    });
  });

  describe('TC-DB-001-03: Índices creados correctamente', () => {
    it('debe verificar índices únicos en User', async () => {
      const indexes: any[] = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'User'
      `;

      const indexNames = indexes.map((i) => i.indexname);

      // Índices únicos esperados
      expect(indexNames).toContain('User_clerkUserId_key');
      expect(indexNames).toContain('User_email_key');
    });

    it('debe verificar índices compuestos en Service', async () => {
      const indexes: any[] = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'Service'
      `;

      const indexNames = indexes.map((i) => i.indexname);

      // Índices para búsquedas geoespaciales
      expect(indexNames).toContain('Service_locationLat_locationLng_idx');
      expect(indexNames).toContain('Service_categoryId_status_idx');
      expect(indexNames).toContain('Service_status_idx');
    });

    it('debe verificar índices en Booking para performance', async () => {
      const indexes: any[] = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'Booking'
      `;

      const indexNames = indexes.map((i) => i.indexname);

      expect(indexNames).toContain('Booking_clientId_status_idx');
      expect(indexNames).toContain('Booking_contractorId_status_idx');
      expect(indexNames).toContain('Booking_status_scheduledDate_idx');
    });
  });

  describe('TC-DB-001-04: Restricciones de integridad referencial funcionan', () => {
    it('debe rechazar inserción de ContractorProfile sin User válido', async () => {
      await expect(
        prisma.contractorProfile.create({
          data: {
            id: 'test-profile-invalid',
            userId: 'non-existent-user-id',
            businessName: 'Test Business',
            description: 'Test Description',
            specialties: ['test'],
          },
        })
      ).rejects.toThrow();
    });

    it('debe rechazar inserción de Service sin Category válida', async () => {
      // Primero crear un usuario
      const user = await prisma.user.create({
        data: {
          id: 'test-user-fk',
          clerkUserId: `clerk_test_${Date.now()}`,
          email: `test-fk-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRACTOR',
        },
      });

      await expect(
        prisma.service.create({
          data: {
            contractorId: user.id,
            categoryId: 'non-existent-category-id',
            title: 'Test Service',
            description: 'Test Description',
            basePrice: 100,
            locationLat: 19.4326,
            locationLng: -99.1332,
            locationAddress: 'Test Address',
            coverageRadiusKm: 10,
          },
        })
      ).rejects.toThrow();

      // Limpiar
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('debe eliminar en cascada al borrar un User con ContractorProfile', async () => {
      // Crear usuario y perfil
      const user = await prisma.user.create({
        data: {
          id: 'test-user-cascade',
          clerkUserId: `clerk_test_cascade_${Date.now()}`,
          email: `test-cascade-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'Cascade',
          role: 'CONTRACTOR',
        },
      });

      const profile = await prisma.contractorProfile.create({
        data: {
          userId: user.id,
          businessName: 'Test Business Cascade',
          description: 'Test Description',
          specialties: ['test'],
        },
      });

      // Eliminar usuario
      await prisma.user.delete({ where: { id: user.id } });

      // Verificar que el perfil también se eliminó (cascade)
      const deletedProfile = await prisma.contractorProfile.findUnique({
        where: { id: profile.id },
      });

      expect(deletedProfile).toBeNull();
    });
  });

  describe('TC-DB-001-05: Enums de Prisma coinciden con valores de specs', () => {
    it('debe verificar que enum UserRole tiene los valores correctos', async () => {
      const enumValues: any[] = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::\"UserRole\"))::text as value
      `;

      const values = enumValues.map((v) => v.value);
      expect(values).toContain('CLIENT');
      expect(values).toContain('CONTRACTOR');
      expect(values).toContain('ADMIN');
      expect(values).toHaveLength(3);
    });

    it('debe verificar que enum BookingStatus tiene todos los estados del flujo', async () => {
      const enumValues: any[] = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::\"BookingStatus\"))::text as value
      `;

      const values = enumValues.map((v) => v.value);
      const expectedStates = [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'ON_ROUTE',
        'ON_SITE',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
      ];

      expectedStates.forEach((state) => {
        expect(values).toContain(state);
      });
    });

    it('debe verificar que enum PaymentType coincide con la spec', async () => {
      const enumValues: any[] = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::\"PaymentType\"))::text as value
      `;

      const values = enumValues.map((v) => v.value);
      expect(values).toContain('ANTICIPO');
      expect(values).toContain('LIQUIDACION');
      expect(values).toContain('REEMBOLSO');
      expect(values).toHaveLength(3);
    });
  });
});
