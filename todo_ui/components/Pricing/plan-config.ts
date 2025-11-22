import type { PlanTier } from "@/types/subscription"
export type { PlanTier } from "@/types/subscription"

export type PlanConfig = {
  name: string
  price: string
  period: string
  note: string
  features: string[]
  cta: string
  variant: PlanTier
  href?: string
  popular?: boolean
}

export const PLAN_ORDER: PlanTier[] = ['free', 'pro', 'unlimited']

export const PLAN_RANK: Record<PlanTier, number> = PLAN_ORDER.reduce((acc, tier, index) => {
  acc[tier] = index
  return acc
}, {} as Record<PlanTier, number>)

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
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
    price: "$10",
    period: "/month",
    note: "Unlimited usage",
    features: [
      "Unlimited AI scheduling",
      "Smooth rescheduling",
      "Priority support via email",
    ],
    cta: "Start Pro Plan",
    variant: 'pro',
    popular: true,
  },
  {
    name: "Unlimited Yearly",
    price: "$100",
    period: "/year",
    note: "Unlimited usage (Yearly)",
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

export const isPaidPlan = (variant: PlanTier): variant is 'pro' | 'unlimited' => variant !== 'free'
