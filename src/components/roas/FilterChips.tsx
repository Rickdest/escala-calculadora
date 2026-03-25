import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { FilterType } from './adsHelpers';

export function FilterChips({ filter, setFilter, data }: { filter: FilterType; setFilter: (f: FilterType) => void; data: EnrichedAdsData[] }) {
  const linked = data.filter(d => !!d.product_id);
  const unlinked = data.filter(d => !d.product_id).length;

  const allFilters: Array<{ key: FilterType; label: string; icon: string; count: number }> = [
    { key: 'all', label: 'Todos', icon: '📊', count: data.length },
    { key: 'LUCRATIVO', label: 'Lucro', icon: '✅', count: linked.filter(d => d.classificacao === 'LUCRATIVO').length },
    { key: 'ABAIXO_EMPATE', label: 'Alerta', icon: '⚠️', count: linked.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA').length },
    { key: 'PREJUIZO', label: 'Perda', icon: '🔴', count: linked.filter(d => d.classificacao === 'PREJUIZO').length },
    { key: 'unlinked', label: 'Pendentes', icon: '🔗', count: unlinked },
  ];

  const mobileFilters = allFilters.filter(f => f.key === 'all' || f.count > 0);

  return (
    <>
      {/* Mobile: scroll horizontal, esconde chips vazios */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide md:hidden -mx-4 px-4 pb-1">
        {mobileFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            {f.icon} {f.label} {f.count}
          </button>
        ))}
      </div>

      {/* Desktop: todos visíveis, vazios apagados */}
      <div className="hidden md:flex gap-2">
        {allFilters.map(f => (
          <button
            key={f.key}
            onClick={() => (f.count > 0 || f.key === 'all') ? setFilter(f.key) : undefined}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : f.count === 0 && f.key !== 'all'
                  ? 'text-muted-foreground/30 cursor-default bg-card/50 border border-border/30'
                  : 'text-muted-foreground hover:text-foreground bg-card border border-border hover:border-primary/30 cursor-pointer'
            )}
          >
            {f.icon} {f.label} <span className="ml-1 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>
    </>
  );
}
