import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

export function useUserRatingStats() {
    const { user } = useUser();
    const userId = user?.id;

    return useQuery({
        queryKey: ['userRatingStats', userId],
        queryFn: async () => {
            if (!userId) return null;
            const res = await fetch('/api/users/me/rating-stats');
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!userId,
    });
}
