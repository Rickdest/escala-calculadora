import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { ProductExpandedDetail } from '@/components/performance/ProductExpandedDetail';
import { useApiAdsData } from '@/hooks/useApiAdsData';
import { RefreshCw, Loader2, ShoppingBag, TrendingUp, ShoppingCart, Package, Clock, ChevronDown, BarChart3, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500',
  SHIPPED: 'bg-blue-500',
  READY_TO_SHIP: 'bg-amber-500',
  IN_CANCEL: 'bg-orange-500',
  CANCELLED: 'bg-red-500',
  UNPAID: 'bg-gray-400',
  PROCESSED: 'bg-violet-500',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Concluídos',
  SHIPPED: 'Enviados',
  READY_TO_SHIP: 'Pronto p/ envio',
  IN_CANCEL: 'Em cancelamento',
  CANCELLED: 'Cancelados',
  UNPAID: 'Não pagos',
  PROCESSED: 'Processados',
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Performance() {
  const navigate = useNavigate();
  const { isConnected, startOAuth, isLoading: tokenLoading } = useShopeeToken();
  const { data, syncedAt, loading, syncing, sync } = usePerformanceData();
  const { data: adsRows } = useApiAdsData();
  const [connecting, setConnecting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build ads lookup by item_id
  const adsLookup = useMemo(() => {
    if (!adsRows) return {};
    const map: Record<string, { expense: number; gmv: number; roas: number }> = {};
    for (const r of adsRows as any[]) {
      const key = String(r.item_id);
      if (!map[key]) map[key] = { expense: 0, gmv: 0, roas: 0 };
      map[key].expense += Number(r.expense || 0);
      map[key].gmv += Number(r.gmv || 0);
    }
    for (const v of Object.values(map)) {
      v.roas = v.expense > 0 ? v.gmv / v.expense : 0;
    }
    return map;
  }, [adsRows]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await startOAuth();
    } catch {
      setConnecting(false);
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <AppLayout>
        <PageHeader title="Performance" />
        <div className="pt-6 pb-24 md:pb-6 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EE4D2D]/10 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-[#EE4D2D]" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Conecte sua Shopee</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              A aba de Performance exibe dados de vendas, variações mais vendidas e ticket médio dos últimos 90 dias via API da Shopee.
            </p>
          </div>
          <Button onClick={handleConnect} disabled={connecting} className="bg-[#EE4D2D] hover:bg-[#EE4D2D]/90 text-white">
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
            Conectar com Shopee
          </Button>
        </div>
      </AppLayout>
    );
  }

  const sorted = data ? Object.entries(data.product_sales).sort(([, a], [, b]) => b.total_qty - a.total_qty) : [];
  const totalQtyAll = data ? sorted.reduce((s, [, p]) => s + p.total_qty, 0) : 0;
  const totalRevenueAll = data?.summary.total_revenue || 0;
  const periodDays = data?.summary.period_days || 90;
  const unDia = periodDays > 0 && data ? data.summary.total_orders / periodDays : 0;

  return (
    <AppLayout>
      <div className="flex items-center justify-between px-4 md:px-0">
        <PageHeader title="Performance" subtitle="Vendas · Shopee (90 dias)" />
        <div className="flex items-center gap-2">
          {syncedAt && (
            <span className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(syncedAt), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={sync} disabled={syncing} className="h-8 text-xs gap-1.5">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? 'Sincronizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <div className="pt-4 pb-24 md:pb-6 space-y-4">
        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card h-24" />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card h-64" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && !syncing && (
          <div className="flex flex-col items-center justify-center min-h-[45vh] text-center space-y-5 px-6 animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Seus dados de vendas aparecerão aqui</p>
              <p className="text-sm text-muted-foreground max-w-md mt-1.5">
                Sincronize para carregar pedidos, faturamento, ranking de produtos e variações mais vendidas dos últimos 90 dias.
              </p>
            </div>
            <Button onClick={sync} size="lg" className="gap-2 text-sm">
              <RefreshCw className="w-4 h-4" />
              Sincronizar agora
            </Button>
          </div>
        )}

        {/* Syncing skeleton */}
        {syncing && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card h-24" />
              ))}
            </div>
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sincronizando pedidos...
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-4 animate-fade-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<ShoppingCart className="w-5 h-5" />} iconColor="text-primary" borderColor="border-t-primary" label="Pedidos" value={String(data.summary.total_orders)} sub="90 dias" />
              <KpiCard icon={<TrendingUp className="w-5 h-5" />} iconColor="text-emerald-500" borderColor="border-t-emerald-500" label="Faturamento" value={totalRevenueAll > 0 ? `R$ ${totalRevenueAll.toFixed(0)}` : '—'} sub={totalRevenueAll > 0 ? `R$ ${(totalRevenueAll / 90).toFixed(0)}/dia` : ''} />
              <KpiCard icon={<Package className="w-5 h-5" />} iconColor="text-blue-500" borderColor="border-t-blue-500" label="Ticket Médio" value={data.summary.avg_ticket > 0 ? `R$ ${data.summary.avg_ticket.toFixed(2)}` : '—'} sub="por pedido" />
              <KpiCard icon={<BarChart3 className="w-5 h-5" />} iconColor="text-orange-500" borderColor="border-t-orange-500" label="Pedidos/dia" value={unDia > 0 ? unDia.toFixed(1) : '—'} sub="média" />
            </div>

            {/* Status Chips */}
            {Object.keys(data.summary.status_counts).length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {Object.entries(data.summary.status_counts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs whitespace-nowrap shrink-0">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-gray-400'}`} />
                      <span className="text-muted-foreground">{STATUS_LABELS[status] || status}</span>
                      <span className="font-bold text-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Product Ranking */}
            {sorted.length === 0 ? (
              <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum produto vendido no período.
              </div>
            ) : (
              <div className="space-y-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-foreground">🏆 Ranking de Produtos ({sorted.length})</p>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase w-10">#</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Produto</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Unidades</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Receita</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Ticket</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Un/Dia</th>
                        <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.slice(0, 20).map(([itemId, prod], i) => {
                        const isExpanded = expandedId === itemId;
                        const pctQty = totalQtyAll > 0 ? (prod.total_qty / totalQtyAll) * 100 : 0;
                        const pctRevenue = totalRevenueAll > 0 ? (prod.total_revenue / totalRevenueAll) * 100 : 0;
                        const ticket = prod.total_qty > 0 ? prod.total_revenue / prod.total_qty : 0;
                        const undiaItem = periodDays > 0 ? prod.total_qty / periodDays : 0;
                        const meta = prod as any;

                        return (
                          <Collapsible key={itemId} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? itemId : null)} asChild>
                            <>
                              <CollapsibleTrigger asChild>
                                <tr className="border-b border-border hover:bg-muted/10 cursor-pointer transition-colors">
                                  <td className="px-4 py-3">
                                    {i < 3 ? <span className="text-base">{MEDALS[i]}</span> : <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      {meta.image_url && (
                                        <img src={meta.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-medium text-foreground truncate max-w-[250px]">{prod.name}</p>
                                        <p className="text-[10px] text-muted-foreground">ID: {itemId}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-semibold text-foreground">{prod.total_qty}</span>
                                    <span className="text-[10px] text-muted-foreground ml-1">({pctQty.toFixed(1)}%)</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-semibold text-foreground">R$ {prod.total_revenue.toFixed(2)}</span>
                                    <span className="text-[10px] text-muted-foreground ml-1">({pctRevenue.toFixed(1)}%)</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-foreground">R$ {ticket.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-mono text-foreground">{undiaItem.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Button size="sm" className="h-7 text-[11px] gap-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={(e) => { e.stopPropagation(); navigate(`/performance/${itemId}`); }}>
                                      <Eye className="w-3.5 h-3.5" /> Detalhes
                                    </Button>
                                  </td>
                                </tr>
                              </CollapsibleTrigger>
                              <CollapsibleContent asChild>
                                <tr>
                                  <td colSpan={7} className="p-0 border-b border-border bg-muted/5">
                                    <ProductExpandedDetail product={prod} totalRevenue={totalRevenueAll} totalQty={totalQtyAll} periodDays={periodDays} itemId={itemId} />
                                  </td>
                                </tr>
                              </CollapsibleContent>
                            </>
                          </Collapsible>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {sorted.slice(0, 20).map(([itemId, prod], i) => {
                    const isExpanded = expandedId === itemId;
                    const pctRevenue = totalRevenueAll > 0 ? (prod.total_revenue / totalRevenueAll) * 100 : 0;
                    const meta = prod as any;

                    return (
                      <Collapsible key={itemId} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? itemId : null)}>
                        <div className="rounded-xl border border-border overflow-hidden transition-colors hover:bg-muted/20">
                          <CollapsibleTrigger className="w-full text-left p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {i < 3 ? (
                                  <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">{MEDALS[i]}</span>
                                ) : (
                                  <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                )}
                                {meta.image_url && (
                                  <img src={meta.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">{prod.name}</p>
                                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden max-w-[200px]">
                                    <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${Math.min(pctRevenue, 100)}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <div className="flex flex-col items-end gap-0.5">
                                  {prod.total_revenue > 0 && <span className="text-xs font-bold text-foreground">R$ {prod.total_revenue.toFixed(2)}</span>}
                                  <span className="text-[10px] text-muted-foreground">{prod.total_qty} un.</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-border">
                              <ProductExpandedDetail product={prod} totalRevenue={totalRevenueAll} totalQty={totalQtyAll} periodDays={periodDays} itemId={itemId} />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>

                {sorted.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">+{sorted.length - 20} produtos</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon, iconColor, borderColor, label, value, sub }: {
  icon: React.ReactNode; iconColor: string; borderColor: string;
  label: string; value: string; sub: string;
}) {
  return (
    <div className={`rounded-xl border border-border border-t-2 ${borderColor} bg-card p-4 text-center`}>
      <div className={`${iconColor} flex justify-center mb-1`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-foreground font-mono mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
