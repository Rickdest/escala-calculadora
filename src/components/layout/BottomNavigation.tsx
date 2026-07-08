import React from 'react';
import { Calculator, ShoppingBag, BarChart2, TrendingUp, DollarSign } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Calculator, label: 'Calcular', path: '/' },
  { icon: ShoppingBag, label: 'Produtos', path: '/products' },
  { icon: BarChart2, label: 'Ads', path: '/roas' },
  { icon: TrendingUp, label: 'Performance', path: '/performance' },
  { icon: DollarSign, label: 'Lucro', path: '/lucro' },
];

export const BottomNavigation = React.forwardRef<HTMLElement, Record<string, never>>(function BottomNavigation(_props, ref) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'hsl(var(--background))',
        borderTop: '0.5px solid hsl(var(--border))',
        padding: '10px 8px calc(18px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center flex-1 bg-transparent border-none outline-none cursor-pointer"
              style={{ gap: '4px' }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  background: isActive ? 'hsla(24, 100%, 45%, 0.12)' : 'transparent',
                  borderRadius: '12px',
                  padding: isActive ? '5px 12px' : '5px 12px',
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  lineHeight: 1,
                }}
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
