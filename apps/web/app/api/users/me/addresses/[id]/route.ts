import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError } from '@/modules/auth/errors';
import {
  addressService,
  AddressNotFoundError,
  CannotDeleteLastAddressError,
} from '@/modules/users';
import { ZodError } from 'zod';

/**
 * PATCH /api/users/me/addresses/:id
 * Actualizar dirección existente del usuario autenticado
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const address = await addressService.update(params.id, user.id, body);
    return NextResponse.json(address);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (error instanceof AddressNotFoundError) {
      return NextResponse.json(
        { error: 'Dirección no encontrada' },
        { status: 404 }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en PATCH /api/users/me/addresses/:id:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/me/addresses/:id
 * Eliminar dirección del usuario autenticado
 * Regla BR-001: No permitir eliminar la única dirección
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    await addressService.delete(params.id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (error instanceof AddressNotFoundError) {
      return NextResponse.json(
        { error: 'Dirección no encontrada' },
        { status: 404 }
      );
    }

    if (error instanceof CannotDeleteLastAddressError) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu única dirección' },
        { status: 400 }
      );
    }

    console.error('Error en DELETE /api/users/me/addresses/:id:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
