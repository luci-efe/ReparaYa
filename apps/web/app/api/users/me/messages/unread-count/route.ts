import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { messageService } from '@/modules/messaging';

// Helper to get internal user ID from Clerk ID
async function getInternalUserId(clerkUserId: string) {
    const user = await prisma.user.findUnique({
        where: { clerkUserId },
        select: { id: true },
    });
    return user?.id;
}

export async function GET(_req: NextRequest) {
    try {
        const { userId: clerkUserId } = auth();
        if (!clerkUserId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userId = await getInternalUserId(clerkUserId);
        if (!userId) {
            return new NextResponse('User not found', { status: 404 });
        }

        const unreadCount = await messageService.getUnreadCount(userId);

        return NextResponse.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
