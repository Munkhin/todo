import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitOnboarding, OnboardingPayload } from '@/lib/api/onboarding';
import { useSettings } from './use-settings';

export function useOnboarding(userId: number | null) {
    const queryClient = useQueryClient();
    const { settings, isLoading: isSettingsLoading } = useSettings(userId);

    // Check if onboarding is completed based on settings
    // If settings are loading, we don't know yet.
    // If settings are loaded, check the flag.
    const isOnboarded = settings?.onboarding_completed === true;

    const submitMutation = useMutation({
        mutationFn: async (payload: OnboardingPayload) => {
            if (!userId || userId <= 0) throw new Error('Invalid user ID');
            return submitOnboarding(userId, payload);
        },
        onSuccess: () => {
            // Invalidate settings query to refresh onboarding status
            queryClient.invalidateQueries({ queryKey: ['settings', userId] });
            // Also invalidate tasks and calendar since agent might have created them
            queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
            queryClient.invalidateQueries({ queryKey: ['calendar', userId] });
        },
    });

    return {
        isOnboarded,
        isSettingsLoading,
        submit: submitMutation.mutateAsync,
        isSubmitting: submitMutation.isPending,
        error: submitMutation.error,
    };
}
