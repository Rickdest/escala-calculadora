import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap, RefreshCw, FileX, Loader2, CheckCircle2, Package, ShoppingCart, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { useShopeeToken } from '@/hooks/useShopeeToken';
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
      <span className="font-medium text-foreground text-xs">{value ?? '—'}</span>
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
    let priceStr = '—';
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
    price: price > 0 ? `R$ ${price.toFixed(2)}` : '—',
    stock: stock ?? '—',
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
                    <span>Vendas: {p.sale_info?.historical_sold ?? '—'}</span>
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
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Pedidos (90d)</p>
          <p className="text-lg font-bold text-foreground">{summary.total_orders}</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Faturamento</p>
          <p className="text-lg font-bold text-foreground">
            {summary.total_revenue > 0 ? `R$ ${summary.total_revenue.toFixed(0)}` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
          <p className="text-lg font-bold text-foreground">
            {summary.avg_ticket > 0 ? `R$ ${summary.avg_ticket.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
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

      {/* Product Ranking */}
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

export function ShopeeIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isConnected, startOAuth, syncStoreData, isLoading: tokenLoading } = useShopeeToken();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string> | null>(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await startOAuth();
    } catch (e) {
      toast.error('Erro ao iniciar conexão com Shopee');
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setReport(null);
      setSyncErrors(null);
      const result = await syncAds();
      console.log('Shopee sync full result:', result);
      if (result?.results) setReport(result.results);
      if (result?.errors) setSyncErrors(result.errors);
      toast.success('Sincronização concluída!');
    } catch (e) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const hasPerformance = !!report?.order_performance;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={report ? "max-w-lg max-h-[85vh] overflow-y-auto" : "max-w-sm"}>
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
              {isConnected ? (
                <Badge className="mt-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  Conectada
                </Badge>
              ) : (
                <Badge className="mt-1 bg-primary/15 text-primary border-primary/30 text-[10px]">
                  Disponível
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Loja conectada com sucesso!</span>
            </div>
            <Button onClick={handleSync} disabled={syncing} className="w-full">
              {syncing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sincronizando...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> {report ? 'Sincronizar Novamente' : 'Sincronizar e Ver Relatório'}</>
              )}
            </Button>

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
                  <div className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Dados de Ads (ROAS, ACOS, gastos)</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Métricas de anúncios não estão disponíveis via API para este app. Continue importando via CSV na aba de Ads.
                      </p>
                    </div>
                  </div>
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

            <Button variant="outline" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte sua loja Shopee para sincronizar dados de anúncios automaticamente.
            </p>
            <div className="space-y-2.5">
              {benefits.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleConnect} disabled={connecting || tokenLoading} className="w-full bg-[#EE4D2D] hover:bg-[#EE4D2D]/90">
              {connecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</>
              ) : (
                <><ShoppingBag className="w-4 h-4 mr-2" /> Conectar Loja Shopee</>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Continuar com CSV
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
