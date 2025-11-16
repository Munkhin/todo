"use client"

import { pricingStyles } from "@/components/Landing/pricing.styles"
import { PLAN_CONFIGS, PLAN_RANK } from "@/components/Pricing/plan-config"
import type { Subscription } from "@/lib/api/subscription"
import type { PlanTier } from "@/types/subscription"

const stripeLinks: Partial<Record<PlanTier, string | undefined>> = {
  free: process.env.NEXT_PUBLIC_STRIPE_FREE_PLAN_URL,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_URL,
  unlimited: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PLAN_URL,
}

const manageUrl =
  process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL ||
  stripeLinks.free ||
  undefined

type PlanManagementSectionProps = {
  subscription: Subscription | null
}

type PlanAction = {
  label: string
  href?: string
  disabled: boolean
}

const getPlanAction = (target: PlanTier, current: PlanTier, planName: string): PlanAction => {
  if (target === current) {
    if (target === 'free') {
      return {
        label: 'Current plan',
        disabled: true,
      }
    }

    return {
      label: 'cancel plan',
      href: manageUrl,
      disabled: !manageUrl,
    }
  }

  const relation = PLAN_RANK[target] > PLAN_RANK[current] ? 'upgrade' : 'downgrade'
  const href = stripeLinks[target] ?? (relation === 'downgrade' ? manageUrl : undefined)

  return {
    label: `${relation} to ${planName}`,
    href,
    disabled: !href,
  }
}

export function PlanManagementSection({ subscription }: PlanManagementSectionProps) {
  const currentPlan: PlanTier = subscription?.plan ?? 'free'

  return (
    <section aria-labelledby="plan-management-title" className="space-y-4">
      <header className="space-y-1">
        <h2 id="plan-management-title" className="text-xl font-semibold">
          Change plan or cancel
        </h2>
        <p className="text-sm text-gray-600">
          Choose any option below. Button labels update automatically based on your subscription.
        </p>
      </header>

      <div className={pricingStyles.grid}>
        {PLAN_CONFIGS.map((plan) => {
          const action = getPlanAction(plan.variant, currentPlan, plan.name)
          const cardClass = plan.variant === 'free' ? pricingStyles.card : pricingStyles.cardOuterGradient

          return (
            <article key={plan.variant} className={cardClass}>
              <div className={pricingStyles.cardInner}>
                {plan.popular && <div className={pricingStyles.badge}>Most Popular</div>}
                <h3 className={pricingStyles.planTitle}>{plan.name}</h3>
                <p className={pricingStyles.price}>
                  {plan.price}
                  <span className={pricingStyles.per}>/month</span>
                </p>
                <p className={pricingStyles.note}>{plan.note}</p>
                <ul className={pricingStyles.features}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className={pricingStyles.bullet} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className={pricingStyles.ctaWrap}>
                  {!action.disabled && action.href ? (
                    <a
                      href={action.href}
                      className={pricingStyles.ctaGradient}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className={pricingStyles.ctaGradientInner}>{action.label}</span>
                    </a>
                  ) : (
                    <span className={pricingStyles.ctaDisabled}>{action.label}</span>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
