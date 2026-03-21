import { PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useStore } from '@/contexts/StoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn, getMarginStatus } from '@/lib/utils';

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
  const { currentStore, getStoreStats } = useStore();
  const { theme, toggleTheme } = useTheme();
  const info = statusLabels[status] || statusLabels.free;

  const stats = currentStore ? getStoreStats(currentStore) : null;

  return (
    <header className="hidden md:flex items-center h-16 border-b border-border bg-background/90 backdrop-blur-md px-6 gap-4 sticky top-0 z-40">
      {/* Toggle sidebar */}
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>

      {/* Store name */}
      <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
        {currentStore?.name || 'Precify'}
      </p>

      <div className="flex-1" />

      {/* Inline store metrics */}
      {stats && stats.totalProducts > 0 && (
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <p className="section-label">MARGEM MÉDIA</p>
            <p className={cn('text-sm font-bold font-mono tabular-nums', getMarginStatus(stats.avgMargin).color)}>
              {stats.avgMargin.toFixed(1)}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="section-label">PRODUTOS</p>
            <p className="text-sm font-bold font-mono tabular-nums text-foreground">{stats.totalProducts}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="section-label">NA META</p>
            <p className="text-sm font-bold font-mono tabular-nums text-success">{stats.productsAboveTarget}</p>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Avatar + store + status */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
          {currentStore?.name?.[0]?.toUpperCase() || 'P'}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate max-w-[120px]">
            {currentStore?.name || 'Minha Loja'}
          </p>
          {info.label && (
            <p className={cn('text-[11px] font-medium', info.color)}>
              {info.label}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
