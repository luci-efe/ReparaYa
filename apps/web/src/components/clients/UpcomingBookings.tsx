import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function UpcomingBookings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Próximas Reservas
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">No tienes reservas próximas</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                        Cuando reserves un servicio, aparecerá aquí para que puedas hacerle seguimiento.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
