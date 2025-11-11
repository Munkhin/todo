// controllers/subscription.ts

export default class SubscriptionController {
  static async getStatus(userId: string): Promise<{
    success: boolean
    subscription_plan: string
    subscription_status: string
    credits_used: number
    credit_limit: number | null
  }> {
    const response = await fetch(`/api/users/${userId}/subscription`)
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status")
    }
    return response.json()
  }

  static async getUsage(userId: string): Promise<{ used: number; limit: number }> {
    const response = await fetch(`/api/users/${userId}/credits`)
    if (!response.ok) {
      throw new Error("Failed to fetch credit usage")
    }
    return response.json()
  }
}
