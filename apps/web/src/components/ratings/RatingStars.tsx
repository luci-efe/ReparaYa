import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface RatingStarsProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
    value,
    onChange,
    readonly = false,
    size = 24,
}) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);

    const handleMouseEnter = (index: number) => {
        if (!readonly) {
            setHoverValue(index);
        }
    };

    const handleMouseLeave = () => {
        if (!readonly) {
            setHoverValue(null);
        }
    };

    const handleClick = (index: number) => {
        if (!readonly && onChange) {
            onChange(index);
        }
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((index) => {
                const isFilled = hoverValue !== null ? index <= hoverValue : index <= value;
                const Icon = isFilled ? StarIcon : StarIconOutline;

                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleClick(index)}
                        onMouseEnter={() => handleMouseEnter(index)}
                        onMouseLeave={handleMouseLeave}
                        disabled={readonly}
                        className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none`}
                    >
                        <Icon
                            className={`h-6 w-6 ${isFilled ? 'text-yellow-400' : 'text-gray-300'
                                } transition-colors`}
                            style={{ width: size, height: size }}
                        />
                    </button>
                );
            })}
        </div>
    );
};
