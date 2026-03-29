import { ChevronDown, Store } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
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
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3.5 safe-top md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-display text-foreground md:text-2xl">{title}</h1>
            {subtitle && (
              <p className="text-small text-text-2 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showStoreSelector && currentStore && stores.length > 0 && (
            <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-primary/30 transition-colors">
                  <span className="text-body text-text-2 max-w-[80px] md:max-w-[160px] truncate">
                    {currentStore.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-text-3" />
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
            </div>
          )}
          
          {action}
        </div>
      </div>
    </header>
  );
}
