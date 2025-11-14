import dynamic from 'next/dynamic'

const ScheduleView = dynamic(() => import('@/components/Schedule/ScheduleView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">Loading schedule...</div>
    </div>
  ),
})

export default function SchedulePage() {
  return (
    <div className="flex-1 min-h-0 -mx-[clamp(1rem,2.5vh,1.5rem)]">
      <ScheduleView />
    </div>
  )
}
