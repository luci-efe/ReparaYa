import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  contractorProfileService,
  ContractorProfileNotFoundError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
  verifyContractorProfileSchema,
} from '@/modules/contractors';
import { ZodError } from 'zod';

/**
 * PATCH /api/admin/contractors/:id/verify
 * Verificar o rechazar perfil de contratista (solo ADMIN)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN');

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
    const validatedData = verifyContractorProfileSchema.parse(body);

    const updatedProfile = await contractorProfileService.verifyProfile(
      user.id,
      params.id,
      validatedData.verified
    );

    return NextResponse.json(updatedProfile, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (
      error instanceof ForbiddenError ||
      error instanceof UnauthorizedContractorActionError
    ) {
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

    if (error instanceof InvalidVerificationStatusError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Error en PATCH /api/admin/contractors/:id/verify:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
