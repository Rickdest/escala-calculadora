import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';
import { DesktopHeader } from './DesktopHeader';
import { useSidebarState } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className={cn(
        'transition-all duration-200 ease-in-out',
        collapsed ? 'md:pl-16' : 'md:pl-60'
      )}>
        {/* Desktop header */}
        <DesktopHeader />

        <div className="pb-20 md:pb-0">
          <main className="max-w-lg mx-auto md:max-w-[1200px] md:mx-auto md:px-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation />
    </div>
  );
}
