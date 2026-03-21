import { Calculator, ShoppingBag, TrendingUp, Settings2, Boxes, Store, UserCircle, ChevronDown, Plus, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useSidebarState } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { icon: Calculator, label: 'Início', path: '/' },
  { icon: ShoppingBag, label: 'Produtos', path: '/products' },
  { icon: TrendingUp, label: 'Ads', path: '/roas' },
  { icon: Boxes, label: 'Estoque', path: '/stock' },
  { icon: Store, label: 'Lojas', path: '/stores' },
  { icon: UserCircle, label: 'Perfil', path: '/profile' },
  { icon: Settings2, label: 'Configurações', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stores, currentStore, setCurrentStore } = useStore();
  const { collapsed } = useSidebarState();

  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-50 border-r border-border bg-sidebar transition-all duration-200 ease-in-out',
        collapsed ? 'md:w-[60px]' : 'md:w-[200px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0 overflow-hidden">
        <span className={cn(
          'font-bold text-foreground transition-all duration-200 whitespace-nowrap',
          collapsed ? 'text-base' : 'text-xl'
        )}>
          {collapsed ? 'P' : 'Precify'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          const button = (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg text-[14px] font-medium transition-colors',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              {!collapsed && <span className={cn('truncate text-[13px]', isActive ? 'text-primary' : 'text-text-3')}>{label}</span>}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={path} delayDuration={0}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* Suporte */}
      <div className="px-2 pb-1 border-t border-border pt-2">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <a
                href="https://wa.me/5511930291287"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors text-text-3 hover:bg-sidebar-accent hover:text-foreground justify-center px-0 py-2.5'
                )}
              >
                <MessageCircle className="w-5 h-5 flex-shrink-0 text-success" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Suporte
            </TooltipContent>
          </Tooltip>
        ) : (
          <a
            href="https://wa.me/5511930291287"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors text-text-3 hover:bg-sidebar-accent hover:text-foreground px-3 py-2.5'
            )}
          >
            <MessageCircle className="w-5 h-5 flex-shrink-0 text-success" />
            <span className="truncate">Suporte</span>
          </a>
        )}
      </div>

      {/* Store selector footer */}
      {currentStore && stores.length > 0 && (
        <div className="p-2 border-t border-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'w-full flex items-center gap-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors',
                collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
              )}>
                <Store className="w-4 h-4 text-sidebar-foreground flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-[13px] text-sidebar-foreground truncate flex-1 text-left">
                      {currentStore.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52">
              {stores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => setCurrentStore(store)}
                  className={cn(
                    'cursor-pointer',
                    currentStore.id === store.id && 'bg-primary/10 text-primary'
                  )}
                >
                  <Store className="w-4 h-4 mr-2" />
                  {store.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
