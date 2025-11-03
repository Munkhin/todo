import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { heroStyles } from "./Hero.styles"

export default function Hero() {
  return (
    <section className={heroStyles.section}>
      <div className={heroStyles.container}>
        <div className={heroStyles.stack}>
          <h1 className={heroStyles.title}>
            <span className={heroStyles.titleLine}>
              Stop <span className={heroStyles.highlightHours}>wasting hours</span>{" "}
              <span className={heroStyles.highlightStudy}>scheduling</span> study sessions.
            </span>
            <span className={heroStyles.underlineCallout}>Just ask.</span>
          </h1>
          <p className={heroStyles.sub}>
            Let AI understand your workload and create the perfect study schedule. Just chat naturally about what you need to learn.
          </p>
          <div className={heroStyles.ctas}>
            <Link
              href="/signup"
              className={heroStyles.primary}
            >
              Start Scheduling Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#demo"
              className={heroStyles.secondary}
            >
              <Play className="mr-2 h-5 w-5" /> Watch Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
