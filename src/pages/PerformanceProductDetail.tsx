import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Package, DollarSign, TrendingUp, BarChart3, Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import { PageLoader } from '@/components/layout/PageStates';

export default function PerformanceProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data, loading } = usePerformanceData();

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  const product = itemId && data?.product_sales?.[itemId];

  if (!product) {
    return (
      <AppLayout>
        <PageHeader title="Produto não encontrado" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-muted-foreground text-sm">Este produto não foi encontrado nos dados sincronizados.</p>
          <Button variant="outline" onClick={() => navigate('/performance')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalRevenue = data!.summary.total_revenue;
  const totalQty = Object.values(data!.product_sales).reduce((s, p) => s + p.total_qty, 0);
  const periodDays = data!.summary.period_days || 90;
  const ticketMedio = product.total_qty > 0 ? product.total_revenue / product.total_qty : 0;
  const unDia = periodDays > 0 ? product.total_qty / periodDays : 0;
  const pctRevenue = totalRevenue > 0 ? (product.total_revenue / totalRevenue) * 100 : 0;
  const pctQty = totalQty > 0 ? (product.total_qty / totalQty) * 100 : 0;

  const sortedVariants = Object.entries(product.variants || {}).sort(([, a], [, b]) => b.qty - a.qty);
  const topVariant = sortedVariants[0];

  const meta = product as any;

  return (
    <AppLayout>
      <div className="pb-24 md:pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/performance')} className="mt-1 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4">
              {meta.image_url && (
                <img src={meta.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-foreground truncate">{product.name}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {itemId}</p>
                {meta.item_status && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    meta.item_status === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {meta.item_status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
            <a href={`https://shopee.com.br/product-i.${itemId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Ver na Shopee
            </a>
          </Button>
        </div>

        {/* Engagement Metrics (from API enrichment) */}
        {(meta.likes != null || meta.views != null || meta.sales != null) && (
          <div className="grid grid-cols-3 gap-3">
            {meta.views != null && (
              <MetricCard icon={<Eye className="w-5 h-5" />} iconColor="text-blue-500" borderColor="border-t-blue-500" label="Visualizações" value={String(meta.views)} />
            )}
            {meta.likes != null && (
              <MetricCard icon={<Heart className="w-5 h-5" />} iconColor="text-rose-500" borderColor="border-t-rose-500" label="Curtidas" value={String(meta.likes)} />
            )}
            {meta.sales != null && (
              <MetricCard icon={<ShoppingBag className="w-5 h-5" />} iconColor="text-primary" borderColor="border-t-primary" label="Vendas (total)" value={String(meta.sales)} />
            )}
          </div>
        )}

        {/* Sales Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={<Package className="w-5 h-5" />} iconColor="text-primary" borderColor="border-t-primary" label="Unidades" value={String(product.total_qty)} sub={`${pctQty.toFixed(1)}% do total`} />
          <MetricCard icon={<DollarSign className="w-5 h-5" />} iconColor="text-emerald-500" borderColor="border-t-emerald-500" label="Receita" value={`R$ ${product.total_revenue.toFixed(2)}`} sub={`${pctRevenue.toFixed(1)}% do total`} />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} iconColor="text-blue-500" borderColor="border-t-blue-500" label="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} sub="por unidade" />
          <MetricCard icon={<BarChart3 className="w-5 h-5" />} iconColor="text-orange-500" borderColor="border-t-orange-500" label="Un/dia" value={unDia.toFixed(1)} sub="média no período" />
        </div>

        {/* Share Bars */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Participação no Total</p>
          <ShareBar label="% Vendas (qty)" pct={pctQty} color="bg-primary" />
          <ShareBar label="% Receita" pct={pctRevenue} color="bg-emerald-500" />
        </div>

        {/* Variants Table */}
        {sortedVariants.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Variações ({sortedVariants.length})
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">#</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Variação</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Qtd</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Receita</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">% Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVariants.map(([varName, v], i) => {
                    const varPct = product.total_qty > 0 ? (v.qty / product.total_qty) * 100 : 0;
                    return (
                      <tr key={varName} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-2.5">
                          {i === 0 && sortedVariants.length > 1 ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <span className="text-muted-foreground text-xs">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{varName}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{v.qty}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">R$ {v.revenue.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(varPct, 100)}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-10 text-right">{varPct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {sortedVariants.map(([varName, v], i) => {
                const varPct = product.total_qty > 0 ? (v.qty / product.total_qty) * 100 : 0;
                const isTop = i === 0 && sortedVariants.length > 1;
                return (
                  <div key={varName} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isTop && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className="text-sm text-foreground truncate">{varName}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span>{v.qty} un.</span>
                      <span className="font-semibold text-foreground">R$ {v.revenue.toFixed(2)}</span>
                      <span className="font-mono">{varPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insight */}
        {topVariant && sortedVariants.length > 1 && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>{topVariant[0]}</strong> representa{' '}
              <strong>{((topVariant[1].qty / product.total_qty) * 100).toFixed(0)}%</strong> das vendas deste produto.
              {topVariant[1].qty / product.total_qty > 0.7 && (
                <> Considere manter mais estoque desta variação.</>
              )}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MetricCard({ icon, iconColor, borderColor, label, value, sub }: {
  icon: React.ReactNode; iconColor: string; borderColor: string;
  label: string; value: string; sub?: string;
}) {
  return (
    <div className={`rounded-xl border border-border border-t-2 ${borderColor} bg-card p-4 text-center`}>
      <div className={`${iconColor} flex justify-center mb-1`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-foreground font-mono mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ShareBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono font-bold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
