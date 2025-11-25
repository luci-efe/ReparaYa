import { useQuery } from '@tanstack/react-query';
import { User } from '@prisma/client';

export function useInternalUser() {
    return useQuery<User>({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const response = await fetch('/api/users/me');
            if (!response.ok) throw new Error('Failed to fetch user profile');
            return response.json();
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
