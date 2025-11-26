/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useBookingMessages } from '../useBookingMessages';
import { createWrapper } from '../../../tests/utils/test-utils';

// Mock supabase
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        channel: jest.fn().mockReturnValue({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
        }),
        removeChannel: jest.fn(),
    },
}));

// Mock fetch
global.fetch = jest.fn();

describe('useBookingMessages', () => {
    const mockBookingId = 'booking-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch messages successfully', async () => {
        const mockMessages = {
            messages: [
                { id: '1', text: 'Hello', senderId: 'user-1', createdAt: new Date().toISOString() },
            ],
            messagingWindow: { status: 'OPEN' },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages,
        });

        const { result } = renderHook(() => useBookingMessages(mockBookingId), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.data?.pages[0].messages).toHaveLength(1);
        expect(result.current.data?.pages[0].messages[0].text).toBe('Hello');
    });

    it('should handle errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useBookingMessages(mockBookingId), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
