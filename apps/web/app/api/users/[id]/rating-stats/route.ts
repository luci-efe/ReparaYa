import { NextRequest, NextResponse } from 'next/server';
import { statsService } from '@/modules/ratings';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id;
        const stats = await statsService.getUserStats(userId);

        if (!stats) {
            return NextResponse.json({ average: 0, totalRatings: 0 });
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
