import { PanelLeftClose, PanelLeft, Sun, Moon, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useStore } from '@/contexts/StoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DesktopHeader() {
  const { collapsed, toggle } = useSidebarState();
  const { currentStore } = useStore();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="hidden md:flex items-center h-14 border-b border-border bg-background/90 backdrop-blur-md px-6 gap-4 sticky top-0 z-40">
      {/* Toggle sidebar */}
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-text-3 hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>

      {/* Store name */}
      <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
        {currentStore?.name || 'Precify'}
      </p>

      <div className="flex-1" />

      {/* Theme toggle pill */}
      <button
        onClick={toggleTheme}
        className="relative w-[52px] h-7 rounded-full bg-surface-2 border border-border flex items-center p-0.5 transition-colors"
        aria-label="Alternar tema"
      >
        <div
          className="absolute w-6 h-6 rounded-full bg-primary shadow-sm transition-all duration-200"
          style={{ left: theme === 'light' ? '2px' : '24px' }}
        />
        <Sun className="w-3.5 h-3.5 relative z-10 ml-[5px] text-primary-foreground" />
        <Moon className="w-3.5 h-3.5 relative z-10 ml-[9px] text-text-3" />
      </button>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold ring-2 ring-primary/20 select-none shrink-0">
        {currentStore?.name?.[0]?.toUpperCase() || 'P'}
      </div>
    </header>
  );
}
