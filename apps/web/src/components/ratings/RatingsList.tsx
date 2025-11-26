import React from 'react';
import { RatingCard } from './RatingCard';
import { RatingResponse } from '@/modules/ratings/types';

interface RatingsListProps {
    ratings: RatingResponse[];
    isLoading?: boolean;
    emptyMessage?: string;
    endpoint?: string; // Kept for compatibility if needed, but we are passing ratings directly now
}

export const RatingsList: React.FC<RatingsListProps> = ({ ratings, isLoading, emptyMessage = "No hay calificaciones aún." }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
                ))}
            </div>
        );
    }

    if (ratings.length === 0) {
        return (
            <div className="py-8 text-center text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {ratings.map((rating) => (
                <RatingCard key={rating.id} rating={rating} />
            ))}
        </div>
    );
};
