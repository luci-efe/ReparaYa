// ========================================
// ReparaYa - Service Categories Seed
// ========================================
// Este módulo crea categorías y subcategorías de servicios
// para el marketplace mexicano de ReparaYa.
//
// Ejecutar con: SEED_ALLOW_DATA_WIPE=true npm run prisma:seed

import { PrismaClient } from '@prisma/client';

/**
 * Elimina acentos y caracteres especiales para generar slugs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
    .trim();
}

/**
 * Categoría con subcategorías
 */
interface CategoryData {
  name: string;
  description: string;
  iconUrl?: string;
  subcategories?: SubcategoryData[];
}

interface SubcategoryData {
  name: string;
  description: string;
}

/**
 * Catálogo completo de categorías para el mercado mexicano
 */
const CATEGORIES: CategoryData[] = [
  {
    name: 'Plomería',
    description: 'Servicios profesionales de instalación, reparación y mantenimiento de sistemas de agua, drenaje y gas',
    subcategories: [
      {
        name: 'Instalación',
        description: 'Instalación de tuberías, llaves, regaderas, calentadores y sistemas completos',
      },
      {
        name: 'Reparación',
        description: 'Reparación de fugas, tuberías rotas, llaves dañadas y problemas de presión',
      },
      {
        name: 'Mantenimiento',
        description: 'Mantenimiento preventivo de sistemas hidráulicos, revisión de instalaciones',
      },
      {
        name: 'Desazolve',
        description: 'Destapado de cañerías, drenajes, fosas sépticas y sistemas de desagüe',
      },
      {
        name: 'Calentadores',
        description: 'Instalación, reparación y mantenimiento de calentadores de agua (gas y eléctricos)',
      },
    ],
  },
  {
    name: 'Electricidad',
    description: 'Instalaciones eléctricas residenciales y comerciales, reparaciones y mantenimiento especializado',
    subcategories: [
      {
        name: 'Instalación Eléctrica',
        description: 'Instalación de cableado, tableros, contactos y circuitos eléctricos completos',
      },
      {
        name: 'Reparación',
        description: 'Reparación de cortocircuitos, contactos, apagadores y problemas eléctricos',
      },
      {
        name: 'Iluminación',
        description: 'Instalación de lámparas, spots, sistemas de iluminación LED y decorativa',
      },
      {
        name: 'Mantenimiento',
        description: 'Revisión y mantenimiento preventivo de instalaciones eléctricas',
      },
      {
        name: 'Emergencias',
        description: 'Atención de emergencias eléctricas, apagones y fallas críticas',
      },
    ],
  },
  {
    name: 'Carpintería',
    description: 'Trabajos especializados en madera, fabricación de muebles, puertas y reparaciones',
    subcategories: [
      {
        name: 'Muebles a Medida',
        description: 'Fabricación de muebles personalizados: closets, cocinas, libreros',
      },
      {
        name: 'Puertas y Ventanas',
        description: 'Instalación y reparación de puertas, ventanas y marcos de madera',
      },
      {
        name: 'Reparación',
        description: 'Reparación de muebles, restauración y acabados',
      },
      {
        name: 'Pisos de Madera',
        description: 'Instalación, pulido y mantenimiento de pisos de madera y laminados',
      },
    ],
  },
  {
    name: 'Limpieza',
    description: 'Servicios profesionales de limpieza residencial, comercial y especializada',
    subcategories: [
      {
        name: 'Limpieza Residencial',
        description: 'Limpieza general de casas, departamentos y condominios',
      },
      {
        name: 'Limpieza Profunda',
        description: 'Limpieza profunda de espacios, desinfección y sanitización',
      },
      {
        name: 'Limpieza de Oficinas',
        description: 'Limpieza comercial de oficinas, espacios de coworking y comercios',
      },
      {
        name: 'Limpieza Post-Obra',
        description: 'Limpieza especializada después de remodelaciones y construcción',
      },
      {
        name: 'Limpieza de Alfombras',
        description: 'Lavado y limpieza profunda de alfombras, tapetes y muebles',
      },
    ],
  },
  {
    name: 'Pintura',
    description: 'Servicios de pintura interior y exterior, acabados decorativos y mantenimiento',
    subcategories: [
      {
        name: 'Pintura Interior',
        description: 'Pintura de interiores: paredes, techos, acabados lisos y texturizados',
      },
      {
        name: 'Pintura Exterior',
        description: 'Pintura de fachadas, bardas y exteriores con productos impermeables',
      },
      {
        name: 'Acabados Especiales',
        description: 'Acabados decorativos, texturas, estuco, pintura de diseño',
      },
      {
        name: 'Impermeabilización',
        description: 'Aplicación de impermeabilizantes en azoteas y muros',
      },
    ],
  },
  {
    name: 'Jardinería',
    description: 'Mantenimiento de jardines, diseño de espacios verdes y cuidado de plantas',
    subcategories: [
      {
        name: 'Mantenimiento',
        description: 'Mantenimiento regular de jardines, poda y cuidado de áreas verdes',
      },
      {
        name: 'Diseño de Jardines',
        description: 'Diseño e instalación de jardines, áreas verdes y paisajismo',
      },
      {
        name: 'Poda y Tala',
        description: 'Poda de árboles, arbustos y tala de árboles peligrosos',
      },
      {
        name: 'Sistemas de Riego',
        description: 'Instalación y mantenimiento de sistemas de riego automático',
      },
    ],
  },
  {
    name: 'Albañilería',
    description: 'Construcción, remodelación y reparación de estructuras de obra civil',
    subcategories: [
      {
        name: 'Construcción',
        description: 'Construcción de muros, bardas, estructuras y obra nueva',
      },
      {
        name: 'Remodelación',
        description: 'Remodelación de espacios, ampliaciones y modificaciones',
      },
      {
        name: 'Pisos y Azulejos',
        description: 'Instalación de pisos, azulejos, losetas y recubrimientos',
      },
      {
        name: 'Reparaciones',
        description: 'Reparación de grietas, humedades, aplanados y resanes',
      },
      {
        name: 'Cancelería',
        description: 'Instalación de ventanas, puertas y herrería en obra',
      },
    ],
  },
  {
    name: 'Cerrajería',
    description: 'Servicios de cerrajería, instalación de chapas y seguridad residencial',
    subcategories: [
      {
        name: 'Instalación',
        description: 'Instalación de chapas, cerraduras, candados y sistemas de seguridad',
      },
      {
        name: 'Apertura de Puertas',
        description: 'Apertura de puertas cerradas, emergencias de cerrajería 24/7',
      },
      {
        name: 'Reparación',
        description: 'Reparación de cerraduras dañadas, cambio de combinaciones',
      },
      {
        name: 'Duplicado de Llaves',
        description: 'Duplicado de llaves de casa, auto y sistemas especiales',
      },
    ],
  },
  {
    name: 'Climatización',
    description: 'Instalación y mantenimiento de sistemas de aire acondicionado y calefacción',
    subcategories: [
      {
        name: 'Instalación de A/C',
        description: 'Instalación de aires acondicionados tipo mini split y de ventana',
      },
      {
        name: 'Mantenimiento',
        description: 'Mantenimiento preventivo y correctivo de equipos de climatización',
      },
      {
        name: 'Recarga de Gas',
        description: 'Recarga de gas refrigerante y detección de fugas',
      },
      {
        name: 'Reparación',
        description: 'Reparación de equipos de aire acondicionado y calefacción',
      },
    ],
  },
  {
    name: 'Mudanzas',
    description: 'Servicios de mudanza residencial y comercial, empaque y transporte seguro',
    subcategories: [
      {
        name: 'Mudanza Local',
        description: 'Mudanzas dentro de la ciudad, transporte y carga/descarga',
      },
      {
        name: 'Mudanza Foránea',
        description: 'Mudanzas entre ciudades, empaque especializado y transporte',
      },
      {
        name: 'Empaque',
        description: 'Servicio de empaque profesional, materiales y embalaje',
      },
      {
        name: 'Mudanza de Oficinas',
        description: 'Mudanzas corporativas, equipo de cómputo y mobiliario',
      },
    ],
  },
  {
    name: 'Herrería',
    description: 'Trabajos en metal, fabricación e instalación de estructuras metálicas',
    subcategories: [
      {
        name: 'Protecciones',
        description: 'Fabricación e instalación de protecciones para ventanas y puertas',
      },
      {
        name: 'Portones',
        description: 'Instalación de portones automáticos y manuales',
      },
      {
        name: 'Escaleras',
        description: 'Fabricación de escaleras metálicas, barandales y pasamanos',
      },
      {
        name: 'Reparación',
        description: 'Reparación y mantenimiento de estructuras metálicas',
      },
    ],
  },
  {
    name: 'Techado',
    description: 'Construcción, reparación e impermeabilización de techos',
    subcategories: [
      {
        name: 'Instalación',
        description: 'Instalación de techos de lámina, teja y materiales especiales',
      },
      {
        name: 'Reparación',
        description: 'Reparación de goteras, filtraciones y daños en techos',
      },
      {
        name: 'Impermeabilización',
        description: 'Impermeabilización de azoteas y techos',
      },
      {
        name: 'Canaletas',
        description: 'Instalación y mantenimiento de sistemas de canaletas y bajadas',
      },
    ],
  },
];

/**
 * Crea categorías y subcategorías de servicios de forma idempotente
 */
export async function seedServiceCategories(prisma: PrismaClient) {
  console.log('📁 Seeding service categories...');

  let mainCategoryCount = 0;
  let subcategoryCount = 0;

  for (const categoryData of CATEGORIES) {
    const slug = slugify(categoryData.name);

    // Crear o actualizar categoría principal (upsert)
    const mainCategory = await prisma.category.upsert({
      where: { slug },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        iconUrl: categoryData.iconUrl,
      },
      create: {
        name: categoryData.name,
        slug,
        description: categoryData.description,
        iconUrl: categoryData.iconUrl,
      },
    });

    mainCategoryCount++;
    console.log(`   ✓ ${categoryData.name} (${slug})`);

    // Crear subcategorías si existen
    if (categoryData.subcategories) {
      for (const subData of categoryData.subcategories) {
        const subSlug = `${slug}-${slugify(subData.name)}`;

        await prisma.category.upsert({
          where: { slug: subSlug },
          update: {
            name: subData.name,
            description: subData.description,
            parentId: mainCategory.id,
          },
          create: {
            name: subData.name,
            slug: subSlug,
            description: subData.description,
            parentId: mainCategory.id,
          },
        });

        subcategoryCount++;
        console.log(`     └─ ${subData.name} (${subSlug})`);
      }
    }
  }

  const totalCategories = mainCategoryCount + subcategoryCount;
  console.log('');
  console.log(`✅ Created/updated ${totalCategories} categories:`);
  console.log(`   - Main categories: ${mainCategoryCount}`);
  console.log(`   - Subcategories: ${subcategoryCount}`);
  console.log('');

  return {
    mainCategories: mainCategoryCount,
    subcategories: subcategoryCount,
    total: totalCategories,
  };
}

/**
 * Función standalone para testing o uso directo
 */
export async function main() {
  const prisma = new PrismaClient();

  try {
    await seedServiceCategories(prisma);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Permitir ejecutar este archivo directamente
if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
