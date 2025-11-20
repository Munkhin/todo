export const onboardingStyles = {
    overlay: "fixed inset-0 z-50 bg-white animate-in fade-in duration-300 overflow-y-auto",
    container: "min-h-screen w-full max-w-5xl mx-auto flex flex-col bg-white",
    header: "px-8 py-8 flex justify-between items-start bg-white",

    // Progress
    progressContainer: "flex gap-2 mb-8",
    progressPill: "h-1.5 rounded-full transition-all duration-300",

    content: "flex-1 px-8 pb-24 max-w-3xl mx-auto w-full flex flex-col",
    footer: "fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center max-w-5xl mx-auto w-full",

    // Typography
    title: "text-4xl font-bold text-gray-900 mb-3 tracking-tight",
    subtitle: "text-xl text-gray-500 mb-8 leading-relaxed",
    sectionTitle: "text-lg font-semibold text-gray-900 mb-4",

    // Form elements
    inputGroup: "space-y-6",
    label: "block text-sm font-medium text-gray-700 mb-2",
    input: "w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-lg text-gray-900 placeholder:text-gray-400",
    textarea: "w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-lg text-gray-900 placeholder:text-gray-400 min-h-[160px] resize-none",

    // Buttons
    primaryBtn: "px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg",
    secondaryBtn: "px-8 py-4 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-full border border-gray-200 transition-all disabled:opacity-50 text-lg",
    ghostBtn: "px-4 py-2 text-gray-500 hover:text-gray-900 font-medium transition-colors",
    skipBtn: "text-base text-gray-400 hover:text-gray-900 transition-colors font-medium",

    // Cards/Items
    itemCard: "flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group",
    itemText: "font-medium text-gray-900 text-lg",
    itemSubtext: "text-sm text-gray-500",
    removeBtn: "text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full",

    // Grid layouts
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",

    // Illustration placeholder
    illustrationPlaceholder: "w-full h-64 bg-gray-50 rounded-3xl mb-10 flex items-center justify-center border-2 border-dashed border-gray-100",
}
