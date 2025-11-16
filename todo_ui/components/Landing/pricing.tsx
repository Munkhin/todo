"use client"
import Link from "next/link"
import { useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import { pricingStyles } from "./pricing.styles"
// react query
import { useSubscription } from "@/hooks/use-subscription"
// end react query
import { useUserId } from "@/hooks/use-user-id"
import { PLAN_CONFIGS, PlanTier, isPaidPlan } from "@/components/Pricing/plan-config"

const freePlanHref = PLAN_CONFIGS.find((plan) => plan.variant === 'free')?.href ?? '/signup'

export default function Pricing() {
  const { status } = useSession()
  const userId = useUserId()
  const { subscription } = useSubscription(userId)

  const startPlan = useCallback((plan: PlanTier) => {
    if (!isPaidPlan(plan)) {
      window.location.href = freePlanHref
      return
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || ''
    const purchaseUrl = `/purchase?plan=${plan}`
    if (status === 'authenticated') {
      window.location.href = purchaseUrl
    } else {
      signIn('google', { callbackUrl: `${base}${purchaseUrl}` })
    }
  }, [status])

  return (
    <section id="pricing" className={pricingStyles.section}>
      <div className={pricingStyles.container}>
        <h2 className={pricingStyles.title}>Simple, Transparent Pricing</h2>
        <p className={pricingStyles.sub}>Start free, upgrade as you grow</p>
        <div className={pricingStyles.grid}>
          {PLAN_CONFIGS.map((plan) => {
            const isCurrent = subscription?.plan === plan.variant
            const content = (
              <div className={pricingStyles.cardInner}>
                {plan.popular && <div className={pricingStyles.badge}>Most Popular</div>}
                <h3 className={pricingStyles.planTitle}>{plan.name}</h3>
                <p className={pricingStyles.price}>
                  {plan.price}
                  <span className={pricingStyles.per}>/month</span>
                </p>
                <p className={pricingStyles.note}>{plan.note}</p>
                <ul className={pricingStyles.features}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className={pricingStyles.bullet} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={pricingStyles.ctaWrap}>
                  {isCurrent ? (
                    <span className={pricingStyles.ctaDisabled}>Current plan</span>
                  ) : !isPaidPlan(plan.variant) ? (
                    <Link href={plan.href!} className={pricingStyles.ctaOutline}>
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      onClick={() => startPlan(plan.variant)}
                      className={pricingStyles.ctaGradient}
                    >
                      <span className={pricingStyles.ctaGradientInner}>{plan.cta}</span>
                    </button>
                  )}
                </div>
              </div>
            )

            return (
              <article key={plan.name} className={
                plan.variant === 'free' ? pricingStyles.card : pricingStyles.cardOuterGradient
              }>
                {content}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
