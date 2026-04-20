import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';

const CARD_MIN_H = 'min-h-[260px]';

// ────────────────────────────────────────────────────────────────────────────
// 1. Distribuição de margem — donut SVG + 3 stat tiles
// ────────────────────────────────────────────────────────────────────────────
export function MarginDistributionChart() {
  const { currentStore, getStoreStats, calculateProduct } = useStore();
  const stats = currentStore ? getStoreStats(currentStore) : null;

  const buckets = useMemo(() => {
    if (!currentStore) return { healthy: 0, warning: 0, danger: 0, total: 0 };
    const target = currentStore.config.desiredMargin || 15;
    let healthy = 0, warning = 0, danger = 0;
    currentStore.products.forEach((p) => {
      const c = calculateProduct(p, currentStore.config);
      if (c.realMargin >= target) healthy++;
      else if (c.realMargin >= 0) warning++;
      else danger++;
    });
    return { healthy, warning, danger, total: currentStore.products.length };
  }, [currentStore, calculateProduct]);

  if (!stats || buckets.total === 0) return null;

  const { healthy, warning, danger, total } = buckets;
  const healthyPct = (healthy / total) * 100;
  const warningPct = (warning / total) * 100;
  const dangerPct = (danger / total) * 100;

  // Donut math
  const R = 38;
  const C = 2 * Math.PI * R;
  const healthyLen = (healthyPct / 100) * C;
  const warningLen = (warningPct / 100) * C;
  const dangerLen = (dangerPct / 100) * C;

  return (
    <div className={cn('surface-card p-4 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Distribuição de margem</p>
        <span className="text-[11px] text-text-3 font-mono font-mono-num">{total} itens</span>
      </div>

      <div className="flex items-center gap-4 flex-1">
        {/* Donut */}
        <div className="relative w-[96px] h-[96px] flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--surface-2))" strokeWidth="10" />
            {healthyLen > 0 && (
              <circle
                cx="50" cy="50" r={R} fill="none"
                stroke="hsl(var(--success))" strokeWidth="10"
                strokeDasharray={`${healthyLen} ${C}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            )}
            {warningLen > 0 && (
              <circle
                cx="50" cy="50" r={R} fill="none"
                stroke="hsl(var(--warning))" strokeWidth="10"
                strokeDasharray={`${warningLen} ${C}`}
                strokeDashoffset={-healthyLen}
                strokeLinecap="round"
              />
            )}
            {dangerLen > 0 && (
              <circle
                cx="50" cy="50" r={R} fill="none"
                stroke="hsl(var(--destructive))" strokeWidth="10"
                strokeDasharray={`${dangerLen} ${C}`}
                strokeDashoffset={-(healthyLen + warningLen)}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold font-mono font-mono-num text-foreground leading-none">
              {healthyPct.toFixed(0)}%
            </span>
            <span className="text-[9px] text-text-3 mt-0.5 uppercase tracking-wider">na meta</span>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <StatRow color="bg-success" label="Acima da meta" value={healthy} pct={healthyPct} />
          <StatRow color="bg-warning" label="Abaixo da meta" value={warning} pct={warningPct} />
          <StatRow color="bg-destructive" label="No prejuízo" value={danger} pct={dangerPct} />
        </div>
      </div>
    </div>
  );
}

function StatRow({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', color)} />
      <span className="text-[11px] text-text-2 flex-1 truncate">{label}</span>
      <span className="text-xs font-mono font-bold text-foreground font-mono-num">{value}</span>
      <span className="text-[10px] text-text-3 font-mono-num w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Top 5 margens — lista vertical custom (sem Recharts)
// ────────────────────────────────────────────────────────────────────────────
export function TopProductsChart() {
  const { currentStore, calculateProduct } = useStore();

  const data = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    return currentStore.products
      .map((p) => {
        const c = calculateProduct(p, currentStore.config);
        return { name: p.name, margin: c.realMargin };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);
  }, [currentStore, calculateProduct]);

  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => Math.abs(d.margin)), 1);
  const best = data[0];

  return (
    <div className={cn('surface-card p-4 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Top 5 margens</p>
        <span className="text-[11px] text-success font-mono font-bold font-mono-num">
          {best.margin.toFixed(1)}%
        </span>
      </div>

      <ul className="flex-1 space-y-2">
        {data.map((d, i) => {
          const widthPct = Math.max(4, (Math.abs(d.margin) / max) * 100);
          const positive = d.margin >= 0;
          return (
            <li key={i} className="group">
              <div className="flex items-baseline gap-2 mb-1">
                <span className={cn(
                  'text-[10px] font-mono font-bold w-4 flex-shrink-0',
                  i === 0 ? 'text-success' : 'text-text-3',
                )}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="text-[11px] text-text-2 flex-1 truncate group-hover:text-foreground transition-colors"
                  title={d.name}
                >
                  {d.name}
                </span>
                <span className={cn(
                  'text-xs font-mono font-bold font-mono-num flex-shrink-0',
                  positive ? 'text-success' : 'text-destructive',
                )}>
                  {d.margin.toFixed(1)}%
                </span>
              </div>
              <div className="ml-6 h-1 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    positive ? 'bg-success' : 'bg-destructive',
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Saúde financeira — stat card com 4 métricas
// ────────────────────────────────────────────────────────────────────────────
export function ProfitSummaryChart() {
  const { currentStore, calculateProduct } = useStore();

  const metrics = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return null;
    const profits = currentStore.products.map((p) => calculateProduct(p, currentStore.config).netProfit);
    const total = profits.reduce((a, b) => a + b, 0);
    const avg = total / profits.length;
    const sorted = [...profits].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const profitable = profits.filter((p) => p > 0).length;
    const profitablePct = (profitable / profits.length) * 100;
    return { total, avg, median, profitable, profitablePct, count: profits.length };
  }, [currentStore, calculateProduct]);

  if (!metrics) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const totalPositive = metrics.total >= 0;

  return (
    <div className={cn('surface-card p-4 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Saúde financeira</p>
        <Activity className="w-3.5 h-3.5 text-text-3" />
      </div>

      {/* Big total */}
      <div className="mb-3">
        <p className="text-[10px] text-text-3 uppercase tracking-wider mb-0.5">Lucro consolidado</p>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            'text-2xl font-mono font-bold font-mono-num leading-none',
            totalPositive ? 'text-success' : 'text-destructive',
          )}>
            {fmt(metrics.total)}
          </span>
          {totalPositive ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
        </div>
        <p className="text-[10px] text-text-3 mt-1">soma de {metrics.count} produtos</p>
      </div>

      {/* 3 mini stats */}
      <div className="grid grid-cols-3 gap-2 flex-1 content-end">
        <MiniStat label="Médio" value={fmt(metrics.avg)} positive={metrics.avg >= 0} />
        <MiniStat label="Mediana" value={fmt(metrics.median)} positive={metrics.median >= 0} />
        <MiniStat
          label="Lucrativos"
          value={`${metrics.profitablePct.toFixed(0)}%`}
          positive={metrics.profitablePct >= 50}
          sub={`${metrics.profitable}/${metrics.count}`}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  positive,
  sub,
}: {
  label: string;
  value: string;
  positive: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-surface-2/60 rounded-lg p-2 border border-border/50">
      <p className="text-[9px] text-text-3 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn(
        'text-xs font-mono font-bold font-mono-num leading-tight truncate',
        positive ? 'text-foreground' : 'text-destructive',
      )}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-text-3 font-mono-num mt-0.5">{sub}</p>}
    </div>
  );
}
