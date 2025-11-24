'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { AvailabilityWeekly } from './AvailabilityWeekly';
import { AvailabilityExceptions } from './AvailabilityExceptions';
import { AvailabilityBlocks } from './AvailabilityBlocks';
import { WeeklyRuleResponseDTO } from '@/modules/contractors/availability/types/weeklyRule';
import { ExceptionResponseDTO } from '@/modules/contractors/availability/types/exception';
import { BlockResponseDTO } from '@/modules/contractors/availability/types/block';

export function AvailabilityManager() {
    const [weeklyRules, setWeeklyRules] = useState<WeeklyRuleResponseDTO[]>([]);
    const [exceptions, setExceptions] = useState<ExceptionResponseDTO[]>([]);
    const [blocks, setBlocks] = useState<BlockResponseDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions' | 'blocks'>('weekly');

    const fetchAvailability = useCallback(async () => {
        try {
            // Don't set loading to true on refetch to avoid flickering, only on initial load
            // But we need to know if it's refreshing? Maybe a small indicator.
            // For now, let's keep it simple.

            const [rulesRes, exceptionsRes, blocksRes] = await Promise.all([
                fetch('/api/contractors/me/availability/weekly'),
                fetch('/api/contractors/me/availability/exceptions'),
                fetch('/api/contractors/me/availability/blocks'),
            ]);

            if (!rulesRes.ok) {
                const errorText = await rulesRes.text();
                throw new Error(`Error al cargar horarios semanales: ${errorText}`);
            }
            if (!exceptionsRes.ok) {
                const errorText = await exceptionsRes.text();
                throw new Error(`Error al cargar excepciones: ${errorText}`);
            }
            if (!blocksRes.ok) {
                const errorText = await blocksRes.text();
                throw new Error(`Error al cargar bloqueos: ${errorText}`);
            }

            setWeeklyRules(await rulesRes.json());
            setExceptions(await exceptionsRes.json());
            setBlocks(await blocksRes.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                <h3 className="font-bold">Error</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="mt-2 text-sm underline">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Gestionar Disponibilidad</h1>
                <p className="text-sm text-gray-600">Configura tus horarios de trabajo, días libres y excepciones.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('weekly')}>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Reglas Semanales</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {weeklyRules.filter(rule => rule.intervals && rule.intervals.length > 0).length} / 7
                        </p>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${weeklyRules.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </Card>
                <Card className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('exceptions')}>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Excepciones</h3>
                        <p className="text-2xl font-bold text-gray-900">{exceptions.length}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                </Card>
                <Card className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('blocks')}>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Bloqueos</h3>
                        <p className="text-2xl font-bold text-gray-900">{blocks.length}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                </Card>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weekly'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        Horario Semanal
                    </button>
                    <button
                        onClick={() => setActiveTab('exceptions')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'exceptions'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        Excepciones y Feriados
                    </button>
                    <button
                        onClick={() => setActiveTab('blocks')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'blocks'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        Bloqueos Manuales
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'weekly' && (
                    <AvailabilityWeekly rules={weeklyRules} onUpdate={fetchAvailability} />
                )}
                {activeTab === 'exceptions' && (
                    <AvailabilityExceptions exceptions={exceptions} onUpdate={fetchAvailability} />
                )}
                {activeTab === 'blocks' && (
                    <AvailabilityBlocks blocks={blocks} onUpdate={fetchAvailability} />
                )}
            </div>
        </div>
    );
}
