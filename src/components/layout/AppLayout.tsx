import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { SideNavigation } from './SideNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <SideNavigation />
      
      {/* Main content: offset on desktop for sidebar */}
      <div className="pb-24 md:pb-0 md:ml-64">
        <main className="max-w-lg mx-auto md:max-w-5xl md:px-6">
          {children}
        </main>
      </div>

      {/* Bottom nav only on mobile */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
