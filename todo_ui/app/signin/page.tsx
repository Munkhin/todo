"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { signinStyles } from "./page.styles"

export default function SignInPage() {
  const [loading, setLoading] = useState(false)

  const onGoogle = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/dashboard" })
    setLoading(false)
  }

  return (
    <main className={signinStyles.main}>
      <section className={signinStyles.card} aria-labelledby="signin-title">
        <h1 id="signin-title" className={signinStyles.title}>Sign in to Todo</h1>
        <p className={signinStyles.sub}>Continue with your Google account</p>
        <button onClick={onGoogle} disabled={loading} className={signinStyles.button}>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
        <p className="mt-6 text-sm text-gray-500 max-w-sm text-center leading-relaxed">
          Review studybar.academy&apos;s <a href="/privacy" className="text-blue-600 hover:underline">privacy policy</a> and <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> to understand how studybar.academy will process and protect your data.
        </p>
      </section>
    </main>
  )
}
