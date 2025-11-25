import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { messageService } from '@/modules/messaging';
import { createMessageSchema, getMessagesSchema } from '@/modules/messaging/validators/messageSchemas';
import {
    MessageNotFoundError,
    MessageTooLongError,
    MessagingWindowExpiredError,
    RateLimitExceededError,
    UnauthorizedMessageAccessError,
} from '@/modules/messaging/errors';
import { z } from 'zod';

// Helper function to get internal user ID from Clerk user ID
async function getInternalUserId(clerkUserId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { clerkUserId: clerkUserId },
        select: { id: true },
    });
    return user?.id || null;
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId: clerkUserId } = auth();
        if (!clerkUserId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userId = await getInternalUserId(clerkUserId);
        if (!userId) {
            return new NextResponse('User not found', { status: 404 });
        }

        const body = await req.json();
        const { text } = createMessageSchema.parse({ ...body, bookingId: params.id }); // Validate body and extract text

        const message = await messageService.sendMessage(
            userId, // The sender's internal user ID
            {
                bookingId: params.id, // The booking ID from params
                senderId: userId, // The sender's internal user ID
                text, // The message text
            }
        );

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('Error sending message:', error);

        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 400 });
        }
        if (error instanceof UnauthorizedMessageAccessError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof MessagingWindowExpiredError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof RateLimitExceededError) {
            return new NextResponse(error.message, { status: 429 });
        }
        if (error instanceof MessageTooLongError) {
            return new NextResponse(error.message, { status: 400 });
        }
        if (error instanceof MessageNotFoundError) {
            return new NextResponse(error.message, { status: 404 });
        }

        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId: clerkUserId } = auth();
        if (!clerkUserId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userId = await getInternalUserId(clerkUserId);
        if (!userId) {
            return new NextResponse('User not found', { status: 404 });
        }

        const searchParams = req.nextUrl.searchParams;
        const cursor = searchParams.get('cursor') || undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        const validatedParams = getMessagesSchema.parse({
            bookingId: params.id,
            cursor,
            limit
        });

        const messages = await messageService.getMessages(
            userId, // viewerId
            params.id, // bookingId
            validatedParams
        );

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);

        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid query parameters', { status: 400 });
        }
        if (error instanceof UnauthorizedMessageAccessError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof MessageNotFoundError) {
            return new NextResponse(error.message, { status: 404 });
        }

        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
