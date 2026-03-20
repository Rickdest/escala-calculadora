import { PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Plano Pro', color: 'text-success' },
  trialing: { label: 'Trial Ativo', color: 'text-warning' },
  free: { label: 'Gratuito', color: 'text-muted-foreground' },
  canceled: { label: 'Cancelado', color: 'text-danger' },
  expired: { label: 'Expirado', color: 'text-danger' },
  past_due: { label: 'Pendente', color: 'text-warning' },
  loading: { label: '', color: '' },
};

export function DesktopHeader() {
  const { collapsed, toggle } = useSidebarState();
  const { status } = useSubscription();
  const info = statusLabels[status] || statusLabels.free;

  return (
    <header className="hidden md:flex items-center h-14 border-b border-border bg-background/90 backdrop-blur-md px-4 gap-4 sticky top-0 z-40">
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>

      {/* Search placeholder */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-sidebar-accent/50 border border-border text-muted-foreground">
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="text-[13px]">Buscar...</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Account status */}
      {info.label && (
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full', info.color.replace('text-', 'bg-'))} />
          <span className={cn('text-[13px] font-medium', info.color)}>{info.label}</span>
        </div>
      )}
    </header>
  );
}
