/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ClientMetricsOverview } from '../ClientMetricsOverview';

describe('ClientMetricsOverview', () => {
    it('renders all metrics', () => {
        render(<ClientMetricsOverview />);

        expect(screen.getByText('Reservas Activas')).toBeInTheDocument();
        expect(screen.getByText('Mensajes Sin Leer')).toBeInTheDocument();
        expect(screen.getByText('Direcciones')).toBeInTheDocument();
        expect(screen.getByText('Calif. Promedio')).toBeInTheDocument();
    });

    it('renders placeholder values', () => {
        render(<ClientMetricsOverview />);

        // Since we have multiple 0s, we check if at least one exists
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        expect(screen.getByText('N/A')).toBeInTheDocument();
    });
});
