/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientSidebar } from '../ClientSidebar';

// Mock usePathname
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
}));

describe('ClientSidebar', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/clients/dashboard');
    });

    it('renders all navigation items', () => {
        render(<ClientSidebar isOpen={true} onClose={() => { }} />);

        expect(screen.getAllByText('Dashboard')).toHaveLength(2); // Desktop + Mobile
        expect(screen.getAllByText('Mi Perfil')).toHaveLength(2);
        expect(screen.getAllByText('Mis Reservas')).toHaveLength(2);
        expect(screen.getAllByText('Mensajes')).toHaveLength(2);
        expect(screen.getAllByText('Direcciones')).toHaveLength(2);
        expect(screen.getAllByText('Configuración')).toHaveLength(2);
    });

    it('highlights active link', () => {
        mockUsePathname.mockReturnValue('/clients/bookings');
        render(<ClientSidebar isOpen={true} onClose={() => { }} />);

        // Find the link for bookings
        const bookingsLinks = screen.getAllByRole('link', { name: /Mis Reservas/i });

        // Check if it has the active class (bg-blue-50)
        bookingsLinks.forEach(link => {
            expect(link).toHaveClass('bg-blue-50');
        });

        // Check others don't have it
        const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard/i });
        dashboardLinks.forEach(link => {
            expect(link).not.toHaveClass('bg-blue-50');
        });
    });

    it('calls onClose when clicking a link on mobile', () => {
        const handleClose = jest.fn();
        render(<ClientSidebar isOpen={true} onClose={handleClose} />);

        // Find mobile links (they are in the second aside)
        // We can just click any link and expect onClose to be called
        const links = screen.getAllByRole('link');
        fireEvent.click(links[0]);

        // Note: The desktop links don't have onClick={onClose}, only mobile ones.
        // But in the test environment, both are rendered. 
        // The component implementation attaches onClick={onClose} to the second map loop (mobile).
        // So we need to target the mobile link specifically.
        // The mobile sidebar has class 'lg:hidden'.

        // Let's try to find the mobile sidebar container first
        // It's hard to distinguish by role alone since both are 'complementary' (aside)
        // But we can assume the last set of links are the mobile ones.
        const mobileLink = links[links.length - 1];
        fireEvent.click(mobileLink);

        expect(handleClose).toHaveBeenCalled();
    });
});
