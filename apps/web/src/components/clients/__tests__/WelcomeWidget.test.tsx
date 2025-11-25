/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { WelcomeWidget } from '../WelcomeWidget';
import { useAddresses } from '@/hooks/useAddresses';

jest.mock('@/hooks/useAddresses', () => ({
    useAddresses: jest.fn(),
}));

describe('WelcomeWidget', () => {
    const mockUser = {
        name: 'Test User',
        imageUrl: 'https://example.com/avatar.jpg',
    };

    beforeEach(() => {
        (useAddresses as jest.Mock).mockReturnValue({ addresses: [], isLoading: false });
    });

    it('renders user name and greeting', () => {
        render(<WelcomeWidget user={mockUser} />);

        expect(screen.getByText(/Test/)).toBeInTheDocument();
        expect(screen.getByText('Bienvenido a tu panel de control')).toBeInTheDocument();
    });

    it('renders address count', () => {
        (useAddresses as jest.Mock).mockReturnValue({
            addresses: new Array(5).fill({}),
            isLoading: false
        });
        render(<WelcomeWidget user={mockUser} />);

        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('guardadas')).toBeInTheDocument();
    });

    it('renders link to add address when count is 0', () => {
        (useAddresses as jest.Mock).mockReturnValue({ addresses: [], isLoading: false });
        render(<WelcomeWidget user={mockUser} />);

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Agregar dirección principal')).toBeInTheDocument();
    });
});
