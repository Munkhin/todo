"use client"
import { useState } from "react"
import { feedbackStyles } from "./FeedbackView.styles"
import { api } from "@/lib/api/client"
import { useUserId } from "@/hooks/use-user-id"

export default function FeedbackView() {
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useUserId()

  const submit = async () => {
    if (!message.trim()) return
    setSending(true)
    setError(null)
    try {
      await api.post('/api/feedback', { message, email, user_id: userId })
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send feedback')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <section className={feedbackStyles.container} aria-labelledby="feedback-title">
        <h1 id="feedback-title" className={feedbackStyles.title}>Feedback</h1>
        <article className={feedbackStyles.card}>
          <div className={feedbackStyles.body}>
            <p className="text-green-700">Thank you! We've received your feedback.</p>
            <div className="mt-4 text-right">
              <button className={feedbackStyles.send} onClick={() => { setSent(false); setMessage("") }}>Submit Another</button>
            </div>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className={feedbackStyles.container} aria-labelledby="feedback-title">
      <h1 id="feedback-title" className={feedbackStyles.title}>Feedback</h1>
      <article className={feedbackStyles.card}>
        <div className={feedbackStyles.body}>
          <label className={feedbackStyles.label}>
            Your Feedback
            <textarea className={feedbackStyles.textarea} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          </label>
          <label className={`${feedbackStyles.label} mt-4`}>
            Email (optional)
            <input type="email" className={feedbackStyles.email} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className={feedbackStyles.row}>
          <button className={feedbackStyles.send} onClick={submit} disabled={!message.trim() || sending}>
            {sending ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      </article>
    </section>
  )
}
