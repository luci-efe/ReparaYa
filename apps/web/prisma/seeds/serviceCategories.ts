// ========================================
// ReparaYa - Service Categories Seed
// ========================================
// Este script carga las categorías de servicios para contratistas
// según la especificación del proposal 2025-11-19-contractor-services-crud
//
// Ejecutar con: npm run prisma:seed
// (o importar desde el seed principal)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Categorías principales de servicios para el marketplace ReparaYa
 *
 * Incluye:
 * - 10+ categorías principales
 * - Subcategorías opcionales con relación parentId
 * - Slugs únicos para búsqueda eficiente
 * - Descripciones en español (idioma principal)
 */
export async function seedServiceCategories() {
  console.log('📁 Seeding service categories...');

  // ========================================
  // CATEGORÍAS PRINCIPALES
  // ========================================

  // 1. Plomería
  const plomeria = await prisma.category.upsert({
    where: { slug: 'plomeria' },
    update: {},
    create: {
      name: 'Plomería',
      slug: 'plomeria',
      description: 'Reparaciones e instalaciones de sistemas de agua, drenaje y tuberías',
      iconUrl: null,
    },
  });

  // 2. Electricidad
  const electricidad = await prisma.category.upsert({
    where: { slug: 'electricidad' },
    update: {},
    create: {
      name: 'Electricidad',
      slug: 'electricidad',
      description: 'Instalaciones eléctricas, reparaciones y mantenimiento de sistemas eléctricos',
      iconUrl: null,
    },
  });

  // 3. Carpintería
  const carpinteria = await prisma.category.upsert({
    where: { slug: 'carpinteria' },
    update: {},
    create: {
      name: 'Carpintería',
      slug: 'carpinteria',
      description: 'Trabajos en madera, muebles, estructuras y acabados',
      iconUrl: null,
    },
  });

  // 4. Limpieza
  const limpieza = await prisma.category.upsert({
    where: { slug: 'limpieza' },
    update: {},
    create: {
      name: 'Limpieza',
      slug: 'limpieza',
      description: 'Servicios de limpieza residencial, profunda y especializada',
      iconUrl: null,
    },
  });

  // 5. Pintura
  const pintura = await prisma.category.upsert({
    where: { slug: 'pintura' },
    update: {},
    create: {
      name: 'Pintura',
      slug: 'pintura',
      description: 'Pintura interior y exterior, decoración y acabados',
      iconUrl: null,
    },
  });

  // 6. Jardinería
  const jardineria = await prisma.category.upsert({
    where: { slug: 'jardineria' },
    update: {},
    create: {
      name: 'Jardinería',
      slug: 'jardineria',
      description: 'Mantenimiento de jardines, poda, diseño de espacios verdes',
      iconUrl: null,
    },
  });

  // 7. Albañilería
  const albanileria = await prisma.category.upsert({
    where: { slug: 'albanileria' },
    update: {},
    create: {
      name: 'Albañilería',
      slug: 'albanileria',
      description: 'Construcción, remodelación y reparación de estructuras',
      iconUrl: null,
    },
  });

  // 8. Cerrajería
  const cerrajeria = await prisma.category.upsert({
    where: { slug: 'cerrajeria' },
    update: {},
    create: {
      name: 'Cerrajería',
      slug: 'cerrajeria',
      description: 'Instalación, reparación y apertura de cerraduras',
      iconUrl: null,
    },
  });

  // 9. Herrería
  const herreria = await prisma.category.upsert({
    where: { slug: 'herreria' },
    update: {},
    create: {
      name: 'Herrería',
      slug: 'herreria',
      description: 'Trabajos en metal, rejas, portones y estructuras metálicas',
      iconUrl: null,
    },
  });

  // 10. Aire Acondicionado
  const aireAcondicionado = await prisma.category.upsert({
    where: { slug: 'aire-acondicionado' },
    update: {},
    create: {
      name: 'Aire Acondicionado',
      slug: 'aire-acondicionado',
      description: 'Instalación, mantenimiento y reparación de sistemas de climatización',
      iconUrl: null,
    },
  });

  // 11. Electrodomésticos
  const electrodomesticos = await prisma.category.upsert({
    where: { slug: 'electrodomesticos' },
    update: {},
    create: {
      name: 'Electrodomésticos',
      slug: 'electrodomesticos',
      description: 'Reparación de lavadoras, refrigeradores, estufas y otros aparatos',
      iconUrl: null,
    },
  });

  // 12. Fumigación
  const fumigacion = await prisma.category.upsert({
    where: { slug: 'fumigacion' },
    update: {},
    create: {
      name: 'Fumigación',
      slug: 'fumigacion',
      description: 'Control de plagas, desinfección y fumigación residencial',
      iconUrl: null,
    },
  });

  // 13. Mudanzas
  const mudanzas = await prisma.category.upsert({
    where: { slug: 'mudanzas' },
    update: {},
    create: {
      name: 'Mudanzas',
      slug: 'mudanzas',
      description: 'Servicios de mudanza, embalaje y transporte de muebles',
      iconUrl: null,
    },
  });

  // ========================================
  // SUBCATEGORÍAS (Ejemplos)
  // ========================================

  // Plomería - Subcategorías
  await prisma.category.upsert({
    where: { slug: 'plomeria-instalacion' },
    update: {},
    create: {
      name: 'Instalación',
      slug: 'plomeria-instalacion',
      description: 'Instalación de tuberías, grifos, calentadores y sistemas de agua',
      parentId: plomeria.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'plomeria-reparacion' },
    update: {},
    create: {
      name: 'Reparación',
      slug: 'plomeria-reparacion',
      description: 'Reparación de fugas, destapado de drenajes y tuberías',
      parentId: plomeria.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'plomeria-mantenimiento' },
    update: {},
    create: {
      name: 'Mantenimiento',
      slug: 'plomeria-mantenimiento',
      description: 'Mantenimiento preventivo de sistemas de plomería',
      parentId: plomeria.id,
    },
  });

  // Electricidad - Subcategorías
  await prisma.category.upsert({
    where: { slug: 'electricidad-instalacion' },
    update: {},
    create: {
      name: 'Instalación',
      slug: 'electricidad-instalacion',
      description: 'Instalación de luminarias, contactos y sistemas eléctricos',
      parentId: electricidad.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'electricidad-reparacion' },
    update: {},
    create: {
      name: 'Reparación',
      slug: 'electricidad-reparacion',
      description: 'Reparación de fallas eléctricas, cortocircuitos y averías',
      parentId: electricidad.id,
    },
  });

  // Limpieza - Subcategorías
  await prisma.category.upsert({
    where: { slug: 'limpieza-profunda' },
    update: {},
    create: {
      name: 'Limpieza Profunda',
      slug: 'limpieza-profunda',
      description: 'Limpieza a fondo de toda la vivienda',
      parentId: limpieza.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'limpieza-post-construccion' },
    update: {},
    create: {
      name: 'Post-Construcción',
      slug: 'limpieza-post-construccion',
      description: 'Limpieza después de obras y remodelaciones',
      parentId: limpieza.id,
    },
  });

  // ========================================
  // RESUMEN
  // ========================================

  const totalCategories = await prisma.category.count();
  const mainCategories = await prisma.category.count({
    where: { parentId: null },
  });
  const subCategories = await prisma.category.count({
    where: { parentId: { not: null } },
  });

  console.log(`✅ Service categories seeded successfully!`);
  console.log(`   - Total categories: ${totalCategories}`);
  console.log(`   - Main categories: ${mainCategories}`);
  console.log(`   - Subcategories: ${subCategories}`);

  return {
    totalCategories,
    mainCategories,
    subCategories,
  };
}

// Exportar para uso individual
export default seedServiceCategories;

// Ejecutar si se llama directamente
if (require.main === module) {
  seedServiceCategories()
    .catch((e) => {
      console.error('❌ Error seeding service categories:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
