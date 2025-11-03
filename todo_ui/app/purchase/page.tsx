import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function PurchasePage({ searchParams }: { searchParams: { plan?: string } }) {
  const session = await auth()
  if (!session) {
    redirect('/signin')
  }

  const plan = (searchParams.plan || '').toLowerCase()
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

