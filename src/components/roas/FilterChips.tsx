import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { FilterType } from './adsHelpers';

const filterStyles: Record<FilterType, { activeBg: string; activeText: string }> = {
  all: { activeBg: 'bg-primary text-primary-foreground', activeText: 'text-primary-foreground' },
  LUCRATIVO: { activeBg: 'bg-success/15 text-success border-success/30', activeText: 'text-success' },
  ABAIXO_EMPATE: { activeBg: 'bg-warning/15 text-warning border-warning/30', activeText: 'text-warning' },
  MARGEM_APERTADA: { activeBg: 'bg-warning/15 text-warning border-warning/30', activeText: 'text-warning' },
  PREJUIZO: { activeBg: 'bg-destructive/15 text-destructive border-destructive/30', activeText: 'text-destructive' },
  unlinked: { activeBg: 'bg-surface-2 text-text-2 border-border', activeText: 'text-text-2' },
};

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
      {/* Mobile: scroll horizontal */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide md:hidden -mx-4 px-4 pb-1">
        {mobileFilters.map(f => {
          const style = filterStyles[f.key];
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border',
                isActive
                  ? style.activeBg
                  : 'bg-card border-border text-text-3 hover:text-foreground'
              )}
            >
              {f.icon} {f.label} <span className="opacity-60">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: segmented controls */}
      <div className="hidden md:flex gap-1.5 bg-surface-2 p-1 rounded-xl">
        {allFilters.map(f => {
          const style = filterStyles[f.key];
          const isActive = filter === f.key;
          const isDisabled = f.count === 0 && f.key !== 'all';
          return (
            <button
              key={f.key}
              onClick={() => !isDisabled ? setFilter(f.key) : undefined}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                isActive
                  ? cn(style.activeBg, 'shadow-sm')
                  : isDisabled
                    ? 'text-text-3/30 cursor-default'
                    : 'text-text-3 hover:text-foreground hover:bg-card/50 cursor-pointer'
              )}
            >
              {f.icon} {f.label} <span className="ml-0.5 opacity-50">{f.count}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
