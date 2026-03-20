import { Home, Package, BarChart3, Warehouse, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: BarChart3, label: 'Ads', path: '/roas' },
  { icon: Warehouse, label: 'Estoque', path: '/stock' },
  { icon: Settings, label: 'Config', path: '/settings' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav md:hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bottom-nav-item flex-1 max-w-[72px]"
            >
              <Icon 
                className={cn(
                  'w-5 h-5 transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-text-3'
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span 
                className={cn(
                  'text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-text-3'
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
