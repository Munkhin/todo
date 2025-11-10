"use client"
import Link from "next/link"
import { useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import { pricingStyles } from "./pricing.styles"
// react query
import { useSubscription } from "@/hooks/use-subscription"
// end react query
import { useUserId } from "@/hooks/use-user-id"

type Plan = {
  name: string
  price: string
  note: string
  features: string[]
  cta: string
  variant: 'free' | 'pro' | 'unlimited'
  href?: string
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    note: "10 schedules/month",
    features: [
      "Chat to schedule",
      "Daily and weekly calendar view",
      "File uploads",
    ],
    cta: "Get Started",
    variant: 'free',
    href: "/signup",
  },
  {
    name: "Pro",
    price: "$19.99",
    note: "500 schedules/month",
    features: [
      "Advanced AI scheduling",
      "Smooth rescheduling",
      "Priority support via email",
    ],
    cta: "Start Pro Plan",
    variant: 'pro',
    popular: true,
  },
  {
    name: "Unlimited",
    price: "$49.99",
    note: "Unlimited schedules",
    features: [
      "Unlimited scheduling",
      "Unlimited rescheduling",
      "Dedicated support via email",
      "Early access to features",
    ],
    cta: "Start Unlimited Plan",
    variant: 'unlimited',
  },
]

const freePlanHref = plans.find((plan) => plan.variant === 'free')?.href ?? '/signup'
const isPaidPlan = (variant: Plan['variant']): variant is 'pro' | 'unlimited' =>
  variant !== 'free'

export default function Pricing() {
  const { status } = useSession()
  const userId = useUserId()
  const { subscription } = useSubscription(userId)

  const startPlan = useCallback((plan: Plan['variant']) => {
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
          {plans.map((plan) => {
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
