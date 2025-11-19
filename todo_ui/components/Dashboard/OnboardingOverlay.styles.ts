export const onboardingStyles = {
    overlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300",
    container: "w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300",
    header: "px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10",
    progressContainer: "absolute top-0 left-0 w-full h-1 bg-gray-100",
    progressBar: "h-full bg-blue-600 transition-all duration-500 ease-out",
    content: "flex-1 overflow-y-auto p-8",
    footer: "px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center sticky bottom-0 z-10",

    // Typography
    title: "text-2xl font-bold text-gray-900 mb-2",
    subtitle: "text-gray-500 text-lg mb-8",
    sectionTitle: "text-lg font-semibold text-gray-900 mb-4",

    // Form elements
    inputGroup: "space-y-4",
    label: "block text-sm font-medium text-gray-700 mb-1",
    input: "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-900 placeholder:text-gray-400",
    textarea: "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-900 placeholder:text-gray-400 min-h-[120px] resize-none",

    // Buttons
    primaryBtn: "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
    secondaryBtn: "px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors disabled:opacity-50",
    ghostBtn: "px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors",
    skipBtn: "text-sm text-gray-400 hover:text-gray-600 transition-colors",

    // Cards/Items
    itemCard: "flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-blue-200 transition-colors",
    itemText: "font-medium text-gray-900",
    itemSubtext: "text-sm text-gray-500",
    removeBtn: "text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1",

    // Grid layouts
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-4",

    // Animation classes
    slideIn: "animate-in slide-in-from-right-8 fade-in duration-300",
}
