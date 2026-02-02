import { Home, Package, BarChart3, Settings, GraduationCap, Boxes } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: Boxes, label: 'Estoque', path: '/stock' },
  { icon: BarChart3, label: 'Análise', path: '/analysis' },
  { icon: Settings, label: 'Config', path: '/settings' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

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
      </div>
    </nav>
  );
}
