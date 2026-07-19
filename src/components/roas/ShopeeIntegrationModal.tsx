import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap, RefreshCw, FileX, Loader2, CheckCircle2, Package, ShoppingCart, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, BarChart3, Search } from 'lucide-react';
import { useShopeeToken, useShopeeTokenStatus } from '@/hooks/useShopeeToken';
import { useAdmin } from '@/hooks/useAdmin';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const benefits = [
  { icon: Zap, text: 'Sincronização automática de dados' },
  { icon: RefreshCw, text: 'Métricas atualizadas em tempo real' },
  { icon: FileX, text: 'Sem necessidade de exportar CSV manualmente' },
];

interface SyncReport {
  shop_info?: any;
  product_list?: any;
  product_details?: any;
  product_models?: Record<string, any[]>;
  order_list?: any;
  order_details?: any;
  order_performance?: {
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
  };
}

function ReportSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-2 hover:bg-surface-2/80 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 text-sm space-y-2">{children}</div>}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-foreground text-xs">{value ?? '-'}</span>
    </div>
  );
}

function ShopInfoReport({ data }: { data: any }) {
  if (!data?.shop_name) return <p className="text-xs text-muted-foreground">Sem dados disponíveis</p>;
  return (
    <div>
      <StatRow label="Nome da loja" value={data.shop_name} />
      <StatRow label="Região" value={data.region} />
      <StatRow label="Status" value={data.status} />
      <StatRow label="Fulfillment" value={data.shop_fulfillment_flag} />
      <StatRow label="Loja verificada" value={data.is_sip ? 'Sim' : 'Não'} />
    </div>
  );
}

function getProductPriceAndStock(p: any, modelsMap?: Record<string, any[]>) {
  const models = modelsMap?.[p.item_id];
  if (models && models.length > 0) {
    const prices = models
      .map((m: any) => {
        const pi = m.price_info?.[0];
        const raw = pi?.current_price || pi?.original_price || 0;
        return raw > 1000 ? raw / 100000 : raw;
      })
      .filter((p: number) => p > 0);
    const stocks = models.reduce((sum: number, m: any) => {
      return sum + (m.stock_info_v2?.summary_info?.total_available_stock ?? m.stock_info?.total_available_stock ?? 0);
    }, 0);
    let priceStr = '-';
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      priceStr = min === max ? `R$ ${min.toFixed(2)}` : `R$ ${min.toFixed(2)} - ${max.toFixed(2)}`;
    }
    return { price: priceStr, stock: stocks, variants: models.length };
  }
  const pi = p.price_info?.[0];
  const rawPrice = pi?.current_price || pi?.original_price || pi?.inflated_price_of_current_price || 0;
  const price = rawPrice > 1000 ? rawPrice / 100000 : rawPrice;
  const stock = p.stock_info_v2?.summary_info?.total_available_stock;
  return {
    price: price > 0 ? `R$ ${price.toFixed(2)}` : '-',
    stock: stock ?? '-',
    variants: 0,
  };
}

function ProductListReport({ listData, detailsData, modelsMap }: { listData: any; detailsData?: any; modelsMap?: Record<string, any[]> }) {
  const items = listData?.response?.item || [];
  const details = detailsData?.response?.item_list || [];
  const total = listData?.response?.total_count ?? items.length;
  return (
    <div>
      <StatRow label="Total de produtos" value={total} />
      <StatRow label="Carregados" value={items.length} />
      {details.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Primeiros produtos:</p>
          {details.slice(0, 10).map((p: any, i: number) => {
            const info = getProductPriceAndStock(p, modelsMap);
            return (
              <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-surface-2/50">
                {p.image?.image_url_list?.[0] && (
                  <img src={p.image.image_url_list[0]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground truncate">{p.item_name}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
                    <span>Preço: {info.price}</span>
                    <span>Estoque: {info.stock}</span>
                    <span>Vendas: {p.sale_info?.historical_sold ?? '-'}</span>
                    {info.variants > 0 && <span className="text-primary">({info.variants} variações)</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderReport({ listData, detailsData }: { listData: any; detailsData?: any }) {
  const orders = listData?.response?.order_list || [];
  const details = detailsData?.response?.order_list || [];

  if (listData?.error && listData.error !== "") {
    return <p className="text-xs text-muted-foreground">Erro: {listData.error} - {listData.message}</p>;
  }

  return (
    <div>
      <StatRow label="Pedidos nos últimos 90 dias" value={orders.length} />
      {details.length > 0 && (
        <div className="mt-2 space-y-1">
          {details.slice(0, 8).map((o: any, i: number) => (
            <div key={i} className="p-1.5 rounded bg-surface-2/50 text-[11px]">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">#{o.order_sn?.slice(-6)}</span>
                <span className="text-muted-foreground">{o.order_status}</span>
              </div>
              {o.total_amount && (
                <span className="text-[10px] text-muted-foreground">Total: R$ {Number(o.total_amount).toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {orders.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhum pedido encontrado no período.</p>}
    </div>
  );
}

function PerformanceReport({ data }: { data: SyncReport['order_performance'] }) {
  if (!data) return <p className="text-xs text-muted-foreground">Sincronize para ver os dados de performance.</p>;

  const { summary, product_sales } = data;
  const sortedProducts = Object.entries(product_sales)
    .sort(([, a], [, b]) => b.total_qty - a.total_qty);

  const statusLabels: Record<string, string> = {
    COMPLETED: 'Concluídos',
    SHIPPED: 'Enviados',
    READY_TO_SHIP: 'Pronto p/ envio',
    IN_CANCEL: 'Em cancelamento',
    CANCELLED: 'Cancelados',
    UNPAID: 'Não pagos',
    PROCESSED: 'Processados',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Pedidos (90d)</p>
          <p className="text-lg font-bold text-foreground">{summary.total_orders}</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Faturamento</p>
          <p className="text-lg font-bold text-foreground">
            {summary.total_revenue > 0 ? `R$ ${summary.total_revenue.toFixed(0)}` : '-'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
          <p className="text-lg font-bold text-foreground">
            {summary.avg_ticket > 0 ? `R$ ${summary.avg_ticket.toFixed(2)}` : '-'}
          </p>
        </div>
      </div>

      {Object.keys(summary.status_counts).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5">Pedidos por Status</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.status_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <Badge key={status} variant="secondary" className="text-[10px]">
                  {statusLabels[status] || status}: {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {sortedProducts.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5">🏆 Ranking de Produtos</p>
          <div className="space-y-2">
            {sortedProducts.slice(0, 15).map(([itemId, prod], i) => {
              const sortedVariants = Object.entries(prod.variants)
                .sort(([, a], [, b]) => b.qty - a.qty);

              return (
                <div key={itemId} className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-primary flex-shrink-0">#{i + 1}</span>
                      <p className="text-[11px] font-medium text-foreground truncate">{prod.name}</p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 text-[10px]">
                      <span className="text-muted-foreground">{prod.total_qty} un.</span>
                      {prod.total_revenue > 0 && (
                        <span className="font-medium text-foreground">R$ {prod.total_revenue.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  {sortedVariants.length > 1 && (
                    <div className="mt-1.5 pl-5 space-y-0.5">
                      {sortedVariants.slice(0, 5).map(([varName, v]) => (
                        <div key={varName} className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="truncate">{varName}</span>
                          <span className="flex-shrink-0 ml-2">{v.qty} un.</span>
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
          {sortedProducts.length > 15 && (
            <p className="text-[10px] text-muted-foreground mt-1">+{sortedProducts.length - 15} produtos</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum produto vendido no período.</p>
      )}
    </div>
  );
}

function ConnectionCard({
  title,
  description,
  icon: Icon,
  isConnected,
  isExpired,
  isLoading,
  onConnect,
  onReconnect,
}: {
  title: string;
  description: string;
  icon: any;
  isConnected: boolean;
  isExpired?: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onReconnect?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#EE4D2D]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#EE4D2D]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {isConnected && isExpired ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
          <Button size="sm" variant="outline" onClick={onReconnect || onConnect} disabled={isLoading} className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reconectar'}
          </Button>
        </div>
      ) : isConnected ? (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] flex-shrink-0">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Conectado
        </Badge>
      ) : (
        <Button size="sm" variant="outline" onClick={onConnect} disabled={isLoading} className="flex-shrink-0 text-xs">
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Conectar'}
        </Button>
      )}
    </div>
  );
}

export function ShopeeIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentStore } = useStore();
  const { sellerConnected, adsConnected, sellerExpired, adsExpired, startOAuth, syncStoreData, isLoading: tokenLoading, refetchAll } = useShopeeTokenStatus(currentStore?.id);
  const isConnected = sellerConnected || adsConnected;
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string> | null>(null);
  const { isAdmin } = useAdmin();
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);

  const handleConnect = async (appType: 'seller' | 'ads') => {
    try {
      setConnecting(appType);
      await startOAuth(appType);
    } catch {
      toast.error('Erro ao iniciar conexão com Shopee');
      setConnecting(null);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setReport(null);
      setSyncErrors(null);
      const result = await syncStoreData();
      if (result?.results) setReport(result.results);
      if (result?.errors) setSyncErrors(result.errors);
      toast.success('Sincronização concluída!');
    } catch {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscovery = async () => {
    try {
      setDiscoveryRunning(true);
      setDiscoveryResults(null);
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('shopee-seller-discovery', {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.error) {
        toast.error(res.error.message || 'Erro no discovery');
      } else {
        setDiscoveryResults(res.data?.discovery_results || res.data);
        toast.success('Discovery concluído!');
      }
    } catch {
      toast.error('Erro ao executar discovery');
    } finally {
      setDiscoveryRunning(false);
    }
  };

  const hasPerformance = !!report?.order_performance;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={report || discoveryResults ? "max-w-lg max-h-[85vh] overflow-y-auto" : "max-w-sm"}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EE4D2D]/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#EE4D2D]" />
            </div>
            <div>
              <DialogTitle className="text-base">Integração com Shopee</DialogTitle>
              <DialogDescription className="sr-only">
                Conecte sua loja Shopee para sincronizar dados automaticamente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dual connection cards */}
        <div className="space-y-2">
          <ConnectionCard
            title="📦 Dados da Loja"
            description="Produtos, pedidos, finanças"
            icon={Package}
            isConnected={sellerConnected}
            isExpired={sellerExpired}
            isLoading={connecting === 'seller' || tokenLoading}
            onConnect={() => handleConnect('seller')}
            onReconnect={() => handleConnect('seller')}
          />
          <ConnectionCard
            title="📊 Dados de Ads"
            description="Campanhas, ROAS, keywords"
            icon={BarChart3}
            isConnected={adsConnected}
            isExpired={adsExpired}
            isLoading={connecting === 'ads' || tokenLoading}
            onConnect={() => handleConnect('ads')}
            onReconnect={() => handleConnect('ads')}
          />
          {sellerConnected && adsConnected && (
            <p className="text-[10px] text-emerald-600 text-center">
              ✨ Ambos conectados - ROAS líquido real disponível em breve
            </p>
          )}
          {(sellerConnected || adsConnected) && !(sellerConnected && adsConnected) && (
            <p className="text-[10px] text-muted-foreground text-center">
              💡 Conecte os dois para ver o ROAS líquido real
            </p>
          )}
        </div>

        {isConnected && (
          <div className="space-y-3">
            {sellerConnected && (
              <Button onClick={handleSync} disabled={syncing} className="w-full" variant="outline">
                {syncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sincronizando...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> {report ? 'Sincronizar Novamente' : 'Sincronizar Dados da Loja'}</>
                )}
              </Button>
            )}

            {report && (
              <Tabs defaultValue={hasPerformance ? "performance" : "data"} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="data" className="text-xs">📦 Dados da Loja</TabsTrigger>
                  <TabsTrigger value="performance" className="text-xs">📊 Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-2 mt-2">
                  {report.shop_info && (
                    <ReportSection title="Informações da Loja" icon={ShoppingBag} defaultOpen>
                      <ShopInfoReport data={report.shop_info} />
                    </ReportSection>
                  )}
                  {report.product_list && (
                    <ReportSection title="Produtos" icon={Package} defaultOpen>
                      <ProductListReport listData={report.product_list} detailsData={report.product_details} modelsMap={report.product_models} />
                    </ReportSection>
                  )}
                  {(report.order_list || report.order_details) && (
                    <ReportSection title="Pedidos (90 dias)" icon={ShoppingCart}>
                      <OrderReport listData={report.order_list} detailsData={report.order_details} />
                    </ReportSection>
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-2">
                  <PerformanceReport data={report.order_performance} />
                </TabsContent>
              </Tabs>
            )}

            {syncErrors && Object.keys(syncErrors).length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                <p className="text-xs font-semibold text-destructive">Erros encontrados:</p>
                {Object.entries(syncErrors).map(([key, msg]) => (
                  <p key={key} className="text-[10px] text-muted-foreground mt-1">• {key}: {msg}</p>
                ))}
              </div>
            )}

            {/* Admin-only discovery button */}
            {isAdmin && sellerConnected && (
              <div className="border-t border-border pt-3">
                <Button onClick={handleDiscovery} disabled={discoveryRunning} variant="outline" size="sm" className="w-full text-xs">
                  {discoveryRunning ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executando Discovery...</>
                  ) : (
                    <><Search className="w-3 h-3 mr-1" /> 🔬 Discovery API Vendedor (Admin)</>
                  )}
                </Button>
                {discoveryResults && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded border border-border bg-muted/30 p-2">
                    <pre className="text-[9px] text-foreground whitespace-pre-wrap break-all">
                      {JSON.stringify(discoveryResults, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">
          {isConnected ? 'Fechar' : 'Continuar com CSV'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
