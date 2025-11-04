export const taskDialogStyles = {
  overlay: "fixed inset-0 z-50",
  dialog: "fixed inset-0 z-50 flex items-center justify-center p-[clamp(0.75rem,2vh,1rem)]",
  panel: "w-full max-w-md max-h-[90svh] rounded-lg border bg-white shadow-xl",
  header: "border-b p-[clamp(0.75rem,2vh,1rem)] text-lg font-semibold",
  body: "p-[clamp(0.75rem,2vh,1rem)] space-y-3 overflow-auto",
  label: "block text-sm font-medium text-gray-700",
  input: "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
  textarea: "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
  footer: "flex justify-end gap-2 border-t p-[clamp(0.75rem,2vh,1rem)]",
  cancel: "rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50",
  save: "rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60",
}
