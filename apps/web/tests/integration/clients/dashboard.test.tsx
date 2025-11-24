/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContent } from '../../../app/dashboard/DashboardContent';
import { useRouter } from 'next/navigation';
import { useOnboardingRedirect } from '@/hooks/useOnboardingRedirect';

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/hooks/useOnboardingRedirect', () => ({
    useOnboardingRedirect: jest.fn(),
}));

describe('DashboardContent Integration', () => {
    const mockPush = jest.fn();
    const mockUseOnboardingRedirect = useOnboardingRedirect as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        mockUseOnboardingRedirect.mockReturnValue({ isChecking: false });

        // Mock global fetch
        global.fetch = jest.fn();
    });

    it('redirects CLIENT users to /clients/dashboard', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ role: 'CLIENT' }),
        });

        render(<DashboardContent userId="user_123" />);

        // Initial render shows dashboard content because isChecking is false
        // Then effect runs and redirects


        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/clients/dashboard');
        });
    });

    it('redirects CONTRACTOR users to /contractors/dashboard', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ role: 'CONTRACTOR' }),
        });

        render(<DashboardContent userId="user_123" />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/contractors/dashboard');
        });
    });

    it('shows error message when role check fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
        });

        render(<DashboardContent userId="user_123" />);

        await waitFor(() => {
            expect(screen.getByText('Error al cargar el dashboard')).toBeInTheDocument();
        });
    });

    it('shows loading state while checking onboarding', () => {
        mockUseOnboardingRedirect.mockReturnValue({ isChecking: true });

        render(<DashboardContent userId="user_123" />);

        expect(screen.getByText('Verificando perfil...')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
