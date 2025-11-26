/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ConversationList } from '../ConversationList';
import { useQuery } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock useQuery
jest.mock('@tanstack/react-query');

describe('ConversationList', () => {
    const mockConversations = [
        {
            bookingId: 'booking-1',
            otherPartyName: 'John Doe',
            otherPartyAvatarUrl: null,
            serviceTitle: 'Plumbing',
            lastMessage: { text: 'Hello', createdAt: new Date() },
            updatedAt: new Date(),
        },
        {
            bookingId: 'booking-2',
            otherPartyName: 'Jane Smith',
            otherPartyAvatarUrl: 'https://example.com/avatar.jpg',
            serviceTitle: 'Electrical',
            lastMessage: null,
            updatedAt: new Date(),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: undefined,
            isLoading: true,
        });

        const { container } = render(<ConversationList role="client" />);
        // Check for pulse animation classes
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('renders empty state', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
        });

        render(<ConversationList role="client" />);
        expect(screen.getByText('No tienes conversaciones activas.')).toBeInTheDocument();
    });

    it('renders list of conversations for client', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: mockConversations,
            isLoading: false,
        });

        render(<ConversationList role="client" />);

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Plumbing')).toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Electrical')).toBeInTheDocument();
        expect(screen.getByText('Sin mensajes')).toBeInTheDocument();

        // Check links
        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/clients/bookings/booking-1?tab=chat');
        expect(links[1]).toHaveAttribute('href', '/clients/bookings/booking-2?tab=chat');
    });

    it('renders list of conversations for contractor', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: mockConversations,
            isLoading: false,
        });

        render(<ConversationList role="contractor" />);

        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/contractors/bookings/booking-1?tab=chat');
    });

    it('renders avatar image when provided', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: mockConversations,
            isLoading: false,
        });

        render(<ConversationList role="client" />);
        const img = screen.getByAltText('Jane Smith');
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders initials when avatar is missing', () => {
        (useQuery as jest.Mock).mockReturnValue({
            data: mockConversations,
            isLoading: false,
        });

        render(<ConversationList role="client" />);
        expect(screen.getByText('J')).toBeInTheDocument(); // John Doe -> J
    });
});
