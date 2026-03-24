import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { FilterType } from './adsHelpers';

export function FilterChips({ filter, setFilter, data }: { filter: FilterType; setFilter: (f: FilterType) => void; data: EnrichedAdsData[] }) {
  const linked = data.filter(d => !!d.product_id);
  const unlinked = data.filter(d => !d.product_id).length;

  const chips: Array<{ key: FilterType; label: string; icon: string; count: number }> = [
    { key: 'all', label: 'Todos', icon: '', count: data.length },
    { key: 'LUCRATIVO', label: 'Lucrativos', icon: '✅', count: linked.filter(d => d.classificacao === 'LUCRATIVO').length },
    { key: 'ABAIXO_EMPATE', label: 'Atenção', icon: '🟠', count: linked.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA').length },
    { key: 'PREJUIZO', label: 'Prejuízo', icon: '🔴', count: linked.filter(d => d.classificacao === 'PREJUIZO').length },
    ...(unlinked > 0 ? [{ key: 'unlinked' as FilterType, label: 'Não vinculados', icon: '❓', count: unlinked }] : []),
  ];

  return (
    <div className="flex gap-1.5 p-1.5 bg-surface-2/50 rounded-xl">
      {chips.map(c => (
        <button
          key={c.key}
          onClick={() => setFilter(c.key)}
          className={cn(
            'px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
            filter === c.key
              ? 'bg-card shadow-sm text-foreground border border-border'
              : 'text-text-3 hover:text-foreground'
          )}
        >
          {c.icon && <span>{c.icon}</span>}
          <span>{c.label}</span>
          <span className="text-xs opacity-50">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
