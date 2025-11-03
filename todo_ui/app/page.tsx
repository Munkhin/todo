// Landing page built from FRONTEND_SPEC.md
import Navbar from "@/components/Landing/navbar"
import Hero from "@/components/Landing/Hero"
import Impact from "@/components/Landing/impact"
import Features from "@/components/Landing/Features"
import UseCases from "@/components/Landing/UseCases"
import Pricing from "@/components/Landing/pricing"
import FAQ from "@/components/Landing/faq"
import Footer from "@/components/Landing/Footer"
import DemoSection from "@/components/Landing/Demo"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <DemoSection />
      <Impact />
      <Features />
      <UseCases />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
