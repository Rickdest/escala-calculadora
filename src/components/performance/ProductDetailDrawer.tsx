import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, DollarSign, Star, BarChart3 } from 'lucide-react';

interface ProductData {
  name: string;
  total_qty: number;
  total_revenue: number;
  variants: Record<string, { qty: number; revenue: number }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData | null;
  itemId: string;
  totalRevenue: number;
  totalQty: number;
  periodDays: number;
}

export function ProductDetailDrawer({ open, onOpenChange, product, itemId, totalRevenue, totalQty, periodDays }: Props) {
  if (!product) return null;

  const sortedVariants = Object.entries(product.variants).sort(([, a], [, b]) => b.qty - a.qty);
  const topVariant = sortedVariants[0];
  const ticketMedio = product.total_qty > 0 ? product.total_revenue / product.total_qty : 0;
  const unDia = periodDays > 0 ? product.total_qty / periodDays : 0;
  const pctRevenue = totalRevenue > 0 ? (product.total_revenue / totalRevenue) * 100 : 0;
  const pctQty = totalQty > 0 ? (product.total_qty / totalQty) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold leading-tight pr-6">{product.name}</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">ID: {itemId}</p>
        </DialogHeader>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <MetricCard icon={<Package className="w-4 h-4 text-primary" />} label="Unidades" value={`${product.total_qty}`} />
          <MetricCard icon={<DollarSign className="w-4 h-4 text-emerald-500" />} label="Receita" value={`R$ ${product.total_revenue.toFixed(2)}`} />
          <MetricCard icon={<TrendingUp className="w-4 h-4 text-blue-500" />} label="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
          <MetricCard icon={<BarChart3 className="w-4 h-4 text-orange-500" />} label="Un/dia" value={unDia.toFixed(1)} />
        </div>

        {/* Share Bars */}
        <div className="space-y-2 mt-4">
          <p className="text-xs font-bold text-foreground">Participação no Total</p>
          <ShareBar label="% Vendas" pct={pctQty} color="bg-primary" />
          <ShareBar label="% Receita" pct={pctRevenue} color="bg-emerald-500" />
        </div>

        {/* Variants */}
        {sortedVariants.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-foreground">Variações ({sortedVariants.length})</p>
            {sortedVariants.map(([varName, v], i) => {
              const isTop = i === 0 && sortedVariants.length > 1;
              return (
                <div key={varName} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isTop && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    <span className="text-xs text-foreground truncate">{varName}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground flex-shrink-0">
                    <span>{v.qty} un.</span>
                    {v.revenue > 0 && <span className="font-semibold text-foreground">R$ {v.revenue.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Insight */}
        {topVariant && sortedVariants.length > 1 && (
          <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>{topVariant[0]}</strong> representa{' '}
              <strong>{((topVariant[1].qty / product.total_qty) * 100).toFixed(0)}%</strong> das vendas deste produto.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground font-mono">{value}</p>
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
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
