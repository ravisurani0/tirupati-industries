import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext(null);

/**
 * Mirrors the TailAdmin `sidebarToggle` flag:
 *  - below 1280px (xl) it means "drawer open"
 *  - at 1280px+ it means "collapsed to icons"
 */
export function SidebarProvider({ children }) {
  const [sidebarToggle, setSidebarToggle] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        sidebarToggle,
        toggleSidebar: () => setSidebarToggle((v) => !v),
        closeMobileSidebar: () => {
          if (window.innerWidth < 1280) setSidebarToggle(false);
        },
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
