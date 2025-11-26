// ========================================
// ReparaYa - Database Seed Script
// ========================================
// Este script carga datos de prueba en la base de datos
// para desarrollo y testing local.
//
// Ejecutar con: npm run prisma:seed
// (definido en package.json como "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" })

import { PrismaClient, UserRole, ServiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { seedServiceCategories } from './seeds/serviceCategories';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ========================================
  // GUARDAS DE SEGURIDAD: Prevenir ejecución accidental en producción
  // ========================================
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ABORTED: Seed cannot run in production (NODE_ENV=production)');
    console.error('   This would wipe all production data!');
    process.exit(1);
  }

  if (process.env.SEED_ALLOW_DATA_WIPE !== 'true') {
    console.error('❌ ABORTED: Missing required environment variable');
    console.error('   To confirm you want to WIPE ALL DATA, set:');
    console.error('   SEED_ALLOW_DATA_WIPE=true npm run prisma:seed');
    console.error('');
    console.error('   Current environment:');
    console.error(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.error(`   - SEED_ALLOW_DATA_WIPE: ${process.env.SEED_ALLOW_DATA_WIPE || 'undefined'}`);
    process.exit(1);
  }

  console.log('⚠️  SAFETY CHECKS PASSED - Proceeding with data wipe');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log('');

  // ========================================
  // 1. Limpiar datos existentes (solo en dev!)
  // ========================================
  console.log('🗑️  Cleaning existing data...');
  await prisma.adminAuditLog.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.serviceRatingStats.deleteMany();
  await prisma.clientRating.deleteMany();
  await prisma.contractorRating.deleteMany();

  await prisma.message.deleteMany();
  await prisma.processedWebhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingStateHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.contractorProfile.deleteMany();
  await prisma.user.deleteMany();

  // ========================================
  // 2. Crear usuarios de prueba
  // ========================================
  console.log('👥 Creating test users...');

  // Admin
  await prisma.user.create({
    data: {
      clerkUserId: 'user_admin_test_001',
      email: 'admin@reparaya.test',
      firstName: 'Admin',
      lastName: 'ReparaYa',
      role: UserRole.ADMIN,
    },
  });

  // Clientes
  const clients = await Promise.all([
    prisma.user.create({
      data: {
        clerkUserId: 'user_client_test_001',
        email: 'cliente1@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        role: UserRole.CLIENT,
      },
    }),
    prisma.user.create({
      data: {
        clerkUserId: 'user_client_test_002',
        email: 'cliente2@test.com',
        firstName: 'María',
        lastName: 'González',
        role: UserRole.CLIENT,
      },
    }),
  ]);

  // Contratistas
  const contractors = await Promise.all([
    prisma.user.create({
      data: {
        clerkUserId: 'user_contractor_test_001',
        email: 'plomero@test.com',
        firstName: 'Carlos',
        lastName: 'Martínez',
        role: UserRole.CONTRACTOR,
        contractorProfile: {
          create: {
            businessName: 'Plomería Martínez',
            description: 'Servicios de plomería profesional con 10 años de experiencia',
            specialties: ['Plomería', 'Instalaciones'],
            verified: true,
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        clerkUserId: 'user_contractor_test_002',
        email: 'electricista@test.com',
        firstName: 'Ana',
        lastName: 'López',
        role: UserRole.CONTRACTOR,
        contractorProfile: {
          create: {
            businessName: 'Electricidad López',
            description: 'Instalaciones eléctricas residenciales y comerciales',
            specialties: ['Electricidad', 'Instalaciones'],
            verified: true,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${1 + clients.length + contractors.length} users`);

  // ========================================
  // 3. Crear categorías
  // ========================================
  const categoryStats = await seedServiceCategories(prisma);

  // ========================================
  // 4. Crear servicios
  // ========================================
  console.log('🔧 Creating services...');

  // Obtener categorías por slug para crear servicios
  const plomeriaCategory = await prisma.category.findUnique({ where: { slug: 'plomeria' } });
  const electricidadCategory = await prisma.category.findUnique({ where: { slug: 'electricidad' } });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        contractorId: contractors[0].id,
        categoryId: plomeriaCategory!.id,
        title: 'Reparación de fugas',
        description: 'Detección y reparación de fugas de agua en tuberías',
        basePrice: new Decimal('500.00'),
        durationMinutes: 120,
        locationLat: new Decimal('19.4326'),
        locationLng: new Decimal('-99.1332'),
        locationAddress: 'Ciudad de México, CDMX',
        coverageRadiusKm: 10,
        status: ServiceStatus.ACTIVE,
      },
    }),
    prisma.service.create({
      data: {
        contractorId: contractors[1].id,
        categoryId: electricidadCategory!.id,
        title: 'Instalación de luminarias',
        description: 'Instalación de lámparas, spots y sistemas de iluminación',
        basePrice: new Decimal('800.00'),
        durationMinutes: 180,
        locationLat: new Decimal('19.4326'),
        locationLng: new Decimal('-99.1332'),
        locationAddress: 'Ciudad de México, CDMX',
        coverageRadiusKm: 15,
        status: ServiceStatus.ACTIVE,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // ========================================
  // 5. Crear disponibilidad
  // ========================================
  console.log('📅 Creating availability slots...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const availabilities = await Promise.all([
    prisma.availability.create({
      data: {
        serviceId: services[0].id,
        date: tomorrow,
        startTime: new Date(tomorrow.getTime()),
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // +2 horas
      },
    }),
    prisma.availability.create({
      data: {
        serviceId: services[1].id,
        date: tomorrow,
        startTime: new Date(tomorrow.getTime()),
        endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000), // +3 horas
      },
    }),
  ]);

  console.log(`✅ Created ${availabilities.length} availability slots`);

  // ========================================
  // DONE
  // ========================================
  console.log('');
  console.log('✨ Seed completed successfully!');
  console.log(`   - Users: ${1 + clients.length + contractors.length}`);
  console.log(`   - Main categories: ${categoryStats.mainCategories}`);
  console.log(`   - Subcategories: ${categoryStats.subcategories}`);
  console.log(`   - Total categories: ${categoryStats.total}`);
  console.log(`   - Services: ${services.length}`);
  console.log(`   - Availability slots: ${availabilities.length}`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Visit: http://localhost:3000');
  console.log('   3. Use Prisma Studio to explore data: npm run prisma:studio');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
