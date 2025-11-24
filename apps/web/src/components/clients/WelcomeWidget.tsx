"use client";

import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

interface WelcomeWidgetProps {
    user: {
        name: string;
        imageUrl?: string;
    };
    addressCount: number;
}

export function WelcomeWidget({ user, addressCount }: WelcomeWidgetProps) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    return (
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full transform -translate-x-1/2 translate-y-1/2" />

            <CardContent className="p-6 sm:p-8 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {user.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt={user.name}
                                className="w-16 h-16 rounded-full border-4 border-white/20"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                {user.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold">
                                {getGreeting()}, {user.name.split(' ')[0]}
                            </h2>
                            <p className="text-blue-100 mt-1">
                                Bienvenido a tu panel de control
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-100 text-sm font-medium">Direcciones</span>
                            <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">{addressCount}</span>
                            <span className="text-blue-200 text-sm mb-1">guardadas</span>
                        </div>
                        {addressCount === 0 && (
                            <Link
                                href="/clients/addresses"
                                className="text-xs text-white underline mt-2 inline-block hover:text-blue-100"
                            >
                                Agregar dirección principal
                            </Link>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
