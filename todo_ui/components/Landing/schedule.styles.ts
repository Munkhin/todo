// schedule section styles
export const scheduleStyles = {
  section: "mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center gap-12 px-8 py-16",
  headline: "text-balance text-center text-5xl font-bold leading-tight tracking-tight text-black md:text-6xl",
  headlineRow: "inline-flex flex-wrap items-center justify-center gap-[0.25em]",
  headlineWord: "whitespace-nowrap",
  rotatingWrapper:
    "relative inline-block overflow-hidden align-bottom [transform:scaleY(-1)]",
  rotatingInner: "flex flex-col will-change-transform",
  rotatingInnerAnimated: "transition-transform duration-500 ease-in-out",
  rotatingWord:
    "inline-block whitespace-nowrap [transform:scaleY(-1)]",
  secondLine: "block mt-4",
  neutralHighlight: "rounded-md bg-gray-200 px-2 text-black",
  accentText: "text-indigo-600",
  underlineDark: "underline decoration-black decoration-2 underline-offset-4",
  subheadline: "max-w-2xl text-center text-lg font-semibold text-gray-600 md:text-xl",
  sourcesContainer:
    "flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm",
  sourcesList: "grid w-full max-w-lg grid-cols-3 items-center justify-items-center gap-8 px-12 mx-auto",
  scheduleButton: "block w-full rounded-xl bg-indigo-600 px-6 py-3 text-center text-lg font-semibold text-white transition hover:bg-indigo-700",
}
