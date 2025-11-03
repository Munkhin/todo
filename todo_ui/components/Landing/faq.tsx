"use client"
import { useState } from "react"
import { faqStyles } from "./faq.styles"

const faqs = [
  {
    q: "How does the AI scheduling work?",
    a: "We analyze your request, existing tasks and energy profile to propose optimal time blocks. You can adjust anytime.",
  },
  { q: "Can I integrate with Google Calendar?", a: "Calendar integrations are planned. For now, manage schedules within Todo." },
  { q: "What happens when I run out of credits?", a: "You can upgrade to Pro or wait until your monthly credits reset." },
  { q: "Is my data private and secure?", a: "We store only what’s needed and never sell your data. Read our Privacy Policy for details." },
  { q: "Can I cancel my subscription anytime?", a: "Yes, cancel anytime from the Subscription page. Your plan stays active until the current period ends." },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className={faqStyles.section}>
      <div className={faqStyles.container}>
        <h2 className={faqStyles.title}>Frequently Asked Questions</h2>
        <div className={faqStyles.wrapper}>
          {faqs.map((item, idx) => (
            <div key={item.q}>
              <button className={faqStyles.row} onClick={() => setOpen(open === idx ? null : idx)}>
                <span className={faqStyles.q}>{item.q}</span>
                <span className={faqStyles.i}>{open === idx ? "–" : "+"}</span>
              </button>
              {open === idx && <div className={faqStyles.a}>{item.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
