import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Crown, Medal, Award } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';

const CARD_MIN_H = 'min-h-[300px]';

// ────────────────────────────────────────────────────────────────────────────
// 1. Distribuição de margem — donut SVG grande + 3 pílulas semânticas
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
  const target = currentStore?.config.desiredMargin || 15;
  const healthyPct = (healthy / total) * 100;
  const warningPct = (warning / total) * 100;
  const dangerPct = (danger / total) * 100;

  // Donut math — bigger
  const R = 52;
  const C = 2 * Math.PI * R;
  const healthyLen = (healthyPct / 100) * C;
  const warningLen = (warningPct / 100) * C;
  const dangerLen = (dangerPct / 100) * C;

  return (
    <div className={cn('surface-card p-5 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Distribuição de margem</p>
        <span className="text-[11px] text-text-3 font-mono font-mono-num">{total} itens</span>
      </div>

      <div className="flex flex-col items-center flex-1 justify-between gap-4">
        {/* Donut grande centralizado */}
        <div className="relative w-[128px] h-[128px] flex-shrink-0">
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="hsl(var(--surface-2))" strokeWidth="12" />
            {healthyLen > 0 && (
              <circle
                cx="64" cy="64" r={R} fill="none"
                stroke="hsl(var(--success))" strokeWidth="12"
                strokeDasharray={`${healthyLen} ${C}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            )}
            {warningLen > 0 && (
              <circle
                cx="64" cy="64" r={R} fill="none"
                stroke="hsl(var(--warning))" strokeWidth="12"
                strokeDasharray={`${warningLen} ${C}`}
                strokeDashoffset={-healthyLen}
                strokeLinecap="round"
              />
            )}
            {dangerLen > 0 && (
              <circle
                cx="64" cy="64" r={R} fill="none"
                stroke="hsl(var(--destructive))" strokeWidth="12"
                strokeDasharray={`${dangerLen} ${C}`}
                strokeDashoffset={-(healthyLen + warningLen)}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono font-mono-num text-foreground leading-none">
              {healthyPct.toFixed(0)}%
            </span>
            <span className="text-[10px] text-text-3 mt-1 uppercase tracking-wider">na meta</span>
          </div>
        </div>

        {/* 3 Pílulas semânticas */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <PillStat tone="success" value={healthy} label="acima" />
          <PillStat tone="warning" value={warning} label="abaixo" />
          <PillStat tone="destructive" value={danger} label="prejuízo" />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] text-text-3 uppercase tracking-wider">Meta</span>
        <span className="text-xs font-mono font-bold font-mono-num text-foreground">{target}%</span>
      </div>
    </div>
  );
}

function PillStat({ tone, value, label }: { tone: 'success' | 'warning' | 'destructive'; value: number; label: string }) {
  const toneClasses = {
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
  }[tone];

  return (
    <div className={cn('rounded-lg border px-2 py-1.5 flex flex-col items-center', toneClasses)}>
      <span className="text-base font-bold font-mono font-mono-num leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-wider mt-1 opacity-80">{label}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Top 5 margens — lista vertical com rank badges
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
    <div className={cn('surface-card p-5 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Top 5 margens</p>
        <span className="text-[11px] text-success font-mono font-bold font-mono-num">
          {best.margin.toFixed(1)}%
        </span>
      </div>

      <ul className="flex-1 flex flex-col justify-between gap-1">
        {data.map((d, i) => {
          const widthPct = Math.max(6, (Math.abs(d.margin) / max) * 100);
          const positive = d.margin >= 0;
          return (
            <li
              key={i}
              className={cn(
                'group py-1.5',
                i < data.length - 1 && 'border-b border-border/30',
              )}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <RankBadge position={i + 1} />
                <span
                  className="text-xs text-text-1 flex-1 truncate group-hover:text-foreground transition-colors leading-snug"
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
              <div className="ml-7 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    positive
                      ? 'bg-gradient-to-r from-success to-success/60'
                      : 'bg-gradient-to-r from-destructive to-destructive/60',
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

function RankBadge({ position }: { position: number }) {
  const config = {
    1: { bg: 'bg-warning/15 border-warning/30 text-warning', icon: Crown },
    2: { bg: 'bg-text-3/15 border-text-3/30 text-text-1', icon: Medal },
    3: { bg: 'bg-warning/10 border-warning/20 text-warning/80', icon: Award },
  }[position];

  if (config) {
    const Icon = config.icon;
    return (
      <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className="w-2.5 h-2.5" />
      </div>
    );
  }

  return (
    <div className="w-5 h-5 rounded-full border border-border bg-surface-2 flex items-center justify-center flex-shrink-0">
      <span className="text-[9px] font-mono font-bold text-text-3">{position}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Saúde financeira — lucro consolidado + 2 colunas de stats
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
    <div className={cn('surface-card p-5 flex flex-col', CARD_MIN_H)}>
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Saúde financeira</p>
        <Activity className="w-3.5 h-3.5 text-text-3" />
      </div>

      {/* Lucro consolidado — destaque */}
      <div className="mb-5">
        <p className="text-[10px] text-text-3 uppercase tracking-wider mb-1.5">Lucro consolidado</p>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            'text-3xl font-mono font-bold font-mono-num leading-none',
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
        <p className="text-[10px] text-text-3 mt-1.5">soma de {metrics.count} produtos</p>
      </div>

      {/* Médio + Mediana lado a lado */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-[9px] text-text-3 uppercase tracking-wider mb-1">Médio</p>
          <p className={cn(
            'text-sm font-mono font-bold font-mono-num leading-tight',
            metrics.avg >= 0 ? 'text-foreground' : 'text-destructive',
          )}>
            {fmt(metrics.avg)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-text-3 uppercase tracking-wider mb-1">Mediana</p>
          <p className={cn(
            'text-sm font-mono font-bold font-mono-num leading-tight',
            metrics.median >= 0 ? 'text-foreground' : 'text-destructive',
          )}>
            {fmt(metrics.median)}
          </p>
        </div>
      </div>

      {/* % Lucrativos com barra de progresso */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[9px] text-text-3 uppercase tracking-wider">Produtos lucrativos</p>
          <span className="text-[10px] text-text-3 font-mono font-mono-num">
            {metrics.profitable}/{metrics.count}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                metrics.profitablePct >= 70
                  ? 'bg-gradient-to-r from-success to-success/70'
                  : metrics.profitablePct >= 40
                  ? 'bg-gradient-to-r from-warning to-warning/70'
                  : 'bg-gradient-to-r from-destructive to-destructive/70',
              )}
              style={{ width: `${Math.max(2, metrics.profitablePct)}%` }}
            />
          </div>
          <span className={cn(
            'text-sm font-mono font-bold font-mono-num flex-shrink-0',
            metrics.profitablePct >= 50 ? 'text-success' : 'text-destructive',
          )}>
            {metrics.profitablePct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
