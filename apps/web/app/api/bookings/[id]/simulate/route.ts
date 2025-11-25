import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DemoSimulationService } from '@/modules/booking/services/demoSimulationService';
import { prisma } from '@/lib/db';

const simulationService = new DemoSimulationService();

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const nextState = await simulationService.advanceToNextState(params.id, user.id);

        if (!nextState) {
            return NextResponse.json({ message: 'No hay más transiciones disponibles' }, { status: 200 });
        }

        return NextResponse.json({
            message: 'Simulación exitosa',
            newState: nextState
        });
    } catch (error) {
        console.error('Error in simulation:', error);
        return NextResponse.json(
            { error: 'Error en la simulación' },
            { status: 500 }
        );
    }
}
