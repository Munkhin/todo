import { Zap, FileText, Clock } from "lucide-react"
import { impactStyles } from "./impact.styles"

export default function Impact() {
  const features = [
    {
      title: "Lightning Fast",
      desc: (
        <>
          Process planning in <span className="font-semibold">minutes</span> — not hours.
        </>
      ),
      Icon: Zap,
      badge: impactStyles.badgeRose,
      icon: impactStyles.iconRose,
    },
    {
      title: "Multi‑format File Upload",
      desc: (
        <>
          Upload PDFs, images, and docs — right inside <span className="font-semibold">AI chat</span>.
        </>
      ),
      Icon: FileText,
      badge: impactStyles.badgeViolet,
      icon: impactStyles.iconViolet,
    },
    {
      title: "Save 100+ Hours",
      desc: (
        <>
          Stop <span className="font-semibold">wasting days</span> manually planning.
        </>
      ),
      Icon: Clock,
      badge: impactStyles.badgeBlue,
      icon: impactStyles.iconBlue,
    },
  ]

  return (
    <section className={impactStyles.section}>
      <div className={impactStyles.container}>
        <div className={impactStyles.grid}
        >
          {features.map(({ title, desc, Icon, badge, icon }) => (
            <article key={title} className={impactStyles.item}>
              <div className={`${impactStyles.badgeBase} ${badge}`}>
                <Icon className={`${impactStyles.badgeIcon} ${icon}`} aria-hidden />
              </div>
              <h3 className={impactStyles.itemTitle}>{title}</h3>
              <p className={impactStyles.itemDesc}>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
