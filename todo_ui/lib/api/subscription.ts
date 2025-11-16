import { api } from './client'
import type { PlanTier } from '@/types/subscription'

type SubscriptionApiResponse = {
  success?: boolean
  subscription_plan?: string | null
  subscription_status?: string | null
  credits_used?: number | null
  credit_limit?: number | null
  renews_at?: string | null
}

export interface Subscription {
  plan: PlanTier
  status: string
  credits_used: number
  credits_limit: number | null
  renews_at: string | null
}

const normalizePlan = (rawPlan?: string | null): PlanTier => {
  const normalized = (rawPlan ?? 'free').toLowerCase()
  if (normalized === 'pro' || normalized === 'unlimited') {
    return normalized
  }
  return 'free'
}

export async function getSubscription(userId: number): Promise<Subscription> {
  const response = await api.get<SubscriptionApiResponse>(`/api/users/${userId}/subscription`)

  return {
    plan: normalizePlan(response.subscription_plan),
    status: response.subscription_status ?? 'active',
    credits_used: response.credits_used ?? 0,
    credits_limit: typeof response.credit_limit === 'number' ? response.credit_limit : null,
    renews_at: response.renews_at ?? null,
  }
}
