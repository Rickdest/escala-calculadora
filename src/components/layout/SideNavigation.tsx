import { Home, Package, BarChart3, GraduationCap, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-primary')} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Escala
        </p>
      </div>
    </aside>
  );
}
