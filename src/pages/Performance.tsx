import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { ProductDetailDrawer } from '@/components/performance/ProductDetailDrawer';
import { RefreshCw, Loader2, ShoppingBag, TrendingUp, ShoppingCart, Package, Clock } from 'lucide-react';
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

export default function Performance() {
  const { isConnected, startOAuth, isLoading: tokenLoading } = useShopeeToken();
  const { data, syncedAt, loading, syncing, sync } = usePerformanceData();
  const [connecting, setConnecting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ itemId: string; product: any } | null>(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await startOAuth();
    } catch {
      setConnecting(false);
    }
  };

  const formatCurrency = (v: number) => v > 0 ? `R$ ${v.toFixed(2)}` : '—';

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
        {/* Loading state */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && !syncing && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Clique em "Atualizar" para carregar os dados de performance.</p>
          </div>
        )}

        {data && (
          <div className="space-y-4 animate-fade-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard
                icon={<ShoppingCart className="w-5 h-5" />}
                iconColor="text-primary"
                borderColor="border-t-primary"
                label="Pedidos"
                value={String(data.summary.total_orders)}
                sub="90 dias"
              />
              <KpiCard
                icon={<TrendingUp className="w-5 h-5" />}
                iconColor="text-emerald-500"
                borderColor="border-t-emerald-500"
                label="Faturamento"
                value={data.summary.total_revenue > 0 ? `R$ ${data.summary.total_revenue.toFixed(0)}` : '—'}
                sub={data.summary.total_revenue > 0 ? `R$ ${(data.summary.total_revenue / 90).toFixed(0)}/dia` : ''}
              />
              <KpiCard
                icon={<Package className="w-5 h-5" />}
                iconColor="text-blue-500"
                borderColor="border-t-blue-500"
                label="Ticket Médio"
                value={data.summary.avg_ticket > 0 ? `R$ ${data.summary.avg_ticket.toFixed(2)}` : '—'}
                sub="por pedido"
              />
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
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">🏆 Ranking de Produtos ({sorted.length})</p>
                {sorted.slice(0, 20).map(([itemId, prod], i) => (
                  <button
                    key={itemId}
                    onClick={() => setSelectedProduct({ itemId, product: prod })}
                    className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{prod.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {itemId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-2">
                        {prod.total_revenue > 0 && (
                          <span className="text-xs font-bold text-foreground">{formatCurrency(prod.total_revenue)}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{prod.total_qty} un.</span>
                      </div>
                    </div>
                  </button>
                ))}
                {sorted.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">+{sorted.length - 20} produtos</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        product={selectedProduct?.product || null}
        itemId={selectedProduct?.itemId || ''}
        totalRevenue={data?.summary.total_revenue || 0}
        totalQty={totalQtyAll}
        periodDays={data?.summary.period_days || 90}
      />
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
      <p className="text-xl font-bold text-foreground font-mono mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
