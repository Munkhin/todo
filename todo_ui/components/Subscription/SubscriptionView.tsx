"use client"
// react query
import { useSubscription } from "@/hooks/use-subscription"
// end react query
import { subscriptionStyles } from "./SubscriptionView.styles"
import { useUserId } from "@/hooks/use-user-id"

export default function SubscriptionView() {
  const userId = useUserId()
  const { subscription, loading, error } = useSubscription(userId)

  const used = subscription?.credits_used ?? 0
  const cap = subscription?.credits_limit ?? 0
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0

  // defensive check for plan name
  const planName = subscription?.plan || 'free'
  const displayPlanName = planName.charAt(0).toUpperCase() + planName.slice(1)

  return (
    <section className={subscriptionStyles.container} aria-labelledby="subscription-title">
      <h1 id="subscription-title" className={subscriptionStyles.title}>Subscription</h1>
      <article className={subscriptionStyles.card}>
        <div className={subscriptionStyles.body}>
          {subscription ? (
            <>
              <div>
                <p className={subscriptionStyles.planTitle}>
                  {displayPlanName} Plan
                </p>
                <p className={subscriptionStyles.subText}>
                  Renews {new Date(subscription.renews_at).toLocaleDateString('en-US')}
                </p>
              </div>

              <div className={subscriptionStyles.progressWrap}>
                <div className={subscriptionStyles.progressLabelRow}>
                  <span>Credits usage</span>
                  <span>{used} / {cap}</span>
                </div>
                <div
                  className={subscriptionStyles.progressBar}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={cap}
                  aria-valuenow={used}
                  aria-label="Credits used"
                >
                  <div className={subscriptionStyles.progressFill} style={{ width: `${pct}%` }} />
                </div>
                <div className={subscriptionStyles.percentLabel}>{pct}% used</div>
              </div>
            </>
          ) : (
            <p className="text-gray-600">{loading ? 'Loading…' : 'No subscription info available.'}</p>
          )}
        </div>
      </article>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
