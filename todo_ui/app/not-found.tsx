import Link from "next/link"
import { notFoundStyles } from "./not-found.styles"

export default function NotFound() {
  return (
    <main className={notFoundStyles.main}>
      <section className={notFoundStyles.card} aria-labelledby="nf-title">
        <h1 id="nf-title" className={notFoundStyles.title}>Page not found</h1>
        <p className={notFoundStyles.body}>We couldn’t find the page you were looking for.</p>
        <Link href="/dashboard" className={notFoundStyles.link}>Back to dashboard</Link>
      </section>
    </main>
  )
}

