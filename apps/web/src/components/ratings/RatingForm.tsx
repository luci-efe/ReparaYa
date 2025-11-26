import React from 'react';
import { RatingStars } from './RatingStars';

interface RatingFormProps {
    onSubmit: (data: { stars: number; comment: string }) => Promise<void>;
    isLoading?: boolean;
}

export const RatingForm: React.FC<RatingFormProps> = ({ onSubmit, isLoading }) => {
    const [stars, setStars] = React.useState(0);
    const [comment, setComment] = React.useState('');
    const [error, setError] = React.useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stars === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }
        setError('');
        await onSubmit({ stars, comment });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Calificación</label>
                <RatingStars value={stars} onChange={setStars} />
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="space-y-2">
                <label htmlFor="comment" className="text-sm font-medium text-gray-700">
                    Comentario (opcional)
                </label>
                <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Cuéntanos tu experiencia..."
                />
                <div className="text-right text-xs text-gray-500">
                    {comment.length}/500
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || stars === 0}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
                {isLoading ? 'Enviando...' : 'Enviar Calificación'}
            </button>
        </form>
    );
};
