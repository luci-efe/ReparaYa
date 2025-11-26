/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import '@testing-library/jest-dom';

describe('MessageBubble', () => {
    const defaultProps = {
        text: 'Hello World',
        createdAt: new Date('2023-01-01T12:00:00'),
        isSentByMe: false,
        senderName: 'John Doe',
    };

    it('renders text correctly', () => {
        render(<MessageBubble {...defaultProps} />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders sender name when isSentByMe is false', () => {
        render(<MessageBubble {...defaultProps} isSentByMe={false} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not render sender name when isSentByMe is true', () => {
        render(<MessageBubble {...defaultProps} isSentByMe={true} />);
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('applies correct styles for sent messages', () => {
        const { container } = render(<MessageBubble {...defaultProps} isSentByMe={true} />);
        const bubble = container.firstChild?.firstChild;
        expect(bubble).toHaveClass('bg-blue-600', 'text-white');
    });

    it('applies correct styles for received messages', () => {
        const { container } = render(<MessageBubble {...defaultProps} isSentByMe={false} />);
        const bubble = container.firstChild?.firstChild;
        expect(bubble).toHaveClass('bg-gray-100', 'text-gray-900');
    });

    it('shows sending indicator when isSending is true', () => {
        const { container } = render(<MessageBubble {...defaultProps} isSending={true} />);
        // Check for opacity class
        const bubble = container.firstChild?.firstChild;
        expect(bubble).toHaveClass('opacity-70');
    });

    it('formats time correctly', () => {
        render(<MessageBubble {...defaultProps} createdAt={new Date('2023-01-01T14:30:00')} />);
        expect(screen.getByText('14:30')).toBeInTheDocument();
    });
});
