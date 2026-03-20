import { Home, Package, BarChart3, GraduationCap, Settings, Warehouse, Store, UserCircle, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: BarChart3, label: 'ROAS', path: '/roas' },
  { icon: Warehouse, label: 'Estoque', path: '/stock' },
  { icon: GraduationCap, label: 'Educação', path: '/education' },
  { icon: Store, label: 'Lojas', path: '/stores' },
  { icon: UserCircle, label: 'Perfil', path: '/profile' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stores, currentStore, setCurrentStore } = useStore();

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 md:left-0 md:z-50 border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
        <span className="text-xl font-bold text-foreground">Precify</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary border-l-[3px] border-l-primary pl-[9px]'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Store selector footer */}
      {currentStore && stores.length > 0 && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
                <Store className="w-4 h-4 text-sidebar-foreground flex-shrink-0" />
                <span className="text-[13px] text-sidebar-foreground truncate flex-1 text-left">
                  {currentStore.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
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
