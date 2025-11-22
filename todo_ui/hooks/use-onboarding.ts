import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitOnboarding, OnboardingPayload } from '@/lib/api/onboarding';
import { useOnboardingStatus } from './use-onboarding-status';

export function useOnboarding(userId: number | null) {
    const queryClient = useQueryClient();
    const { isOnboarded, isLoading: isOnboardingLoading } = useOnboardingStatus(userId);

    const submitMutation = useMutation({
        mutationFn: async (payload: OnboardingPayload) => {
            if (!userId || userId <= 0) throw new Error('Invalid user ID');
            return submitOnboarding(userId, payload);
        },
        onSuccess: () => {
            // Invalidate onboarding status to refresh
            queryClient.invalidateQueries({ queryKey: ['onboardingStatus', userId] });
            // Also invalidate tasks and calendar since agent might have created them
            queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
            queryClient.invalidateQueries({ queryKey: ['calendar', userId] });
        },
    });

    return {
        isOnboarded,
        isOnboardingLoading,
        submit: submitMutation.mutateAsync,
        isSubmitting: submitMutation.isPending,
        error: submitMutation.error,
    };
}

