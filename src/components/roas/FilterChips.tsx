import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { FilterType } from './adsHelpers';

export function FilterChips({ filter, setFilter, data }: { filter: FilterType; setFilter: (f: FilterType) => void; data: EnrichedAdsData[] }) {
  const unlinked = data.filter(d => !d.product_id).length;
  const chips: Array<{ key: FilterType; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'LUCRATIVO', label: '✅ Lucrativos' },
    { key: 'ABAIXO_EMPATE', label: '🟠 Atenção' },
    { key: 'PREJUIZO', label: '🔴 Prejuízo' },
    ...(unlinked > 0 ? [{ key: 'unlinked' as FilterType, label: `❓ Não vinculados (${unlinked})` }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(c => (
        <button
          key={c.key}
          onClick={() => setFilter(c.key)}
          className={cn(
            'px-3.5 py-2 rounded-full text-xs font-bold transition-colors border',
            filter === c.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-text-2 border-border hover:border-primary/30'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
