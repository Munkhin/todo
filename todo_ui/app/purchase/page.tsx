import { redirect } from 'next/navigation'
import { auth } from '@/auth'

type PurchasePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const session = await auth()
  if (!session) {
    redirect('/signin')
  }

  const params = await searchParams
  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan
  const plan = (rawPlan ?? '').toLowerCase()
  const proUrl = process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_URL
  const unlimitedUrl = process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PLAN_URL

  if (plan === 'pro' && proUrl) {
    redirect(proUrl)
  }
  if (plan === 'unlimited' && unlimitedUrl) {
    redirect(unlimitedUrl)
  }

  // Fallback to pricing if plan is missing
  redirect('/#pricing')
}
