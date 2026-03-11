import { Home, Package, BarChart3, GraduationCap, Settings, Crown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';
import logoIcon from '@/assets/logo-icon.png';

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
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-card/80 backdrop-blur-xl border-r border-border/50 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border/30">
        <img src={logoIcon} alt="Escala" className="w-9 h-9 object-contain" />
        <span className="text-xl font-extrabold text-foreground tracking-tight">Escala</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActivePath = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActivePath
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActivePath && 'text-primary')} strokeWidth={isActivePath ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Subscription CTA */}
      {!isActive && (
        <div className="px-3 py-3">
          <button
            onClick={() => navigate('/paywall')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Crown className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-xs font-bold text-primary">Assinar Pro</p>
              <p className="text-[10px] text-muted-foreground">Desbloqueie tudo</p>
            </div>
          </button>
        </div>
      )}

      {isActive && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 px-4 py-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Pro {status === 'trialing' ? '(Trial)' : ''}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Escala
        </p>
      </div>
    </aside>
  );
}
