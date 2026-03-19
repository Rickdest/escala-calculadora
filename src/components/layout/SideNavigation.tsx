import { Home, Package, BarChart3, GraduationCap, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: BarChart3, label: 'ROAS', path: '/roas' },
  { icon: GraduationCap, label: 'Educação', path: '/education' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function SideNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, status } = useSubscription();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-surface border-r border-border z-50">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <span className="text-xl font-bold text-foreground tracking-tight">Precify</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActivePath = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActivePath
                  ? 'text-primary'
                  : 'text-text-2 hover:text-foreground hover:bg-surface-2'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActivePath ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      {!isActive && (
        <div className="px-3 py-3">
          <button
            onClick={() => navigate('/paywall')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-2/80 transition-colors"
          >
            <span className="text-sm">⚡</span>
            <div className="text-left">
              <p className="text-xs font-semibold text-primary">Garantir acesso</p>
              <p className="text-[10px] text-text-3">R$49,90/ano</p>
            </div>
          </button>
        </div>
      )}

      {isActive && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-xs">✅</span>
            <span className="text-xs font-medium text-primary">Plano ativo{status === 'trialing' ? ' (teste)' : ''}</span>
          </div>
        </div>
      )}

      <div className="px-4 py-4 border-t border-border">
        <p className="text-[10px] text-text-3 text-center">© {new Date().getFullYear()} Precify</p>
      </div>
    </aside>
  );
}
