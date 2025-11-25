'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ServiceImageGalleryProps {
    images: { s3Url: string; altText?: string | null }[];
}

export function ServiceImageGallery({ images }: ServiceImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Sin imágenes
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative h-96 w-full rounded-lg overflow-hidden bg-gray-100">
                <Image
                    src={images[selectedImage].s3Url}
                    alt={images[selectedImage].altText || 'Service image'}
                    fill
                    className="object-cover"
                />
            </div>

            {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border-2 ${selectedImage === index ? 'border-emerald-500' : 'border-transparent'
                                }`}
                        >
                            <Image
                                src={image.s3Url}
                                alt={image.altText || `Thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
