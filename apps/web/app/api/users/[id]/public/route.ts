import { NextResponse } from 'next/server';
import { userService, UserNotFoundError } from '@/modules/users';

/**
 * GET /api/users/:id/public
 * Obtener perfil público de un usuario (sin datos sensibles)
 * No requiere autenticación
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await userService.getPublicProfile(params.id);

    // Retornar solo campos públicos permitidos (filtrado explícito por seguridad)
    const publicProfile = {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
    };

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.error('Error en GET /api/users/:id/public:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
