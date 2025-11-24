/**
 * API Route: GET/POST /api/contractors/me/availability/weekly
 * Manage contractor weekly availability rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { weeklyRuleRepository } from '@/modules/contractors/availability/repositories/weeklyRuleRepository';
import { createWeeklyRuleSchema } from '@/modules/contractors/availability/validators/weeklyRule';
import { prisma } from '@/lib/db';

/**
 * GET /api/contractors/me/availability/weekly
 * List all weekly rules for the authenticated contractor
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Get contractor profile
        const contractor = await prisma.contractorProfile.findFirst({
            where: { user: { clerkUserId: userId } },
        });

        if (!contractor) {
            return NextResponse.json(
                { error: 'No eres contratista' },
                { status: 403 }
            );
        }

        // Get all weekly rules
        const rules = await weeklyRuleRepository.findByContractor(contractor.id);

        return NextResponse.json(rules);
    } catch (error) {
        console.error('Error fetching weekly rules:', error);
        return NextResponse.json(
            { error: 'Error al obtener horarios' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/contractors/me/availability/weekly
 * Create a new weekly availability rule
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Get contractor profile
        console.log('API Weekly - UserId:', userId);
        const contractor = await prisma.contractorProfile.findFirst({
            where: { user: { clerkUserId: userId } },
        });
        console.log('API Weekly - Contractor:', contractor?.id);

        if (!contractor) {
            return NextResponse.json(
                { error: 'No eres contratista' },
                { status: 403 }
            );
        }

        //Parse and validate request body
        const body = await req.json();
        const validationResult = createWeeklyRuleSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        // Create weekly rule
        const rule = await weeklyRuleRepository.create(
            contractor.id,
            validationResult.data
        );

        return NextResponse.json(rule, { status: 201 });
    } catch (error) {
        console.error('Error creating weekly rule:', error);
        return NextResponse.json(
            { error: 'Error al crear horario' },
            { status: 500 }
        );
    }
}
