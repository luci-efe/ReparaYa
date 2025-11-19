import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  contractorProfileService,
  ContractorProfileAlreadyExistsError,
  createContractorProfileSchema,
  type CreateContractorProfileDTO,
} from '@/modules/contractors';
import { ZodError } from 'zod';

/**
 * POST /api/contractors/profile
 * Crear perfil de contratista para el usuario autenticado
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole('CONTRACTOR');

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }

    // Validar datos con Zod
    const validatedData = createContractorProfileSchema.parse(body);

    const profile = await contractorProfileService.createProfile(
      user.id,
      validatedData as CreateContractorProfileDTO
    );

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof ContractorProfileAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('Error en POST /api/contractors/profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
