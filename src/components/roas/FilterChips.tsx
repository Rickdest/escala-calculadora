import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { FilterType } from './adsHelpers';
import { Link2 } from 'lucide-react';

const filterStyles: Record<FilterType, { activeBg: string; activeText: string }> = {
  all: { activeBg: 'bg-primary text-primary-foreground', activeText: 'text-primary-foreground' },
  LUCRATIVO: { activeBg: 'bg-success/15 text-success border-success/30', activeText: 'text-success' },
  ABAIXO_EMPATE: { activeBg: 'bg-warning/15 text-warning border-warning/30', activeText: 'text-warning' },
  MARGEM_APERTADA: { activeBg: 'bg-warning/15 text-warning border-warning/30', activeText: 'text-warning' },
  PREJUIZO: { activeBg: 'bg-destructive/15 text-destructive border-destructive/30', activeText: 'text-destructive' },
  unlinked: { activeBg: 'bg-surface-2 text-foreground border-border', activeText: 'text-foreground' },
};

export function FilterChips({ filter, setFilter, data }: { filter: FilterType; setFilter: (f: FilterType) => void; data: EnrichedAdsData[] }) {
  const linked = data.filter(d => !!d.product_id);
  const unlinked = data.filter(d => !d.product_id).length;

  const allFilters: Array<{ key: FilterType; label: string; dot: string | null; count: number; icon?: React.ReactNode }> = [
    { key: 'all', label: 'Todos', dot: null, count: data.length },
    { key: 'LUCRATIVO', label: 'Lucrativos', dot: 'bg-success', count: linked.filter(d => d.classificacao === 'LUCRATIVO').length },
    { key: 'ABAIXO_EMPATE', label: 'Atenção', dot: 'bg-warning', count: linked.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA').length },
    { key: 'PREJUIZO', label: 'Prejuízo', dot: 'bg-destructive', count: linked.filter(d => d.classificacao === 'PREJUIZO').length },
    { key: 'unlinked', label: 'Pendentes', dot: null, count: unlinked, icon: <Link2 className="w-3 h-3" /> },
  ];

  const visibleFilters = allFilters.filter(f => f.key === 'all' || f.count > 0);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0">
      {visibleFilters.map(f => {
        const style = filterStyles[f.key];
        const isActive = filter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5',
              isActive
                ? style.activeBg
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {f.dot && <span className={cn('w-2 h-2 rounded-full inline-block', f.dot)} />}
            {f.icon}
            {f.label}
            <span className="opacity-50">({f.count})</span>
          </button>
        );
      })}
    </div>
  );
}
