/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSendMessage } from '../useSendMessage';
import { createWrapper } from '../../../tests/utils/test-utils';

// Mock fetch
global.fetch = jest.fn();

describe('useSendMessage', () => {
    const mockBookingId = 'booking-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should send message successfully', async () => {
        const mockMessage = { id: '1', text: 'Hello', senderId: 'user-1' };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessage,
        });

        const { result } = renderHook(() => useSendMessage(mockBookingId), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.mutate('Hello');
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `/api/bookings/${mockBookingId}/messages`,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ text: 'Hello' }),
            })
        );
    });

    it('should handle errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => useSendMessage(mockBookingId), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            try {
                await result.current.mutateAsync('Hello');
            } catch (e) {
                // Expected error
            }
        });

        expect(result.current.isError).toBe(true);
    });
});
