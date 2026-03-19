import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-20">
        <main className="max-w-lg mx-auto">
          {children}
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
}
