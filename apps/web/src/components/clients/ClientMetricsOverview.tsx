"use client";

import { Card, CardContent } from '@/components/ui/Card';
import { useAddresses } from '@/hooks/useAddresses';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}

function MetricCard({ title, value, icon, trend, trendUp }: MetricCardProps) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
                        {trend && (
                            <p className={`text-xs mt-1 font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                                {trend}
                            </p>
                        )}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { useQuery } from '@tanstack/react-query';

// ... (MetricCard component remains same)

export function ClientMetricsOverview() {
    // Placeholder data
    const { addresses, isLoading } = useAddresses();

    const { data: unreadData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: async () => {
            const res = await fetch('/api/users/me/messages/unread-count');
            if (!res.ok) return { unreadCount: 0 };
            return res.json();
        },
        staleTime: 60 * 1000,
    });

    const unreadCount = unreadData?.unreadCount || 0;

    const metrics = [
        {
            title: 'Reservas Activas',
            value: 0,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            title: 'Mensajes Sin Leer',
            value: unreadCount,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
        },
        {
            title: 'Direcciones',
            value: isLoading ? '...' : addresses.length,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            title: 'Calif. Promedio',
            value: 'N/A',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric) => (
                <MetricCard
                    key={metric.title}
                    title={metric.title}
                    value={metric.value}
                    icon={metric.icon}
                />
            ))}
        </div>
    );
}
