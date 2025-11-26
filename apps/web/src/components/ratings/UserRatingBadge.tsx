import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

interface UserRatingBadgeProps {
    average: number;
    totalRatings: number;
    size?: 'sm' | 'md' | 'lg';
}

export const UserRatingBadge: React.FC<UserRatingBadgeProps> = ({
    average,
    totalRatings,
    size = 'md',
}) => {
    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    return (
        <div className={`flex items-center gap-1 ${sizeClasses[size]} font-medium text-gray-900`}>
            <StarIcon
                className={`${iconSizes[size]} text-yellow-400`}
            />
            <span>{Number(average).toFixed(1)}</span>
            <span className="text-gray-500">({totalRatings})</span>
        </div>
    );
};
