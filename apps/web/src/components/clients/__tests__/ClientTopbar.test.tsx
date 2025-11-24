/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientTopbar } from '../ClientTopbar';

jest.mock('@clerk/nextjs', () => ({
    UserButton: () => <div data-testid="user-button" />,
}));

describe('ClientTopbar', () => {
    const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
    };

    it('renders logo and user info', () => {
        render(<ClientTopbar user={mockUser} onMenuClick={() => { }} />);

        expect(screen.getByText('ReparaYa')).toBeInTheDocument();
        expect(screen.getByText('Cliente')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('calls onMenuClick when hamburger button is clicked', () => {
        const handleMenuClick = jest.fn();
        render(<ClientTopbar user={mockUser} onMenuClick={handleMenuClick} />);

        const menuButton = screen.getByLabelText('Abrir menú');
        fireEvent.click(menuButton);

        expect(handleMenuClick).toHaveBeenCalled();
    });
});
