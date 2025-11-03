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
      </section>
    </main>
  )
}
