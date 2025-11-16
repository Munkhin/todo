"use client"
// react query
import { useSubscription } from "@/hooks/use-subscription"
// end react query
import { subscriptionStyles } from "./SubscriptionView.styles"
import { useUserId } from "@/hooks/use-user-id"
import { PlanManagementSection } from "./PlanManagementSection"
import type { Subscription } from "@/lib/api/subscription"

export default function SubscriptionView() {
  const userId = useUserId()
  const { subscription, loading, error } = useSubscription(userId)

  const used = subscription?.credits_used ?? 0
  const cap = typeof subscription?.credits_limit === 'number' ? subscription.credits_limit : null
  const hasLimit = typeof cap === 'number' && cap > 0
  const pct = hasLimit ? Math.min(100, Math.round((used / cap) * 100)) : null

  const planName = formatPlanName(subscription)
  const renewalCopy = getRenewalCopy(subscription)
  const statusLabel = subscription?.status ? subscription.status.replace(/_/g, ' ') : null

  return (
    <section className={subscriptionStyles.container} aria-labelledby="subscription-title">
      <h1 id="subscription-title" className={subscriptionStyles.title}>Subscription</h1>
      <article className={subscriptionStyles.card}>
        <div className={subscriptionStyles.body}>
          {subscription ? (
            <>
              <div>
                <p className={subscriptionStyles.planTitle}>
                  {planName} Plan
                </p>
                <p className={subscriptionStyles.subText}>{renewalCopy}</p>
                {statusLabel && (
                  <span className={subscriptionStyles.statusBadge} aria-label="Subscription status">
                    {statusLabel}
                  </span>
                )}
              </div>

              <div className={subscriptionStyles.progressWrap}>
                <div className={subscriptionStyles.progressLabelRow}>
                  <span>Credits usage</span>
                  <span>{hasLimit ? `${used} / ${cap}` : `${used} used`}</span>
                </div>
                {hasLimit ? (
                  <>
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
                  </>
                ) : (
                  <p className={subscriptionStyles.unlimitedNote}>Unlimited credits available</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-600">{loading ? 'Loading…' : 'No subscription info available.'}</p>
          )}
        </div>
      </article>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <PlanManagementSection subscription={subscription} />
    </section>
  )
}

function formatPlanName(subscription: Subscription | null): string {
  const plan = subscription?.plan ?? 'free'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function getRenewalCopy(subscription: Subscription | null): string {
  if (!subscription) {
    return 'Renews automatically each billing cycle'
  }

  const { renews_at, status } = subscription
  if (renews_at) {
    const parsed = new Date(renews_at)
    if (!isNaN(parsed.getTime())) {
      return `Renews ${parsed.toLocaleDateString('en-US')}`
    }
  }

  if (status.toLowerCase().includes('cancel')) {
    return 'Cancels at the end of the current period'
  }

  return 'Renews automatically each billing cycle'
}
