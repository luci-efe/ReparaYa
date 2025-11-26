/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ClientMetricsOverview } from '../ClientMetricsOverview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAddresses
jest.mock('@/hooks/useAddresses', () => ({
    useAddresses: () => ({
        addresses: [],
        isLoading: false,
    }),
}));

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unreadCount: 0 }),
    })
) as jest.Mock;

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('ClientMetricsOverview', () => {
    it('renders all metrics', () => {
        render(<ClientMetricsOverview />, { wrapper: createWrapper() });

        expect(screen.getByText('Reservas Activas')).toBeInTheDocument();
        expect(screen.getByText('Mensajes Sin Leer')).toBeInTheDocument();
        expect(screen.getByText('Direcciones')).toBeInTheDocument();
        expect(screen.getByText('Calif. Promedio')).toBeInTheDocument();
    });

    it('renders placeholder values', () => {
        render(<ClientMetricsOverview />, { wrapper: createWrapper() });

        // Since we have multiple 0s, we check if at least one exists
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        expect(screen.getByText('N/A')).toBeInTheDocument();
    });
});
