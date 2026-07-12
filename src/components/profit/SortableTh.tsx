import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { ReactNode } from 'react';
import type { SortDir } from './useTableSort';

interface Props {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
  className?: string;
  children: ReactNode;
}

export function SortableTh({ active, dir, onClick, align = 'left', className = '', children }: Props) {
  const Icon = active && dir === 'asc' ? ArrowUp : active && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className={`p-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
          active ? 'text-foreground font-medium' : 'text-text-3'
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        <span>{children}</span>
        <Icon className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-40'}`} />
      </button>
    </th>
  );
}
