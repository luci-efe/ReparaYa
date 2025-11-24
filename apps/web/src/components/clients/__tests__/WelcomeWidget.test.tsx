/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { WelcomeWidget } from '../WelcomeWidget';

describe('WelcomeWidget', () => {
    const mockUser = {
        name: 'Test User',
        imageUrl: 'https://example.com/avatar.jpg',
    };

    it('renders user name and greeting', () => {
        render(<WelcomeWidget user={mockUser} addressCount={2} />);

        expect(screen.getByText(/Test/)).toBeInTheDocument();
        expect(screen.getByText('Bienvenido a tu panel de control')).toBeInTheDocument();
    });

    it('renders address count', () => {
        render(<WelcomeWidget user={mockUser} addressCount={5} />);

        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('guardadas')).toBeInTheDocument();
    });

    it('renders link to add address when count is 0', () => {
        render(<WelcomeWidget user={mockUser} addressCount={0} />);

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Agregar dirección principal')).toBeInTheDocument();
    });
});
