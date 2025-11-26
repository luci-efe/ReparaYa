import React from 'react';
import { RatingStars } from './RatingStars';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RatingResponse } from '@/modules/ratings/types';

interface RatingCardProps {
    rating: RatingResponse;
    authorName?: string;
    role?: 'CLIENT' | 'CONTRACTOR';
}

export const RatingCard: React.FC<RatingCardProps> = ({ rating, authorName, role }) => {
    const displayName = authorName || `${rating.author.firstName} ${rating.author.lastName}`;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {rating.author.avatarUrl && !authorName ? (
                        <img
                            src={rating.author.avatarUrl}
                            alt={displayName}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                            {displayName.charAt(0)}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {displayName}
                        </p>
                        <p className="text-xs text-gray-500">
                            {format(new Date(rating.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                </div>
                <RatingStars value={rating.stars} readonly />
            </div>
            {rating.comment && (
                <p className="text-sm text-gray-700">{rating.comment}</p>
            )}
        </div>
    );
};
