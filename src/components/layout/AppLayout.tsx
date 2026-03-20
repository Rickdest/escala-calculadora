import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="md:pl-60">
        <div className="pb-20 md:pb-0">
          <main className="max-w-lg mx-auto md:max-w-none md:mx-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation />
    </div>
  );
}
