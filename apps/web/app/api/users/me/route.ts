import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError } from '@/modules/auth/errors';
import { userService, UserNotFoundError } from '@/modules/users';
import { ZodError } from 'zod';

/**
 * GET /api/users/me
 * Obtener perfil completo del usuario autenticado
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await userService.getProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

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

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }

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

    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.error('Error en PATCH /api/users/me:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
