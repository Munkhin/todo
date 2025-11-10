import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// calculate usage percentage from credits used and limit
export function calculateUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((used / limit) * 100)
}
