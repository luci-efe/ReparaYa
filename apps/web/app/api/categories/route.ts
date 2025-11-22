import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/categories
 * Get all active service categories
 *
 * Returns: ServiceCategoryDTO[]
 */
export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        parentId: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error en GET /api/categories:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}
