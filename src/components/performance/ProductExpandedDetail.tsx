import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, DollarSign, Star, BarChart3 } from 'lucide-react';

interface ProductData {
  name: string;
  total_qty: number;
  total_revenue: number;
  variants: Record<string, { qty: number; revenue: number }>;
}

interface Props {
  product: ProductData;
  totalRevenue: number;
  totalQty: number;
  periodDays: number;
}

export function ProductExpandedDetail({ product, totalRevenue, totalQty, periodDays }: Props) {
  const sortedVariants = Object.entries(product.variants).sort(([, a], [, b]) => b.qty - a.qty);
  const topVariant = sortedVariants[0];
  const ticketMedio = product.total_qty > 0 ? product.total_revenue / product.total_qty : 0;
  const unDia = periodDays > 0 ? product.total_qty / periodDays : 0;
  const pctRevenue = totalRevenue > 0 ? (product.total_revenue / totalRevenue) * 100 : 0;
  const pctQty = totalQty > 0 ? (product.total_qty / totalQty) * 100 : 0;

  return (
    <div className="px-3 pb-3 pt-1 space-y-3 animate-fade-up">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniMetric icon={<Package className="w-3.5 h-3.5 text-primary" />} label="Unidades" value={`${product.total_qty}`} />
        <MiniMetric icon={<DollarSign className="w-3.5 h-3.5 text-emerald-500" />} label="Receita" value={`R$ ${product.total_revenue.toFixed(2)}`} />
        <MiniMetric icon={<TrendingUp className="w-3.5 h-3.5 text-blue-500" />} label="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
        <MiniMetric icon={<BarChart3 className="w-3.5 h-3.5 text-orange-500" />} label="Un/dia" value={unDia.toFixed(1)} />
      </div>

      {/* Share Bars */}
      <div className="space-y-1.5">
        <ShareBar label="% Vendas" pct={pctQty} color="bg-primary" />
        <ShareBar label="% Receita" pct={pctRevenue} color="bg-emerald-500" />
      </div>

      {/* Variants */}
      {sortedVariants.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Variações ({sortedVariants.length})</p>
          <div className="grid gap-1.5">
            {sortedVariants.map(([varName, v], i) => {
              const isTop = i === 0 && sortedVariants.length > 1;
              return (
                <div key={varName} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isTop && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span className="text-xs text-foreground truncate">{varName}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] text-muted-foreground flex-shrink-0">
                    <span>{v.qty} un.</span>
                    {v.revenue > 0 && <span className="font-semibold text-foreground">R$ {v.revenue.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insight */}
      {topVariant && sortedVariants.length > 1 && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
          <p className="text-[11px] text-muted-foreground">
            💡 <strong>{topVariant[0]}</strong> representa{' '}
            <strong>{((topVariant[1].qty / product.total_qty) * 100).toFixed(0)}%</strong> das vendas deste produto.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
      <div className="flex justify-center mb-0.5">{icon}</div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-bold text-foreground font-mono">{value}</p>
    </div>
  );
}

function ShareBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>{label}</span>
        <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
