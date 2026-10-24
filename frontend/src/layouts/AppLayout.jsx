import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Shell() {
  const { sidebarToggle, closeMobileSidebar } = useSidebar();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        {/* Small-device overlay (partials/overlay.html) */}
        {sidebarToggle && <div onClick={closeMobileSidebar} className="fixed z-9 h-screen w-full bg-gray-900/50 xl:hidden" />}
        <Header />
        <main>
          <div className="mx-auto max-w-(--breakpoint-2xl) p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  );
}
