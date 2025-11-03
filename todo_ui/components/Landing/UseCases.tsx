import { BookOpen, Check, GraduationCap, Target } from "lucide-react"
import { useCasesStyles } from "./UseCases.styles"

function PersonaCard({
  title,
  persona,
  icon: Icon,
  color,
  benefits,
}: {
  title: string
  persona: string
  icon: any
  color: string
  benefits: string[]
}) {
  return (
    <article className={useCasesStyles.card}>
      <div className={`${useCasesStyles.avatar} ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className={useCasesStyles.persona}>{persona}</p>
      <h3 className={useCasesStyles.cardTitle}>{title}</h3>
      <ul className="space-y-3">
        {benefits.map((b) => (
          <li key={b} className={useCasesStyles.benefitRow}>
            <Check className="mt-0.5 h-5 w-5 text-green-600" aria-hidden />
            <p className={useCasesStyles.benefitText}>{b}</p>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function UseCases() {
  return (
    <section id="use-cases" className={useCasesStyles.section}>
      <div className={useCasesStyles.container}>
        <h2 className={useCasesStyles.title}>
          Perfect For Every Learner
        </h2>
        <div className={useCasesStyles.grid}>
          <PersonaCard
            persona="High School Students"
            title="Ace Your Exams"
            icon={GraduationCap}
            color="bg-blue-100 text-blue-700"
            benefits={[
              "Balance multiple subjects effortlessly",
              "Never miss assignment deadlines",
              "Study at your peak focus times",
              "Track progress with visual calendars",
            ]}
          />
          <PersonaCard
            persona="University Students"
            title="Master Your Degree"
            icon={BookOpen}
            color="bg-purple-100 text-purple-700"
            benefits={[
              "Manage complex project timelines",
              "Coordinate group study sessions",
              "Optimize deep work blocks",
              "Adapt to changing syllabi instantly",
            ]}
          />
          <PersonaCard
            persona="Lifelong Learners"
            title="Achieve Your Goals"
            icon={Target}
            color="bg-orange-100 text-orange-700"
            benefits={[
              "Fit learning into busy schedules",
              "Build sustainable study habits",
              "Track long-term skill development",
              "Stay motivated with progress insights",
            ]}
          />
        </div>
      </div>
    </section>
  )
}
