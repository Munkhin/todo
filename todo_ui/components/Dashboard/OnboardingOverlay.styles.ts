export const onboardingStyles = {
    overlay: "fixed inset-0 z-50 bg-white animate-in fade-in duration-300 overflow-hidden flex flex-col", // Changed to overflow-hidden and flex-col
    container: "h-full w-full max-w-5xl mx-auto flex flex-col bg-white relative", // Changed to h-full and relative
    header: "px-8 pt-8 pb-4 flex justify-between items-start bg-white shrink-0", // Reduced padding

    // Progress
    progressContainer: "flex gap-2 mb-4", // Reduced margin
    progressPill: "h-1.5 rounded-full transition-all duration-300",

    content: "flex-1 px-8 overflow-y-auto max-w-3xl mx-auto w-full flex flex-col scrollbar-hide pb-32", // Added overflow-y-auto and padding bottom for footer
    footer: "absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-between items-center w-full z-10", // Changed to absolute

    // Typography
    title: "text-3xl font-bold text-gray-900 mb-2 tracking-tight", // Reduced size and margin
    subtitle: "text-lg text-gray-500 mb-6 leading-relaxed", // Reduced size and margin
    sectionTitle: "text-lg font-semibold text-gray-900 mb-3",

    // Form elements
    inputGroup: "space-y-4", // Reduced space
    label: "block text-sm font-medium text-gray-700 mb-1.5",
    input: "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-base text-gray-900 placeholder:text-gray-400", // Reduced padding and radius
    textarea: "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-base text-gray-900 placeholder:text-gray-400 min-h-[120px] resize-none", // Reduced height

    // Buttons
    primaryBtn: "px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base",
    secondaryBtn: "px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-full border border-gray-200 transition-all disabled:opacity-50 text-base",
    ghostBtn: "px-4 py-2 text-gray-500 hover:text-gray-900 font-medium transition-colors",
    skipBtn: "text-sm text-gray-400 hover:text-gray-900 transition-colors font-medium",

    // Cards/Items
    itemCard: "flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group", // Reduced padding
    itemText: "font-medium text-gray-900 text-base",
    itemSubtext: "text-sm text-gray-500",
    removeBtn: "text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-full",

    // Grid layouts
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-4", // Reduced gap

    // Illustration placeholder
    illustrationPlaceholder: "w-full h-48 bg-gray-50 rounded-2xl mb-6 flex items-center justify-center border-2 border-dashed border-gray-100 shrink-0", // Reduced height to h-48
}
