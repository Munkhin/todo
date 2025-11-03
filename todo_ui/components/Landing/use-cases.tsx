import { BookOpen, Target, Rocket } from "lucide-react"

import { useCasesStyles } from "./use-cases.styles"

const useCases = [
  {
    icon: BookOpen,
    category: "STUDENTS",
    title: "Ace Every Deadline",
    description: "Turn syllabi and assignment emails into a complete task calendar instantly.",
    features: [
      {
        emoji: "📚",
        text: "Paste your syllabus. AI extracts every assignment and due date.",
      },
      {
        emoji: "⏰",
        text: "Handles exam conflicts and overlapping deadlines automatically.",
      },
      {
        emoji: "📊",
        text: "Prioritizes by urgency so you know what's next.",
      },
      {
        emoji: "📅",
        text: "One click schedules everything. No manual calendar work.",
      },
    ],
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Target,
    category: "PROFESSIONALS",
    title: "Work Smarter, Not Harder",
    description: "Drop in meeting notes or emails. Get back a fully scheduled week.",
    features: [
      {
        emoji: "📧",
        text: "Paste emails or notes. AI figures out the tasks.",
      },
      {
        emoji: "🎯",
        text: "Blocks time for what matters based on priority.",
      },
      {
        emoji: "🔄",
        text: "Upload docs and PDFs. Tasks appear in seconds.",
      },
      {
        emoji: "✅",
        text: "Schedules hundreds of tasks without breaking a sweat.",
      },
    ],
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Rocket,
    category: "TEAMS",
    title: "Execute fast",
    description: "Feed it anything. Project plans, Slack threads, team docs. It handles the rest.",
    features: [
      {
        emoji: "🤖",
        text: "Type naturally. No templates or rigid formats.",
      },
      {
        emoji: "⚡",
        text: "Processes hundreds of tasks in under 10 seconds.",
      },
      {
        emoji: "🎨",
        text: "Resolves scheduling conflicts across the whole team.",
      },
      {
        emoji: "🌙",
        text: "Accepts any format: docs, emails, spreadsheets, text.",
      },
    ],
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
]

export default function UseCasesSection() {
  return (
    <section id="use-cases" className={useCasesStyles.section}>
      <div className={useCasesStyles.header}>
        <h2 className={useCasesStyles.title}>Use Cases</h2>
        <p className={useCasesStyles.subtitle}>
          Transform how you{" "}
          <span className={useCasesStyles.subtitleHighlight}>learn, work, and build</span> with
          smart task automation.
        </p>
      </div>

      <div className={useCasesStyles.grid}>
        {useCases.map((useCase) => (
          <div key={useCase.category} className={useCasesStyles.card}>
            <div className={`${useCasesStyles.iconWrapper} ${useCase.iconBg}`}>
              <useCase.icon className={`${useCasesStyles.icon} ${useCase.iconColor}`} />
            </div>
            <p className={useCasesStyles.category}>{useCase.category}</p>
            <h3 className={useCasesStyles.cardTitle}>{useCase.title}</h3>
            <p className={useCasesStyles.description}>{useCase.description}</p>
            <div className={useCasesStyles.featureList}>
              {useCase.features.map((feature, idx) => (
                <div key={idx} className={useCasesStyles.featureItem}>
                  <span className={useCasesStyles.featureIcon}>{feature.emoji}</span>
                  <span className={useCasesStyles.featureText}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
