import { NextResponse } from 'next/server';
import {
  contractorProfileService,
  ContractorProfileNotFoundError,
} from '@/modules/contractors';

/**
 * GET /api/contractors/:id
 * Obtener perfil público de un contratista
 * No requiere autenticación
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const publicProfile = await contractorProfileService.getPublicProfile(
      params.id
    );

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (error) {
    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error en GET /api/contractors/:id:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
