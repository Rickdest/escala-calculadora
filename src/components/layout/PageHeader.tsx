import { ChevronDown, Store } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import logoIcon from '@/assets/logo-icon.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showStoreSelector?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, showStoreSelector = true, action }: PageHeaderProps) {
  const { stores, currentStore, setCurrentStore } = useStore();

  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/30 px-4 py-4 safe-top md:px-0 md:py-5">
      <div className="flex items-center justify-between max-w-lg mx-auto md:max-w-none">
        <div className="flex items-center gap-2.5 flex-1">
          {/* Logo icon only on mobile */}
          <img src={logoIcon} alt="Escala" className="w-8 h-8 object-contain md:hidden" />
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showStoreSelector && currentStore && stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
                  <Store className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium max-w-[80px] md:max-w-[160px] truncate">
                    {currentStore.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
          )}
          
          {action}
        </div>
      </div>
    </header>
  );
}
