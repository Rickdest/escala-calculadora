import { Home, Package, BarChart3, Store, Settings, Moon, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: BarChart3, label: 'Análise', path: '/analysis' },
  { icon: Store, label: 'Lojas', path: '/stores' },
  { icon: Settings, label: 'Config', path: '/settings' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'bottom-nav-item flex-1 max-w-[72px]',
                isActive && 'bottom-nav-item-active'
              )}
            >
              <Icon 
                className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span 
                className={cn(
                  'text-[10px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="bottom-nav-item flex-1 max-w-[72px]"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          ) : (
            <Sun className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          )}
          <span className="text-[10px] font-semibold text-muted-foreground">
            {theme === 'light' ? 'Escuro' : 'Claro'}
          </span>
        </button>
      </div>
    </nav>
  );
}
