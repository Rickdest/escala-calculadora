import { ChevronDown, Plus, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 safe-top md:hidden overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-display text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showStoreSelector && currentStore && stores.length > 0 && (
            <div className="md:hidden flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/80 hover:border-primary/30 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-body text-foreground/70 max-w-[80px] truncate">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-primary"
                  onClick={() => navigate('/stores')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar loja
                </DropdownMenuItem>
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
