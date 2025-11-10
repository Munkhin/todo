'use client'

import dynamic from 'next/dynamic'

// Reuse the dashboard schedule view, but in demo mode
const ScheduleView = dynamic(() => import('@/components/Schedule/ScheduleView'), { ssr: false })

export default function DemoSection() {
  return (
    <section id="demo" className="mx-auto mt-12 max-w-[60rem] px-4 scroll-mt-24 md:scroll-mt-28">
      <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Constrain height for landing demo */}
        <div className="bg-white min-h-0 h-[60svh] md:h-[70svh] max-h-[calc(100svh-8rem)] overflow-hidden">
          {/* Demo mode limits to one message and appends CTA to pricing */}
          <ScheduleView demoMode demoMaxMessages={1} pricingAnchor="#pricing" />
        </div>
      </div>
    </section>
  )
}
