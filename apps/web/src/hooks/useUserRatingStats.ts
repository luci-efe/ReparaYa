import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

export function useUserRatingStats() {
    const { user } = useUser();
    const userId = user?.id; // This is Clerk ID, we need internal ID usually, but let's see how API handles it.
    // The API expects internal ID. We need to resolve it or use an endpoint that uses "me".
    // Actually, the API I created `app/api/users/[id]/rating-stats/route.ts` takes an ID.
    // But I also created `app/api/contractors/me/ratings` and `app/api/clients/me/ratings`.
    // For stats, I should probably create a "me" endpoint or resolve the ID.
    // Let's assume for now we can pass the internal ID if we have it, or we might need a new endpoint.
    // Wait, `useUser` gives Clerk ID. My API `GET /api/users/[id]/rating-stats` expects internal ID.
    // I should probably make a `/api/users/me/rating-stats` or similar.
    // Or I can use the existing `useInternalUser` hook if it exists (I recall seeing it in other conversations).

    // Let's check if there is a hook for internal user.
    return useQuery({
        queryKey: ['userRatingStats', userId],
        queryFn: async () => {
            if (!userId) return null;
            // Fetching from a new endpoint that resolves "me" would be safer.
            // Let's create `app/api/users/me/rating-stats/route.ts` quickly or use the ID if we can get it.
            // For now, let's try to fetch using the clerk ID if the backend supports it, or better, 
            // let's fetch the internal user first.

            // Actually, looking at `ClientMetricsOverview`, it fetches `/api/users/me/messages/unread-count`.
            // I should probably add `/api/users/me/rating-stats`.
            const res = await fetch('/api/users/me/rating-stats');
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!userId,
    });
}
