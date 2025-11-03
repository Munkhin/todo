"use client"

import { useEffect } from "react"
import { errorStyles } from "./error.styles"

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className={errorStyles.main}>
      <section className={errorStyles.card} aria-labelledby="error-title">
        <h1 id="error-title" className={errorStyles.title}>Something went wrong</h1>
        <p className={errorStyles.body}>An unexpected error occurred. Please try again.</p>
        <button className={errorStyles.btn} onClick={() => reset()}>Try again</button>
      </section>
    </main>
  )
}

