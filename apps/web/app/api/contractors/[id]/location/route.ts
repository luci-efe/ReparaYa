import { NextResponse } from 'next/server';
import { requireAnyRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import { locationService } from '@/modules/contractors/services/locationService';
import {
  createLocationSchema,
  updateLocationSchema,
} from '@/modules/contractors/validators/location';
import {
  LocationNotFoundError,
  LocationAlreadyExistsError,
  ContractorProfileNotFoundError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
} from '@/modules/contractors/errors';
import { ZodError } from 'zod';

/**
 * POST /api/contractors/[id]/location
 * Crear ubicación para un contratista
 *
 * Auth: CONTRACTOR (owner) o ADMIN
 * Body: CreateLocationDTO
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAnyRole(['CONTRACTOR', 'ADMIN']);
    const { id: contractorProfileId } = params;

    // Parsear body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }

    // Validar con Zod
    const validatedData = createLocationSchema.parse(body);

    // Crear ubicación (service valida ownership)
    const location = await locationService.createLocation(
      contractorProfileId,
      validatedData,
      user.id
    );

    // Si geocodificación falló, incluir mensaje de advertencia
    if (location.geocodingStatus === 'FAILED') {
      return NextResponse.json(
        {
          ...location,
          warning:
            'No pudimos validar la dirección automáticamente. Verifica los datos o intenta nuevamente más tarde.',
        },
        { status: 201 }
      );
    }

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    // Errores de autenticación
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Errores de validación
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    // Errores de negocio
    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof LocationAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof InvalidVerificationStatusError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof UnauthorizedContractorActionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Error interno
    console.error('Error en POST /api/contractors/[id]/location:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contractors/[id]/location
 * Actualizar ubicación existente
 *
 * Auth: CONTRACTOR (owner) o ADMIN
 * Body: UpdateLocationDTO
 *
 * Restricciones:
 * - Si perfil está ACTIVE, solo ADMIN puede editar
 * - Si cambia dirección, se re-geocodifica automáticamente
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAnyRole(['CONTRACTOR', 'ADMIN']);
    const { id: contractorProfileId } = params;

    // Parsear body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }

    // Validar con Zod
    const validatedData = updateLocationSchema.parse(body);

    // Actualizar ubicación
    const location = await locationService.updateLocation(
      contractorProfileId,
      validatedData,
      user.id,
      user.role
    );

    // Si re-geocodificación falló, incluir mensaje de advertencia
    if (location.geocodingStatus === 'FAILED') {
      return NextResponse.json(
        {
          ...location,
          warning:
            'No pudimos validar la nueva dirección. Los cambios se guardaron pero sin coordenadas.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    // Errores de autenticación
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Errores de validación
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    // Errores de negocio
    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof LocationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof InvalidVerificationStatusError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof UnauthorizedContractorActionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Error interno
    console.error('Error en PATCH /api/contractors/[id]/location:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractors/[id]/location
 * Obtener ubicación de un contratista
 *
 * Auth: Cualquier usuario autenticado
 *
 * Privacidad:
 * - Owner y ADMIN: ven dirección completa y coordenadas exactas
 * - CLIENT: solo ciudad, estado, coordenadas aproximadas (2 decimales)
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAnyRole(['CONTRACTOR', 'CLIENT', 'ADMIN']);
    const { id: contractorProfileId } = params;

    // Obtener ubicación con filtro de privacidad
    const location = await locationService.getLocation(
      contractorProfileId,
      user.id,
      user.role
    );

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    // Errores de autenticación
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Errores de negocio
    if (error instanceof ContractorProfileNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof LocationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Error interno
    console.error('Error en GET /api/contractors/[id]/location:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
