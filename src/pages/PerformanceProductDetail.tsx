import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useApiAdsData } from '@/hooks/useApiAdsData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Package, DollarSign, TrendingUp, BarChart3, Star, MessageSquare, Weight, Truck, Eye, Heart, ShoppingCart, Megaphone } from 'lucide-react';
import { PageLoader } from '@/components/layout/PageStates';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PerformanceProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data, loading } = usePerformanceData();
  const { data: adsRows } = useApiAdsData();
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const product = !loading && itemId ? data?.product_sales?.[itemId] || null : null;
  const totalRevenue = data?.summary?.total_revenue || 0;
  const totalQty = data ? Object.values(data.product_sales).reduce((s, p) => s + p.total_qty, 0) : 0;
  const periodDays = data?.summary?.period_days || 90;
  const ticketMedio = product && product.total_qty > 0 ? product.total_revenue / product.total_qty : 0;
  const unDia = product && periodDays > 0 ? product.total_qty / periodDays : 0;
  const pctRevenue = product && totalRevenue > 0 ? (product.total_revenue / totalRevenue) * 100 : 0;
  const pctQty = product && totalQty > 0 ? (product.total_qty / totalQty) * 100 : 0;
  const sortedVariants = product ? Object.entries(product.variants || {}).sort(([, a], [, b]) => b.qty - a.qty) : [];
  const topVariant = sortedVariants[0] || null;
  const bottomVariant = sortedVariants.length > 1 ? sortedVariants[sortedVariants.length - 1] : null;

  // Cross-reference Ads data
  const adsForProduct = useMemo(() => {
    if (!adsRows || !itemId) return null;
    const matching = adsRows.filter((r: any) => String(r.item_id) === itemId);
    if (matching.length === 0) return null;
    return {
      expense: matching.reduce((s: number, r: any) => s + Number(r.expense || 0), 0),
      gmv: matching.reduce((s: number, r: any) => s + Number(r.gmv || 0), 0),
      clicks: matching.reduce((s: number, r: any) => s + Number(r.clicks || 0), 0),
      impressions: matching.reduce((s: number, r: any) => s + Number(r.impressions || 0), 0),
      orders: matching.reduce((s: number, r: any) => s + Number(r.orders || 0), 0),
      roas: 0,
      ctr: 0,
      cost_per_order: 0,
      status: matching.find((r: any) => r.status === 'active')?.status || matching[0]?.status || 'ended',
    };
  }, [adsRows, itemId]);

  if (adsForProduct) {
    adsForProduct.roas = adsForProduct.expense > 0 ? adsForProduct.gmv / adsForProduct.expense : 0;
    adsForProduct.ctr = adsForProduct.impressions > 0 ? (adsForProduct.clicks / adsForProduct.impressions) * 100 : 0;
    adsForProduct.cost_per_order = adsForProduct.orders > 0 ? adsForProduct.expense / adsForProduct.orders : 0;
  }

  // Daily chart data (real or simulated)
  const dailyData = useMemo(() => {
    if (!product) return [];
    const days = chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 90;
    const today = new Date();

    if (product.daily_sales && Object.keys(product.daily_sales).length > 0) {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const label = `${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}`;
        return { label, value: product.daily_sales![dateStr] || 0 };
      });
    }

    const avgPerDay = product.total_qty / (periodDays || 90);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      const label = `${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}`;
      const trend = 0.5 + (i / days) * 1.0;
      const noise = 0.7 + Math.random() * 0.6;
      return { label, value: Math.max(0, Math.round(avgPerDay * trend * noise)) };
    });
  }, [chartPeriod, product, periodDays]);

  const hasDailySalesReal = product?.daily_sales && Object.keys(product.daily_sales).length > 0;
  const meta = product as any;

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  if (!product) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-muted-foreground text-sm">Este produto não foi encontrado nos dados sincronizados.</p>
          <Button variant="outline" onClick={() => navigate('/performance')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-24 md:pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/performance')} className="shrink-0 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {meta.image_url && (
              <img src={meta.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground truncate">{product.name}</h1>
              <p className="text-[10px] text-muted-foreground font-mono">ID: {itemId}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs h-8" asChild>
            <a href={`https://shopee.com.br/product-i.${itemId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Ver na Shopee
            </a>
          </Button>
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {meta.rating_star != null && meta.rating_star > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {meta.rating_star.toFixed(1)}
            </Badge>
          )}
          {(meta.comment_count ?? 0) > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" /> {meta.comment_count} avaliações
            </Badge>
          )}
          {(meta.likes ?? 0) > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5 text-red-500" /> {meta.likes}
            </Badge>
          )}
          {(meta.views ?? 0) > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" /> {meta.views} views
            </Badge>
          )}
          {meta.item_status && (
            <Badge variant={meta.item_status === 'NORMAL' ? 'default' : 'secondary'} className="text-xs">
              {meta.item_status === 'NORMAL' ? 'Ativo' : meta.item_status}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Package className="w-5 h-5" />} borderColor="border-t-primary" label="UNIDADES" value={String(product.total_qty)} sub={`${(pctQty || 0).toFixed(1)}% do total`} />
          <KpiCard icon={<DollarSign className="w-5 h-5" />} borderColor="border-t-emerald-500" label="RECEITA" value={`R$ ${product.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub={`${(pctRevenue || 0).toFixed(1)}% do total`} />
          <KpiCard icon={<TrendingUp className="w-5 h-5" />} borderColor="border-t-blue-500" label="TICKET MÉDIO" value={`R$ ${(ticketMedio || 0).toFixed(2).replace('.', ',')}`} sub="por unidade" />
          <KpiCard icon={<BarChart3 className="w-5 h-5" />} borderColor="border-t-amber-500" label="UN/DIA" value={(unDia || 0).toFixed(1).replace('.', ',')} sub="média no período" />
        </div>

        {/* Price & Stock & Logistics */}
        {(meta.current_price || meta.stock_available != null || meta.weight) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {meta.current_price && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Preço Atual</p>
                <p className="text-lg font-bold text-foreground font-mono mt-1">R$ {Number(meta.current_price).toFixed(2)}</p>
                {meta.min_price && meta.max_price && meta.min_price !== meta.max_price && (
                  <p className="text-[10px] text-muted-foreground">R$ {Number(meta.min_price).toFixed(2)} ~ R$ {Number(meta.max_price).toFixed(2)}</p>
                )}
              </div>
            )}
            {meta.stock_available != null && (
              <div className={`rounded-xl border bg-card p-3 ${meta.stock_available < 10 ? 'border-destructive' : 'border-border'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Estoque Disponível</p>
                <p className={`text-lg font-bold font-mono mt-1 ${meta.stock_available < 10 ? 'text-destructive' : 'text-foreground'}`}>{meta.stock_available} un</p>
                {meta.stock_available < 10 && <p className="text-[10px] text-destructive font-semibold">⚠️ Estoque baixo!</p>}
              </div>
            )}
            {meta.weight != null && meta.weight > 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Peso</p>
                </div>
                <p className="text-lg font-bold text-foreground font-mono">{(meta.weight / 1000).toFixed(2)} kg</p>
              </div>
            )}
            {meta.days_to_ship != null && meta.days_to_ship > 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prazo de Envio</p>
                </div>
                <p className="text-lg font-bold text-foreground font-mono">{meta.days_to_ship} dias</p>
              </div>
            )}
          </div>
        )}

        {/* Ads Section */}
        {adsForProduct && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Dados de Ads</p>
              <Badge variant={adsForProduct.status === 'active' ? 'default' : 'secondary'} className="ml-auto text-[10px]">
                {adsForProduct.status === 'active' ? 'Ativo' : adsForProduct.status === 'paused' ? 'Pausado' : 'Encerrado'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border">
              <AdsMetric label="Gasto Total" value={`R$ ${adsForProduct.expense.toFixed(2)}`} />
              <AdsMetric label="GMV de Ads" value={`R$ ${adsForProduct.gmv.toFixed(2)}`} />
              <AdsMetric label="ROAS" value={`${adsForProduct.roas.toFixed(1)}x`} highlight={adsForProduct.roas >= 3} />
              <AdsMetric label="CTR" value={`${adsForProduct.ctr.toFixed(2)}%`} />
              <AdsMetric label="Custo/Pedido" value={adsForProduct.orders > 0 ? `R$ ${adsForProduct.cost_per_order.toFixed(2)}` : '—'} />
            </div>
          </div>
        )}

        {/* Daily Sales Chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Vendas diárias</p>
              {!hasDailySalesReal && <p className="text-[10px] text-muted-foreground">* dados estimados — sincronize novamente para dados reais</p>}
            </div>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(['7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                    chartPeriod === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barCategoryGap="15%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval={chartPeriod === '7d' ? 0 : chartPeriod === '30d' ? 4 : 13}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(value: number) => [`${value} un.`, 'Vendas']}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {dailyData.map((_, index) => (
                  <Cell key={index} fill={index >= dailyData.length - 3 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.65)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Participation Bars */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Participação no total</p>
          <ShareBar label="% Vendas (qtd)" pct={pctQty || 0} color="bg-primary" textColor="text-primary" />
          <ShareBar label="% Receita" pct={pctRevenue || 0} color="bg-emerald-500" textColor="text-emerald-500" />
        </div>

        {/* Variants Table */}
        {sortedVariants.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Variações ({sortedVariants.length})</p>
            </div>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase w-8"></th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">VARIAÇÃO</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">QTD</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">RECEITA</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">%</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase w-28">PARTICIPAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVariants.map(([varName, v], i) => {
                    const varPct = product.total_qty > 0 ? (v.qty / product.total_qty) * 100 : 0;
                    const isTop = i === 0 && sortedVariants.length > 1;
                    return (
                      <tr key={varName} className={`border-b border-border last:border-0 ${isTop ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          {isTop ? <Star className="w-4 h-4 text-amber-500 inline" /> : <span className="text-muted-foreground text-xs">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{varName}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{v.qty} un</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                          R$ {v.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-primary font-semibold">{varPct.toFixed(0)}%</td>
                        <td className="px-4 py-3">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(varPct, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {sortedVariants.map(([varName, v], i) => {
                const varPct = product.total_qty > 0 ? (v.qty / product.total_qty) * 100 : 0;
                const isTop = i === 0 && sortedVariants.length > 1;
                return (
                  <div key={varName} className={`px-4 py-3 space-y-1.5 ${isTop ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isTop ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <span className="text-muted-foreground text-xs w-5 text-center">{i + 1}</span>}
                        <span className="text-sm font-medium text-foreground truncate">{varName}</span>
                      </div>
                      <span className="text-xs font-mono text-primary font-semibold">{varPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{v.qty} un</span>
                      <span className="font-semibold text-primary">R$ {v.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(varPct, 100)}%` }} />
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
              {bottomVariant && (
                <> <strong>{bottomVariant[0]}</strong> com apenas{' '}
                <strong>{((bottomVariant[1].qty / product.total_qty) * 100).toFixed(0)}%</strong> pode ser descontinuado para liberar estoque.
                Considere dobrar o estoque da variação {topVariant[0]}.</>
              )}
              {adsForProduct && adsForProduct.roas > 0 && (
                <> O ROAS atual de <strong>{adsForProduct.roas.toFixed(1)}x</strong> {adsForProduct.roas >= 3 ? 'indica boa performance de Ads.' : 'pode ser otimizado — revise os lances.'}</>
              )}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon, borderColor, label, value, sub }: {
  icon: React.ReactNode; borderColor: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className={`rounded-xl border border-border border-t-2 ${borderColor} bg-card p-4`}>
      <div className="flex justify-start mb-1 text-muted-foreground">{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-foreground font-mono mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ShareBar({ label, pct, color, textColor }: { label: string; pct: number; color: string; textColor: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className={`font-mono font-bold ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function AdsMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold font-mono mt-0.5 ${highlight ? 'text-emerald-500' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
