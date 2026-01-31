import { ChevronDown, Store, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/30 px-4 py-4 safe-top">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 ml-7">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showStoreSelector && currentStore && stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
                  <Store className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium max-w-[80px] truncate">
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
