
import { GET } from '../../../../app/api/bookings/[id]/ratings/route';
import { POST as POST_CLIENT } from '../../../../app/api/bookings/[id]/ratings/client/route';
import { POST as POST_CONTRACTOR } from '../../../../app/api/bookings/[id]/ratings/contractor/route';
import { clientRatingService, contractorRatingService, visibilityService } from '@/modules/ratings';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

jest.mock('@/modules/ratings', () => ({
    clientRatingService: {
        getByBookingId: jest.fn(),
        create: jest.fn(),
    },
    contractorRatingService: {
        getByBookingId: jest.fn(),
        create: jest.fn(),
    },
    visibilityService: {
        canSeeRating: jest.fn(),
    },
    createClientRatingSchema: {
        parse: jest.fn((data) => data),
    },
    createContractorRatingSchema: {
        parse: jest.fn((data) => data),
    },
}));
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        booking: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('@clerk/nextjs/server', () => ({
    auth: () => ({ userId: 'user_123' }),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Ratings API Integration', () => {
    const mockUser = {
        id: 'local_user_123',
        clerkUserId: 'user_123',
        firstName: 'Test',
        lastName: 'User',
    };

    const mockBooking = {
        id: 'booking_123',
        clientId: 'local_user_123',
        contractorId: 'contractor_123',
        status: 'COMPLETED',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (mockedPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
    });

    describe('GET /api/bookings/[id]/ratings', () => {
        it('should return ratings with visibility logic applied', async () => {
            const mockClientRating = { id: 'rating_1', stars: 5, comment: 'Great' };
            const mockContractorRating = { id: 'rating_2', stars: 4, comment: 'Good' };

            (clientRatingService.getByBookingId as jest.Mock).mockResolvedValue(mockClientRating);
            (contractorRatingService.getByBookingId as jest.Mock).mockResolvedValue(mockContractorRating);
            (visibilityService.canSeeRating as jest.Mock).mockReturnValue(true);

            const request = new NextRequest('http://localhost:3000/api/bookings/booking_123/ratings');
            const response = await GET(request, { params: { id: 'booking_123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.clientRating).toEqual(expect.objectContaining(mockClientRating));
            expect(data.contractorRating).toEqual(expect.objectContaining(mockContractorRating));
        });

        it('should hide ratings if visibility is restricted', async () => {
            const mockClientRating = { id: 'rating_1', stars: 5, comment: 'Great', clientId: 'other_user' };

            (clientRatingService.getByBookingId as jest.Mock).mockResolvedValue(mockClientRating);
            (contractorRatingService.getByBookingId as jest.Mock).mockResolvedValue(null);
            (visibilityService.canSeeRating as jest.Mock).mockReturnValue(false);

            const request = new NextRequest('http://localhost:3000/api/bookings/booking_123/ratings');
            const response = await GET(request, { params: { id: 'booking_123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.clientRating.isHidden).toBe(true);
            expect(data.clientRating.stars).toBeUndefined();
        });
    });

    describe('POST /api/bookings/[id]/ratings/client', () => {
        it('should create a client rating', async () => {
            const mockRating = { id: 'rating_1', stars: 5, comment: 'Excellent' };
            (clientRatingService.create as jest.Mock).mockResolvedValue(mockRating);

            const request = new NextRequest('http://localhost:3000/api/bookings/booking_123/ratings/client', {
                method: 'POST',
                body: JSON.stringify({ stars: 5, comment: 'Excellent' }),
            });

            const response = await POST_CLIENT(request, { params: { id: 'booking_123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockRating);
            expect(clientRatingService.create).toHaveBeenCalledWith(
                'booking_123',
                'local_user_123',
                expect.objectContaining({ stars: 5, comment: 'Excellent' })
            );
        });
    });

    describe('POST /api/bookings/[id]/ratings/contractor', () => {
        it('should create a contractor rating', async () => {
            const mockRating = {
                id: 'rating_2',
                stars: 4,
                comment: 'Good client',
                contractor: { id: 'contractor_123', name: 'Contractor' }
            };
            (contractorRatingService.create as jest.Mock).mockResolvedValue(mockRating);

            const request = new NextRequest('http://localhost:3000/api/bookings/booking_123/ratings/contractor', {
                method: 'POST',
                body: JSON.stringify({ stars: 4, comment: 'Good client' }),
            });

            const response = await POST_CONTRACTOR(request, { params: { id: 'booking_123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.stars).toBe(4);
            expect(data.author).toBeDefined();
            expect(contractorRatingService.create).toHaveBeenCalled();
        });
    });
});
