import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError } from '@/modules/auth/errors';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * Schema para actualizar rol
 * Solo permite cambiar a CONTRACTOR durante onboarding
 */
const updateRoleSchema = z.object({
  role: z.enum(['CONTRACTOR'], {
    errorMap: () => ({ message: 'Solo se puede cambiar a rol CONTRACTOR' }),
  }),
});

/**
 * PATCH /api/users/me/role
 * Actualizar rol del usuario autenticado (solo durante onboarding)
 *
 * Restricciones de seguridad:
 * - Solo permite cambiar de CLIENT a CONTRACTOR
 * - No permite cambiar a ADMIN
 * - Es idempotente (si ya es CONTRACTOR, retorna 200)
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

    // Validar que solo se pueda cambiar a CONTRACTOR
    const { role } = updateRoleSchema.parse(body);

    // Seguridad: solo permitir cambio si el usuario es CLIENT
    if (user.role !== 'CLIENT' && user.role !== 'CONTRACTOR') {
      return NextResponse.json(
        { error: 'No se puede cambiar el rol desde el rol actual' },
        { status: 403 }
      );
    }

    // Si ya es CONTRACTOR, retornar éxito (idempotente)
    if (user.role === 'CONTRACTOR') {
      return NextResponse.json({
        message: 'El usuario ya tiene rol CONTRACTOR',
        role: 'CONTRACTOR'
      });
    }

    // Actualizar rol a CONTRACTOR
    const updated = await db.user.update({
      where: { id: user.id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: 'Rol actualizado exitosamente',
      role: updated.role,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en PATCH /api/users/me/role:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
