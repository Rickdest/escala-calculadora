import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { RefreshCw, Loader2, ShoppingBag, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceData {
  product_sales: Record<string, {
    name: string;
    total_qty: number;
    total_revenue: number;
    variants: Record<string, { qty: number; revenue: number }>;
  }>;
  summary: {
    total_orders: number;
    total_revenue: number;
    avg_ticket: number;
    status_counts: Record<string, number>;
    period_days: number;
  };
}

const statusLabels: Record<string, string> = {
  COMPLETED: 'Concluídos',
  SHIPPED: 'Enviados',
  READY_TO_SHIP: 'Pronto p/ envio',
  IN_CANCEL: 'Em cancelamento',
  CANCELLED: 'Cancelados',
  UNPAID: 'Não pagos',
  PROCESSED: 'Processados',
};

export default function Performance() {
  const { isConnected, startOAuth, syncAds, isLoading: tokenLoading } = useShopeeToken();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncAds();
      if (result?.results?.order_performance) {
        setData(result.results.order_performance);
        toast.success('Dados de performance atualizados!');
      } else {
        toast.info('Nenhum dado de performance disponível');
      }
    } catch {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await startOAuth();
    } catch {
      setConnecting(false);
    }
  };

  const formatCurrency = (v: number) => v > 0 ? `R$ ${v.toFixed(2)}` : '—';

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

  return (
    <AppLayout>
      <PageHeader title="Performance" subtitle="Dados de vendas · Shopee (90 dias)" />

      <div className="pt-6 pb-24 md:pb-6 space-y-4">
        <Button onClick={handleSync} disabled={syncing} className="w-full h-12">
          {syncing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sincronizando...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> {data ? 'Atualizar Dados' : 'Carregar Performance'}</>
          )}
        </Button>

        {!data && !syncing && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Clique acima para carregar os dados de performance da sua loja.
          </div>
        )}

        {data && (
          <div className="space-y-4 animate-fade-up">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 text-center">
                <ShoppingCart className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pedidos</p>
                <p className="text-2xl font-bold text-foreground font-mono">{data.summary.total_orders}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Faturamento</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  {data.summary.total_revenue > 0 ? `R$ ${data.summary.total_revenue.toFixed(0)}` : '—'}
                </p>
              </div>
              <div className="glass-card p-4 text-center">
                <Package className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ticket Médio</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  {data.summary.avg_ticket > 0 ? `R$ ${data.summary.avg_ticket.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {/* Status Breakdown */}
            {Object.keys(data.summary.status_counts).length > 0 && (
              <div className="glass-card p-4">
                <p className="text-sm font-bold text-foreground mb-2">Pedidos por Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.summary.status_counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {statusLabels[status] || status}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Product Ranking */}
            {(() => {
              const sorted = Object.entries(data.product_sales).sort(([, a], [, b]) => b.total_qty - a.total_qty);
              if (sorted.length === 0) return (
                <div className="glass-card p-6 text-center text-sm text-muted-foreground">Nenhum produto vendido no período.</div>
              );
              return (
                <div className="glass-card p-4">
                  <p className="text-sm font-bold text-foreground mb-3">🏆 Ranking de Produtos</p>
                  <div className="space-y-2">
                    {sorted.slice(0, 20).map(([itemId, prod], i) => {
                      const sortedVariants = Object.entries(prod.variants).sort(([, a], [, b]) => b.qty - a.qty);
                      return (
                        <div key={itemId} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs font-bold text-primary flex-shrink-0">#{i + 1}</span>
                              <p className="text-sm font-medium text-foreground truncate">{prod.name}</p>
                            </div>
                            <div className="flex gap-3 flex-shrink-0 text-xs">
                              <span className="text-muted-foreground">{prod.total_qty} un.</span>
                              {prod.total_revenue > 0 && (
                                <span className="font-semibold text-foreground">{formatCurrency(prod.total_revenue)}</span>
                              )}
                            </div>
                          </div>
                          {sortedVariants.length > 1 && (
                            <div className="mt-2 pl-6 space-y-1">
                              {sortedVariants.slice(0, 5).map(([varName, v]) => (
                                <div key={varName} className="flex justify-between text-xs text-muted-foreground">
                                  <span className="truncate">{varName}</span>
                                  <span className="flex-shrink-0 ml-2">{v.qty} un. · {formatCurrency(v.revenue)}</span>
                                </div>
                              ))}
                              {sortedVariants.length > 5 && (
                                <p className="text-[10px] text-muted-foreground/60">+{sortedVariants.length - 5} variações</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {sorted.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">+{sorted.length - 20} produtos</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
