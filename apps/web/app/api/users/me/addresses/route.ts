import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError } from '@/modules/auth/errors';
import { addressService } from '@/modules/users';
import { ZodError } from 'zod';

/**
 * POST /api/users/me/addresses
 * Crear nueva dirección para el usuario autenticado
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const address = await addressService.create(user.id, body);
    return NextResponse.json(address, { status: 201 });
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

    console.error('Error en POST /api/users/me/addresses:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
