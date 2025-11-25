'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    slug: string;
}

export function ServiceSearchFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

    useEffect(() => {
        // Fetch categories
        fetch('/api/categories')
            .then((res) => res.json())
            .then((data) => setCategories(data))
            .catch((err) => console.error('Error fetching categories:', err));
    }, []);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (selectedCategory) params.set('category', selectedCategory);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);

        router.push(`/clients/search?${params.toString()}`);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
            <h3 className="font-semibold text-lg">Filtros</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej. Plomería..."
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                    <option value="">Todas las categorías</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                </div>
            </div>

            <button
                onClick={handleSearch}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
            >
                Aplicar Filtros
            </button>
        </div>
    );
}
