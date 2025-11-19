import { api } from './client';
import { EnergyProfilePayload } from './energyProfile';

export interface TestItem {
    name: string;
    date: string; // ISO date string
}

export interface OnboardingPayload {
    subjects: string[];
    tests: TestItem[];
    preferences: EnergyProfilePayload;
    additional_notes?: string;
}

export interface OnboardingResponse {
    success: boolean;
    message: string;
    agent_result?: any;
}

export async function submitOnboarding(userId: number, payload: OnboardingPayload): Promise<OnboardingResponse> {
    return api.post<OnboardingResponse>(`/api/onboarding/submit?user_id=${userId}`, payload);
}
