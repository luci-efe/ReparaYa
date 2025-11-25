/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientTopbar } from '../ClientTopbar';

jest.mock('@clerk/nextjs', () => ({
    UserButton: () => <div data-testid="user-button" />,
}));

describe('ClientTopbar', () => {
    it('renders logo and user button', () => {
        render(<ClientTopbar onMenuClick={() => { }} />);

        expect(screen.getByText('ReparaYa')).toBeInTheDocument();
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('calls onMenuClick when hamburger button is clicked', () => {
        const handleMenuClick = jest.fn();
        render(<ClientTopbar onMenuClick={handleMenuClick} />);

        const menuButton = screen.getByLabelText('Abrir menú de navegación');
        fireEvent.click(menuButton);

        expect(handleMenuClick).toHaveBeenCalled();
    });
});
