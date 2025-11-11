import { api } from './client'

export interface Subscription {
  plan: 'free' | 'pro' | 'unlimited'
  credits_used: number
  credits_limit: number
  renews_at: string
}

export async function getSubscription(userId: number) {
  return api.get<Subscription>(`/api/users/${userId}/subscription`)
}

export async function changePlan(userId: number, newPlan: Subscription['plan']) {
  return api.post<{ ok: boolean }>(`/api/subscription/change`, { user_id: userId, new_plan: newPlan })
}

export async function cancelSubscription(userId: number) {
  return api.post<{ ok: boolean }>(`/api/subscription/cancel`, { user_id: userId })
}

