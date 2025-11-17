import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError } from '@/modules/auth/errors';
import { userService } from '@/modules/users';
import { ZodError } from 'zod';

/**
 * GET /api/users/me
 * Obtener perfil completo del usuario autenticado
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await userService.getProfile(user.id);

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.error('Error en GET /api/users/me:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 * Actualizar perfil del usuario autenticado
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const updated = await userService.updateProfile(user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en PATCH /api/users/me:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
