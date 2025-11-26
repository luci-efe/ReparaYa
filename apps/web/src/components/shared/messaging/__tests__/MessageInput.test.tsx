/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../MessageInput';
import '@testing-library/jest-dom';

describe('MessageInput', () => {
    const mockOnSend = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders input and button', () => {
        render(<MessageInput onSend={mockOnSend} />);
        expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
    });

    it('updates text on change', async () => {
        const user = userEvent.setup();
        render(<MessageInput onSend={mockOnSend} />);
        const input = screen.getByPlaceholderText('Escribe un mensaje...');

        await user.type(input, 'Hello');
        expect(input).toHaveValue('Hello');
    });

    it('calls onSend when form is submitted', async () => {
        const user = userEvent.setup();
        mockOnSend.mockResolvedValue(undefined);
        render(<MessageInput onSend={mockOnSend} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        const button = screen.getByRole('button', { name: /enviar/i });

        await user.type(input, 'Hello');
        await user.click(button);

        expect(mockOnSend).toHaveBeenCalledWith('Hello');
        expect(input).toHaveValue('');
    });

    it('calls onSend when Enter is pressed', async () => {
        const user = userEvent.setup();
        mockOnSend.mockResolvedValue(undefined);
        render(<MessageInput onSend={mockOnSend} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        await user.type(input, 'Hello{enter}');

        expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('does not call onSend when Shift+Enter is pressed', async () => {
        const user = userEvent.setup();
        render(<MessageInput onSend={mockOnSend} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        await user.type(input, 'Hello{Shift>}{enter}{/Shift}');

        expect(mockOnSend).not.toHaveBeenCalled();
        expect(input).toHaveValue('Hello\n');
    });

    it('disables input and button when disabled prop is true', () => {
        render(<MessageInput onSend={mockOnSend} disabled={true} />);
        expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeDisabled();
        expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
    });

    it('disables input and button when sending', async () => {
        const user = userEvent.setup();
        // Make onSend hang
        mockOnSend.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
        render(<MessageInput onSend={mockOnSend} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        const button = screen.getByRole('button', { name: /enviar/i });

        await user.type(input, 'Hello');
        fireEvent.click(button);

        expect(input).toBeDisabled();
        expect(button).toBeDisabled();
    });

    it('restores input on error', async () => {
        const user = userEvent.setup();
        mockOnSend.mockRejectedValue(new Error('Failed'));
        jest.spyOn(window, 'alert').mockImplementation(() => { });

        render(<MessageInput onSend={mockOnSend} />);

        const input = screen.getByPlaceholderText('Escribe un mensaje...');
        const button = screen.getByRole('button', { name: /enviar/i });

        await user.type(input, 'Hello');
        await user.click(button);

        await waitFor(() => {
            expect(input).toHaveValue('Hello');
        });
    });
});
