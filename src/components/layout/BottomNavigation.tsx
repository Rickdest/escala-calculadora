import React from 'react';
import { Calculator, ShoppingBag, TrendingUp, Boxes, Settings2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Calculator, label: 'Calcular', path: '/' },
  { icon: ShoppingBag, label: 'Produtos', path: '/products' },
  { icon: TrendingUp, label: 'Ads', path: '/roas' },
  { icon: Boxes, label: 'Estoque', path: '/stock' },
  { icon: Settings2, label: 'Config', path: '/settings' },
];

export const BottomNavigation = React.forwardRef<HTMLElement, Record<string, never>>(function BottomNavigation(_props, ref) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav ref={ref} className="bottom-nav md:hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
                  'text-micro normal-case tracking-normal transition-colors duration-150',
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
});
