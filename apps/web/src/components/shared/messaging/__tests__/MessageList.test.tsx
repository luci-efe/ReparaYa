/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import '@testing-library/jest-dom';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('MessageList', () => {
    const mockMessages = [
        {
            id: 'msg-1',
            bookingId: 'booking-1',
            senderId: 'user-1',
            text: 'Hello',
            createdAt: new Date('2023-01-01T12:00:00'),
            sender: { id: 'user-1', firstName: 'John', lastName: 'Doe', role: 'CLIENT', avatarUrl: null },
        },
        {
            id: 'msg-2',
            bookingId: 'booking-1',
            senderId: 'user-2',
            text: 'Hi there',
            createdAt: new Date('2023-01-01T12:01:00'),
            sender: { id: 'user-2', firstName: 'Jane', lastName: 'Smith', role: 'CONTRACTOR', avatarUrl: null },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty state when no messages', () => {
        render(<MessageList messages={[]} />);
        expect(screen.getByText('No hay mensajes aún. ¡Inicia la conversación!')).toBeInTheDocument();
    });

    it('renders list of messages', () => {
        render(<MessageList messages={mockMessages} />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('scrolls to bottom on load', () => {
        render(<MessageList messages={mockMessages} />);
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('displays loading indicator when isLoading is true', () => {
        render(<MessageList messages={mockMessages} isLoading={true} />);
        expect(screen.getByText('Cargando mensajes anteriores...')).toBeInTheDocument();
    });

    it('correctly identifies "me" messages', () => {
        // Mock currentClerkId to match user-1
        // Note: The component logic compares senderId with currentClerkId.
        // In the test data, senderId is 'user-1'.
        render(<MessageList messages={mockMessages} currentUserId="user-1" />);

        // Message 1 (user-1) should be "sent by me" -> bg-blue-600
        // Message 2 (user-2) should be "received" -> bg-white

        // We can check for classes on the bubbles
        // But since MessageBubble is a child, we can also check for sender name presence
        // "me" messages don't show sender name

        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('reverses messages for display', () => {
        // The component reverses the array.
        // Input: [msg-1 (oldest), msg-2 (newest)] ? 
        // Wait, API returns newest first usually.
        // Let's check the component logic:
        // "The API returns newest first (descending), so we reverse for display"
        // So if we pass [Newest, Oldest], it should render [Oldest, Newest].

        const messagesDesc = [mockMessages[1], mockMessages[0]]; // [Newest, Oldest]

        render(<MessageList messages={messagesDesc} />);

        const bubbles = screen.getAllByText(/Hello|Hi there/);
        // Should be Hello (oldest) then Hi there (newest)
        expect(bubbles[0]).toHaveTextContent('Hello');
        expect(bubbles[1]).toHaveTextContent('Hi there');
    });
});
