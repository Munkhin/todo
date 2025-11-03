"use client"
import { useEffect } from "react"
import { useSubscriptionStore } from "@/lib/store/useSubscriptionStore"
import { subscriptionStyles } from "./SubscriptionView.styles"
import { useUserId } from "@/hooks/use-user-id"

export default function SubscriptionView() {
  const { subscription, loading, error, fetchSubscription, changePlan, cancelSubscription } = useSubscriptionStore()
  const userId = useUserId()

  useEffect(() => {
    fetchSubscription(userId).catch(() => {})
  }, [fetchSubscription, userId])

  return (
    <section className={subscriptionStyles.container} aria-labelledby="subscription-title">
      <h1 id="subscription-title" className={subscriptionStyles.title}>Subscription</h1>
      <article className={subscriptionStyles.card}>
        <div className={subscriptionStyles.body}>
          {subscription ? (
            <div className={subscriptionStyles.grid}>
              <div className={subscriptionStyles.stat}>
                <p className={subscriptionStyles.statLabel}>Plan</p>
                <p className={subscriptionStyles.statValue}>{subscription.plan}</p>
              </div>
              <div className={subscriptionStyles.stat}>
                <p className={subscriptionStyles.statLabel}>Credits</p>
                <p className={subscriptionStyles.statValue}>{subscription.credits_used} / {subscription.credits_limit}</p>
              </div>
              <div className={subscriptionStyles.stat}>
                <p className={subscriptionStyles.statLabel}>Renews</p>
                <p className={subscriptionStyles.statValue}>{new Date(subscription.renews_at).toLocaleDateString('en-US')}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">{loading ? 'Loading…' : 'No subscription info available.'}</p>
          )}
        </div>
        <div className={subscriptionStyles.actions}>
          <button className={subscriptionStyles.btn} onClick={() => changePlan(userId, 'free')} disabled={loading}>Free</button>
          <button className={subscriptionStyles.btn} onClick={() => changePlan(userId, 'pro')} disabled={loading}>Pro</button>
          <button className={subscriptionStyles.btn} onClick={() => changePlan(userId, 'unlimited')} disabled={loading}>Unlimited</button>
          <div className="flex-1" />
          <button className={subscriptionStyles.primary} onClick={() => cancelSubscription(userId)} disabled={loading}>Cancel</button>
        </div>
      </article>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
