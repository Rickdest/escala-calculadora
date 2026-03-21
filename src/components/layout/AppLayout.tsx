import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';
import { DesktopHeader } from './DesktopHeader';
import { useSidebarState } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppLayoutProps {
  children: ReactNode;
}

function PageErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <span className="text-4xl">😵</span>
        <h1 className="text-lg font-bold text-foreground">Erro nesta página</h1>
        <p className="text-sm text-muted-foreground">Ocorreu um erro inesperado. Tente navegar para outra página ou recarregar.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={cn(
        'transition-all duration-200 ease-in-out min-h-screen flex flex-col',
        collapsed ? 'md:pl-[60px]' : 'md:pl-[200px]'
      )}>
        <DesktopHeader />

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <main className="w-full px-4 md:px-8 xl:px-12">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
