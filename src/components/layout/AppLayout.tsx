import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { WhatsAppFab } from './WhatsAppFab';
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
        'transition-all duration-200 ease-in-out min-h-screen flex flex-col',
        collapsed ? 'md:pl-[60px]' : 'md:pl-[200px]'
      )}>
        {/* Desktop header */}
        <DesktopHeader />

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <main className="w-full px-4 md:px-8 xl:px-12">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <WhatsAppFab />
      <BottomNavigation />
    </div>
  );
}
