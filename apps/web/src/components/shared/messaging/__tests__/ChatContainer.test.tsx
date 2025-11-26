/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatContainer } from '../ChatContainer';
import { useBookingMessages } from '@/hooks/useBookingMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useInternalUser } from '@/hooks/useInternalUser';
import { useUser } from '@clerk/nextjs';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('@/hooks/useBookingMessages');
jest.mock('@/hooks/useSendMessage');
jest.mock('@/hooks/useInternalUser');
jest.mock('@clerk/nextjs');
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        channel: jest.fn(() => ({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
        })),
    },
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    })
) as jest.Mock;

describe('ChatContainer', () => {
    const mockBookingId = 'booking-1';
    const mockSendMessage = jest.fn();
    const mockFetchNextPage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (useUser as jest.Mock).mockReturnValue({
            user: { id: 'user-1' },
        });

        (useInternalUser as jest.Mock).mockReturnValue({
            data: { id: 'internal-user-1', clerkUserId: 'user-1' },
        });

        (useSendMessage as jest.Mock).mockReturnValue({
            mutateAsync: mockSendMessage,
        });
    });

    it('renders loading state', () => {
        (useBookingMessages as jest.Mock).mockReturnValue({
            status: 'pending',
            data: undefined,
        });

        const { container } = render(<ChatContainer bookingId={mockBookingId} />);
        // Check for spinner (by class since it has no text)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders error state', () => {
        (useBookingMessages as jest.Mock).mockReturnValue({
            status: 'error',
            data: undefined,
        });

        render(<ChatContainer bookingId={mockBookingId} />);
        expect(screen.getByText('Error al cargar los mensajes.')).toBeInTheDocument();
    });

    it('renders message list when data is loaded', () => {
        (useBookingMessages as jest.Mock).mockReturnValue({
            status: 'success',
            data: {
                pages: [
                    {
                        messages: [
                            {
                                id: 'msg-1',
                                text: 'Hello',
                                senderId: 'user-1',
                                createdAt: new Date(),
                                sender: { firstName: 'John', lastName: 'Doe' },
                            },
                        ],
                    },
                ],
            },
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        });

        render(<ChatContainer bookingId={mockBookingId} />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('calls sendMessage when input is submitted', async () => {
        (useBookingMessages as jest.Mock).mockReturnValue({
            status: 'success',
            data: { pages: [] },
        });
        mockSendMessage.mockResolvedValue({});

        render(<ChatContainer bookingId={mockBookingId} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        const button = screen.getByRole('button', { name: /enviar/i });

        fireEvent.change(input, { target: { value: 'New message' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith('New message');
        });
    });
});
