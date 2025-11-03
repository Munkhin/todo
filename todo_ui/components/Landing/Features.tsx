import { Brain, MessageSquare, Zap } from "lucide-react"
import { featuresStyles } from "./Features.styles"

export default function Features() {
  const features = [
    {
      title: "Schedule in Natural Language",
      desc:
        "Just type 'I need to study calculus for 2 hours before Friday' and we'll handle the rest. No complex forms or settings.",
      icon: MessageSquare,
    },
    {
      title: "Smooth Conflict Resolution",
      desc:
        "AI automatically detects scheduling conflicts and suggests optimal times based on your energy levels and existing commitments.",
      icon: Zap,
    },
    {
      title: "Learns From Your Requests",
      desc:
        "The more you use it, the better it gets at understanding your preferences, study patterns, and optimal learning times.",
      icon: Brain,
    },
  ]

  return (
    <section id="features" className={featuresStyles.section}>
      <div className={featuresStyles.container}>
        <h2 className={featuresStyles.title}>
          Everything You Need to Study Smarter
        </h2>
        <p className={featuresStyles.sub}>
          Powered by AI, designed for students
        </p>
        <div className={featuresStyles.grid}>
          {features.map(({ title, desc, icon: Icon }) => (
            <article key={title} className={featuresStyles.card}>
              <div className={featuresStyles.iconWrap}>
                <Icon className={featuresStyles.icon} aria-hidden />
              </div>
              <h3 className={featuresStyles.cardTitle}>{title}</h3>
              <p className={featuresStyles.cardDesc}>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
