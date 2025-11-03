// sidebar styling configuration
export const sidebarStyles = {
  // width configuration
  width: {
    desktop: "20rem", // increased from default 16rem
    mobile: "20rem",  // increased from default 18rem
    icon: "3rem",
  },

  // header styling
  header: {
    padding: "px-6 py-4",
    border: "border-b",
    logo: {
      iconSize: "h-6 w-6",
      textSize: "text-xl",
      textWeight: "font-semibold",
    },
  },

  // menu item styling
  menuItem: {
    fontSize: "text-base",     // increased from default text-sm
    iconSize: "h-5 w-5",       // increased from default h-4 w-4
    padding: "p-3",            // increased from default p-2
    gap: "gap-3",              // increased from default gap-2
  },

  // group label styling
  groupLabel: {
    fontSize: "text-sm",       // increased from default text-xs
    padding: "px-2",
  },
}
