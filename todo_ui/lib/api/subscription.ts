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

