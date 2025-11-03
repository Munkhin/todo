import { create } from 'zustand'
import type { Subscription } from '@/lib/api/subscription'
import { cancelSubscription, changePlan, getSubscription } from '@/lib/api/subscription'

interface SubscriptionStore {
  subscription: Subscription | null
  loading: boolean
  error: string | null
  fetchSubscription: (userId: number) => Promise<void>
  changePlan: (userId: number, newPlan: Subscription['plan']) => Promise<void>
  cancelSubscription: (userId: number) => Promise<void>
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscription: null,
  loading: false,
  error: null,

  fetchSubscription: async (userId) => {
    set({ loading: true, error: null })
    try {
      const sub = await getSubscription(userId)
      set({ subscription: sub, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load subscription' })
    }
  },

  changePlan: async (userId, plan) => {
    set({ loading: true, error: null })
    try {
      await changePlan(userId, plan)
      const sub = await getSubscription(userId)
      set({ subscription: sub, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to change plan' })
    }
  },

  cancelSubscription: async (userId) => {
    set({ loading: true, error: null })
    try {
      await cancelSubscription(userId)
      const sub = await getSubscription(userId)
      set({ subscription: sub, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to cancel subscription' })
    }
  },
}))

