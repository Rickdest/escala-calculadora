import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';

export function MarginDistributionChart() {
  const { currentStore, getStoreStats } = useStore();
  const stats = currentStore ? getStoreStats(currentStore) : null;
  if (!stats || stats.totalProducts === 0) return null;

  const total = stats.totalProducts;
  const above = stats.productsAboveTarget;
  const below = stats.productsBelowTarget;
  const abovePct = total > 0 ? (above / total) * 100 : 0;
  const belowPct = 100 - abovePct;

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Distribuição de Margem</p>
        <span className="text-[11px] text-text-3 font-mono font-mono-num">{total} itens</span>
      </div>

      <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-2">
        {abovePct > 0 && (
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${abovePct}%` }}
            title={`Acima da meta: ${above}`}
          />
        )}
        {belowPct > 0 && (
          <div
            className="h-full bg-destructive transition-all"
            style={{ width: `${belowPct}%` }}
            title={`Abaixo da meta: ${below}`}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-text-2">Acima</span>
          <span className="font-mono font-bold text-foreground font-mono-num">{above}</span>
          <span className="text-text-3 font-mono-num">({abovePct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-text-2">Abaixo</span>
          <span className="font-mono font-bold text-foreground font-mono-num">{below}</span>
          <span className="text-text-3 font-mono-num">({belowPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

export function TopProductsChart() {
  const { currentStore, calculateProduct } = useStore();
  
  const data = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    return currentStore.products
      .map(p => {
        const c = calculateProduct(p, currentStore.config);
        return {
          name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
          margem: parseFloat(c.realMargin.toFixed(1)),
        };
      })
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 5);
  }, [currentStore, calculateProduct]);

  if (data.length === 0) return null;

  const best = data[0]?.margem ?? 0;

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Top 5 Margens</p>
        <span className="text-[11px] text-success font-mono font-bold font-mono-num">{best.toFixed(1)}%</span>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--surface-2))' }}
              formatter={(value: number) => [`${value}%`, 'Margem']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.margem >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfitSummaryChart() {
  const { currentStore, calculateProduct } = useStore();
  
  const data = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    return currentStore.products
      .map(p => {
        const calc = calculateProduct(p, currentStore.config);
        return {
          name: p.name.length > 10 ? p.name.substring(0, 10) + '…' : p.name,
          lucro: parseFloat(calc.netProfit.toFixed(2)),
        };
      })
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 6);
  }, [currentStore, calculateProduct]);

  if (data.length === 0) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const totalProfit = data.reduce((sum, d) => sum + d.lucro, 0);

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Lucro por Produto</p>
        <span className={cn('text-[11px] font-mono font-bold font-mono-num', totalProfit >= 0 ? 'text-success' : 'text-destructive')}>
          {formatCurrency(totalProfit)}
        </span>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={42}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatCurrency(v)} width={50} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--surface-2))' }}
              formatter={(value: number) => [formatCurrency(value), 'Lucro']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.lucro >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
