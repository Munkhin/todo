export const subscriptionStyles = {
  container: "space-y-8 min-h-[60svh]",
  title: "text-2xl font-semibold",
  card: "rounded-lg border bg-white shadow-sm",
  body: "p-[clamp(1rem,2.5vh,1.5rem)]",
  // New simplified layout
  planTitle: "text-3xl font-bold text-gray-900",
  subText: "mt-1 text-sm text-gray-600",
  statusBadge: "mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700",
  progressWrap: "mt-6",
  progressLabelRow: "flex items-center justify-between text-sm text-gray-600 mb-2",
  progressBar: "relative h-3 w-full overflow-hidden rounded-full bg-gray-200",
  progressFill: "h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all",
  percentLabel: "mt-2 text-xs text-gray-500",
  unlimitedNote: "mt-4 text-sm text-gray-600",
  actions: "mt-8 flex flex-col gap-3 sm:flex-row sm:gap-2 border-t p-[clamp(0.75rem,2vh,1rem)]",
  btn: "inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed",
  primary: "inline-flex w-full items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed",
}
