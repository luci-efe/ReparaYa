import { ClientRating, ContractorRating, UserRatingStats, ModerationStatus } from '@prisma/client';

export type CreateClientRatingDTO = {
    bookingId: string;
    serviceId: string;
    contractorId: string;
    stars: number;
    comment?: string;
};

export type CreateContractorRatingDTO = {
    bookingId: string;
    contractorId: string;
    stars: number;
    comment?: string;
};

export type RatingResponse = {
    id: string;
    bookingId: string;
    stars: number;
    comment: string | null;
    createdAt: Date;
    moderationStatus: ModerationStatus;
    author: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
};

export type HiddenRatingResponse = {
    id: string;
    bookingId: string;
    isHidden: true;
    createdAt: Date;
};

export type BookingRatingsResponse = {
    clientRating: RatingResponse | HiddenRatingResponse | null;
    contractorRating: RatingResponse | HiddenRatingResponse | null;
};

export type UserRatingStatsResponse = {
    average: number;
    totalRatings: number;
    role: 'CLIENT' | 'CONTRACTOR';
};

export type ServiceRatingsResponse = {
    average: number;
    totalRatings: number;
    ratings: RatingResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};
