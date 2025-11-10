// controllers/credits.ts

export default class CreditsController {
  static async getUsage(userId: string): Promise<{ used: number; limit: number }> {
    const response = await fetch(`/api/users/${userId}/credits`)
    if (!response.ok) {
      throw new Error("Failed to fetch credit usage")
    }
    return response.json()
  }
}
