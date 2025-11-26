import { NextRequest, NextResponse } from 'next/server';
import { clientRatingService } from '@/modules/ratings';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const serviceId = params.id;
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const ratings = await clientRatingService.getForService(serviceId, page, limit);

        return NextResponse.json(ratings);
    } catch (error) {
        console.error('Error fetching service ratings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
