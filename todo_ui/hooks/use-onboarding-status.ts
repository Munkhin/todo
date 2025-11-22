import { useQuery } from '@tanstack/react-query';
import { fetchOnboardingStatus } from '@/lib/api/onboarding';

export function useOnboardingStatus(userId: number | null) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['onboardingStatus', userId],
        queryFn: async () => {
            if (!userId || userId <= 0) throw new Error('Invalid user ID');
            return fetchOnboardingStatus(userId);
        },
        enabled: !!userId && userId > 0,
    });

    return {
        isOnboarded: data?.onboarding_completed === true,
        isLoading,
        error,
    };
}
