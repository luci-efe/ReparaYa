/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { UpcomingBookings } from '../UpcomingBookings';

describe('UpcomingBookings', () => {
    it('renders empty state message', () => {
        render(<UpcomingBookings />);

        expect(screen.getByText('Próximas Reservas')).toBeInTheDocument();
        expect(screen.getByText('No tienes reservas próximas')).toBeInTheDocument();
        expect(screen.getByText(/Cuando reserves un servicio/)).toBeInTheDocument();
    });
});
