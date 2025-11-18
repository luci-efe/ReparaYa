import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  contractorProfileService,
  ContractorProfileNotFoundError,
  updateContractorProfileSchema,
  type UpdateContractorProfileDTO,
} from '@/modules/contractors';
import { ZodError } from 'zod';

/**
 * GET /api/contractors/profile/me
 * Obtener perfil completo del contratista autenticado
 */
export async function GET() {
  try {
    const user = await requireRole('CONTRACTOR');
    const profile = await contractorProfileService.getProfileByUserId(user.id);

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error en GET /api/contractors/profile/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contractors/profile/me
 * Actualizar perfil del contratista autenticado
 */
export async function PATCH(request: Request) {
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
    const validatedData = updateContractorProfileSchema.parse(body);

    const updatedProfile = await contractorProfileService.updateProfile(
      user.id,
      validatedData as UpdateContractorProfileDTO
    );

    return NextResponse.json(updatedProfile, { status: 200 });
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

    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error en PATCH /api/contractors/profile/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
