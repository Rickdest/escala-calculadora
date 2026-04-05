import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProductPerformance } from '@/hooks/useProductPerformance';
import { useApiAdsData } from '@/hooks/useApiAdsData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Package, DollarSign, TrendingUp, BarChart3, Star, Megaphone, Target, Calendar, Search, Eye, MousePointerClick, ShoppingCart, ArrowRight, ArrowLeftIcon } from 'lucide-react';
import { PageLoader } from '@/components/layout/PageStates';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { FunnelBar } from '@/components/performance/FunnelBar';
import { InsightsPanel } from '@/components/performance/InsightsPanel';
import { calcOrganicoVsAds } from '@/lib/calcPerformance';

export default function PerformanceProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data: perfData, loading } = useProductPerformance();
  const { data: adsRows } = useApiAdsData();

  const product = useMemo(() => {
    if (!itemId || !perfData.length) return null;
    return perfData.find(p => p.item_id === itemId) || null;
  }, [perfData, itemId]);

  const isAdsOnly = product?.source === 'ads_api';
  const hasOrganic = product ? (product.impressoes > 0 || product.ctr > 0 || product.taxa_conversao > 0) : false;

  const periodDays = useMemo(() => {
    if (!product) return 30;
    const diff = new Date(product.period_end).getTime() - new Date(product.period_start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [product]);

  // Cross-reference with shopee_ads_by_product for extra data
  const adsForProduct = useMemo(() => {
    if (!adsRows || !itemId) return null;
    const matching = adsRows.filter((r: any) => String(r.item_id) === itemId);
    if (matching.length === 0) return null;
    const agg = {
      expense: matching.reduce((s: number, r: any) => s + Number(r.expense || 0), 0),
      gmv: matching.reduce((s: number, r: any) => s + Number(r.gmv || 0), 0),
      direct_gmv: matching.reduce((s: number, r: any) => s + Number(r.direct_gmv || 0), 0),
      clicks: matching.reduce((s: number, r: any) => s + Number(r.clicks || 0), 0),
      impressions: matching.reduce((s: number, r: any) => s + Number(r.impressions || 0), 0),
      orders: matching.reduce((s: number, r: any) => s + Number(r.orders || 0), 0),
      direct_orders: matching.reduce((s: number, r: any) => s + Number(r.direct_orders || 0), 0),
      days_active: matching.reduce((max: number, r: any) => Math.max(max, Number(r.days_active || 0)), 0),
      avg_position: null as number | null,
      roas: 0, direct_roas: 0, ctr: 0, cost_per_order: 0,
      status: matching.find((r: any) => r.status === 'active')?.status || matching[0]?.status || 'ended',
      daily_data: [] as any[],
      keywords: [] as any[],
    };
    const dailyMap = new Map<string, any>();
    for (const r of matching) {
      const dd = r.daily_data as any[];
      if (Array.isArray(dd)) {
        for (const entry of dd) {
          const date = entry.date || '';
          const ex = dailyMap.get(date);
          if (!ex) { dailyMap.set(date, { ...entry }); }
          else {
            ex.impressions = (ex.impressions || 0) + (entry.impressions || 0);
            ex.clicks = (ex.clicks || 0) + (entry.clicks || 0);
            ex.expense = (ex.expense || 0) + (entry.expense || 0);
            ex.gmv = (ex.gmv || 0) + (entry.gmv || 0);
          }
        }
      }
      const kw = (r as any).keywords as any[];
      if (Array.isArray(kw)) agg.keywords.push(...kw);
      if (r.avg_position && (!agg.avg_position || Number(r.avg_position) < agg.avg_position)) {
        agg.avg_position = Number(r.avg_position);
      }
    }
    agg.daily_data = Array.from(dailyMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    agg.roas = agg.expense > 0 ? agg.gmv / agg.expense : 0;
    agg.direct_roas = agg.expense > 0 ? agg.direct_gmv / agg.expense : 0;
    agg.ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    agg.cost_per_order = agg.orders > 0 ? agg.expense / agg.orders : 0;
    const kwMap = new Map<string, any>();
    for (const k of agg.keywords) { if (k.keyword && !kwMap.has(k.keyword)) kwMap.set(k.keyword, k); }
    agg.keywords = Array.from(kwMap.values()).slice(0, 15);
    return agg;
  }, [adsRows, itemId]);

  // Navigation helpers
  const currentIndex = perfData.findIndex(p => p.item_id === itemId);
  const prevItem = currentIndex > 0 ? perfData[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < perfData.length - 1 ? perfData[currentIndex + 1] : null;

  const split = product ? calcOrganicoVsAds(product.vendas_pago, product.ads_gmv) : null;
  const sortedVariacoes = product ? [...product.variacoes].sort((a: any, b: any) => b.vendas_pago - a.vendas_pago) : [];
  const unDia = product && periodDays > 0 ? product.unidades_pagas / periodDays : 0;

  const totalRevenue = perfData.reduce((s, p) => s + Number(p.vendas_pago), 0);
  const totalUnits = perfData.reduce((s, p) => s + Number(p.unidades_pagas), 0);
  const pctRevenue = product && totalRevenue > 0 ? (product.vendas_pago / totalRevenue) * 100 : 0;
  const pctUnits = product && totalUnits > 0 ? (product.unidades_pagas / totalUnits) * 100 : 0;

  // GMV Broad vs Direto
  const gmvBroad = adsForProduct?.gmv || 0;
  const gmvDireto = adsForProduct?.direct_gmv || 0;
  const pctDireto = gmvBroad > 0 ? (gmvDireto / gmvBroad) * 100 : 0;

  useEffect(() => { window.scrollTo(0, 0); }, [itemId]);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;
  if (!product) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-muted-foreground text-sm">Este produto não foi encontrado nos dados de performance.</p>
          <Button variant="outline" onClick={() => navigate('/performance')}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
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
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground truncate">{product.nome}</h1>
              <p className="text-[10px] text-muted-foreground font-mono">ID: {itemId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prevItem && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/performance/${prevItem.item_id}`)}>
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
            )}
            {nextItem && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/performance/${nextItem.item_id}`)}>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdsOnly && (
            <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
              <Megaphone className="w-3 h-3" /> Dados via Ads
            </Badge>
          )}
          {!isAdsOnly && product.ads_roas != null && product.ads_roas > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
              <TrendingUp className="w-3 h-3" /> ROAS {product.ads_roas.toFixed(1)}x
            </Badge>
          )}
          {adsForProduct?.avg_position != null && adsForProduct.avg_position > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-semibold border-primary text-primary">
              <Target className="w-3 h-3" /> Posição #{adsForProduct.avg_position.toFixed(0)}
            </Badge>
          )}
          {adsForProduct?.status && (
            <Badge variant={adsForProduct.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {adsForProduct.status === 'active' ? 'Ads Ativo' : adsForProduct.status === 'paused' ? 'Pausado' : 'Encerrado'}
            </Badge>
          )}
          {product.taxa_rejeicao > 0 && (
            <Badge variant="outline" className={`text-[10px] gap-1 ${product.taxa_rejeicao > 30 ? 'border-destructive text-destructive' : ''}`}>
              <MousePointerClick className="w-3 h-3" /> Rejeição {product.taxa_rejeicao.toFixed(1)}%
            </Badge>
          )}
          {product.taxa_recompra > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-500">
              <ShoppingCart className="w-3 h-3" /> Recompra {product.taxa_recompra.toFixed(1)}%
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        {isAdsOnly ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard borderColor="border-t-emerald-500" label="GMV ADS" value={`R$ ${(product.ads_gmv || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} sub={`${pctRevenue.toFixed(1)}% do total`} valueColor="text-emerald-500" />
            <KpiCard borderColor="border-t-destructive" label="GASTO ADS" value={`R$ ${(product.ads_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="investido" />
            <KpiCard borderColor="border-t-blue-500" label="ROAS" value={`${(product.ads_roas || 0).toFixed(1)}x`} sub="retorno" valueColor="text-emerald-500" />
            <KpiCard borderColor="border-t-primary" label="UN/DIA" value={`${unDia.toFixed(1)}`} sub={`${product.unidades_pagas || product.ads_pedidos || 0} total`} valueColor="text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard borderColor="border-t-emerald-500" label="RECEITA" value={`R$ ${product.vendas_pago.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} sub={`${pctRevenue.toFixed(1)}% do total`} valueColor="text-emerald-500" />
            <KpiCard borderColor="border-t-primary" label="UNIDADES" value={String(product.unidades_pagas)} sub={`${unDia.toFixed(1)}/dia`} />
            <KpiCard borderColor="border-t-blue-500" label="TICKET MÉDIO" value={`R$ ${product.ticket_medio.toFixed(2)}`} sub="por unidade" valueColor="text-blue-500" />
            <KpiCard borderColor="border-t-primary" label="PEDIDOS" value={String(product.pedidos_pagos)} sub={`${pctUnits.toFixed(1)}% do total`} />
          </div>
        )}

        {/* GMV Broad vs Direto — HIGHLIGHT */}
        {gmvBroad > 0 && gmvDireto > 0 && adsForProduct && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📊 GMV Ads — Amplo vs Direto</p>
              <span className="text-[9px] text-muted-foreground">O que é atribuído aos seus anúncios</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-primary/20 bg-muted/30 p-4">
                <p className="text-[9px] font-bold text-primary uppercase tracking-wide mb-1">🟠 GMV Amplo (Broad)</p>
                <p className="text-2xl font-bold font-mono text-primary">{`R$ ${gmvBroad.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ROAS Amplo: <strong className="text-emerald-500">{adsForProduct.roas.toFixed(1)}x</strong></p>
                <p className="text-[9px] text-muted-foreground mt-2">Inclui conversões indiretas — clicou no ad mas comprou outro produto</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide mb-1">🟢 GMV Direto</p>
                <p className="text-2xl font-bold font-mono text-emerald-500">{`R$ ${gmvDireto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ROAS Direto: <strong className="text-emerald-500">{adsForProduct.direct_roas.toFixed(1)}x</strong></p>
                <p className="text-[9px] text-muted-foreground mt-2">Só quem clicou no anúncio e comprou exatamente esse produto</p>
              </div>
            </div>

            {/* Stacked bars */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0">GMV Direto</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctDireto}%` }} />
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-500 w-20 text-right">R$ {gmvDireto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0">GMV Amplo</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </div>
                <span className="text-[10px] font-mono font-semibold text-primary w-20 text-right">R$ {gmvBroad.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Insight box */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[10px] text-amber-600 dark:text-amber-400">
              {pctDireto >= 90
                ? `✅ Ótima atribuição direta: ${pctDireto.toFixed(1)}% do GMV Amplo é direto — seus anúncios convertem quem clicou, sem depender de vendas indiretas.`
                : pctDireto >= 60
                ? `⚡ Atribuição moderada: ${pctDireto.toFixed(1)}% é direto. Parte do faturamento vem do efeito halo dos anúncios.`
                : `⚠️ Muita atribuição indireta: apenas ${pctDireto.toFixed(1)}% é direto. Considere revisar segmentação de campanhas.`}
            </div>
          </div>
        )}

        {/* Ads Impressions/Clicks row */}
        {(product.ads_impressoes || 0) > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox label="Impressões Ads" value={(product.ads_impressoes || 0).toLocaleString('pt-BR')} />
            <MetricBox label="Cliques Ads" value={(product.ads_cliques || 0).toLocaleString('pt-BR')} />
            {adsForProduct && (
              <>
                <MetricBox label="CTR Ads" value={`${adsForProduct.ctr.toFixed(2)}%`} />
                <MetricBox label="Custo/Pedido" value={adsForProduct.orders > 0 ? `R$ ${adsForProduct.cost_per_order.toFixed(2)}` : '—'} />
              </>
            )}
          </div>
        )}

        {/* Conversion Funnel */}
        {hasOrganic && product.impressoes > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">👁 Funil de conversão</p>
            </div>
            <FunnelBar label="Impressões" value={product.impressoes} max={product.impressoes} />
            <FunnelBar label="Cliques" value={product.cliques} max={product.impressoes} pct={product.ctr} pctLabel="CTR" />
            <FunnelBar label="Add ao carrinho" value={product.add_carrinho} max={product.impressoes} pct={product.taxa_carrinho} />
            <FunnelBar label="Pedido pago" value={product.pedidos_pagos} max={product.impressoes} pct={product.taxa_conversao} pctLabel="Conv." color="green" />
          </div>
        )}

        {/* Organic vs Ads */}
        {!isAdsOnly && product.ads_gmv != null && product.ads_gmv > 0 && split && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Orgânico vs Ads</p>
            <div className="h-4 rounded-full overflow-hidden bg-muted flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${split.pct_organico}%` }} />
              <div className="h-full bg-primary transition-all" style={{ width: `${split.pct_ads}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-emerald-500 font-semibold">
                🌱 Orgânico {split.pct_organico.toFixed(0)}% · R$ {split.organico_receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-primary font-semibold">
                📈 Ads {split.pct_ads.toFixed(0)}% · R$ {split.ads_receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

        {/* Ads Detail Section with Tabs */}
        {adsForProduct && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Performance de Ads</p>
              {adsForProduct.days_active > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                  <Calendar className="w-3 h-3" /> {adsForProduct.days_active} dias
                </Badge>
              )}
            </div>

            <Tabs defaultValue="resumo" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger value="resumo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2.5">Resumo</TabsTrigger>
                {adsForProduct.daily_data.length > 0 && (
                  <TabsTrigger value="tendencia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2.5">Tendência</TabsTrigger>
                )}
                {adsForProduct.keywords.length > 0 && (
                  <TabsTrigger value="keywords" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2.5">Keywords</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="resumo" className="mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                  <AdsMetric label="Gasto Total" value={`R$ ${adsForProduct.expense.toFixed(2)}`} />
                  <AdsMetric label="GMV Total" value={`R$ ${adsForProduct.gmv.toFixed(2)}`} />
                  <AdsMetric label="ROAS Amplo" value={`${adsForProduct.roas.toFixed(1)}x`} highlight={adsForProduct.roas >= 3} />
                  <AdsMetric label="ROAS Direto" value={`${adsForProduct.direct_roas.toFixed(1)}x`} highlight={adsForProduct.direct_roas >= 3} />
                  <AdsMetric label="CTR" value={`${adsForProduct.ctr.toFixed(2)}%`} />
                  <AdsMetric label="Custo/Pedido" value={adsForProduct.orders > 0 ? `R$ ${adsForProduct.cost_per_order.toFixed(2)}` : '—'} />
                  <AdsMetric label="Impressões" value={adsForProduct.impressions.toLocaleString('pt-BR')} />
                  <AdsMetric label="Cliques" value={adsForProduct.clicks.toLocaleString('pt-BR')} />
                </div>
                {/* Orders Broad vs Direct */}
                {adsForProduct.direct_orders > 0 && (
                  <div className="p-4 border-t border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Pedidos — Amplo vs Direto</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Pedidos Amplos</p>
                        <p className="text-sm font-bold font-mono text-foreground">{adsForProduct.orders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pedidos Diretos</p>
                        <p className="text-sm font-bold font-mono text-foreground">{adsForProduct.direct_orders}</p>
                        <p className="text-[10px] text-muted-foreground">{adsForProduct.orders > 0 ? ((adsForProduct.direct_orders / adsForProduct.orders) * 100).toFixed(0) : 0}% do total</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {adsForProduct.daily_data.length > 0 && (
                <TabsContent value="tendencia" className="mt-0 p-4">
                  <p className="text-xs font-semibold text-foreground mb-3">Gasto vs GMV diário (Ads)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={adsForProduct.daily_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: string) => {
                          const parts = val.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        interval={Math.max(0, Math.floor(adsForProduct.daily_data.length / 7))}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                        formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name === 'expense' ? 'Gasto' : 'GMV']}
                        labelFormatter={(label: string) => {
                          const parts = label.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                        }}
                      />
                      <Legend formatter={(value: string) => value === 'expense' ? 'Gasto' : 'GMV'} />
                      <Area type="monotone" dataKey="gmv" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
              )}

              {adsForProduct.keywords.length > 0 && (
                <TabsContent value="keywords" className="mt-0">
                  <div className="p-4 pb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">Palavras-chave recomendadas</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-y border-border bg-muted/30">
                          <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Keyword</th>
                          <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Volume</th>
                          <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Bid Sugerido</th>
                          <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Quality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adsForProduct.keywords.map((kw: any, i: number) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 font-medium text-foreground">{kw.keyword}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{(kw.search_volume || 0).toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-primary">R$ {(kw.suggested_bid || 0).toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {kw.quality_score != null ? (
                                <Badge variant={kw.quality_score >= 8 ? 'default' : kw.quality_score >= 5 ? 'secondary' : 'destructive'} className="text-[10px]">
                                  {kw.quality_score}
                                </Badge>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {/* Participation Bars */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Participação no total</p>
          <ShareBar label="% Receita" pct={pctRevenue} color="bg-emerald-500" textColor="text-emerald-500" />
          <ShareBar label="% Unidades" pct={pctUnits} color="bg-primary" textColor="text-primary" />
        </div>

        {/* Variations */}
        {sortedVariacoes.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Variações ({sortedVariacoes.length})</p>
            </div>
            <div className="divide-y divide-border">
              {sortedVariacoes.map((v: any, i: number) => {
                const isTop = i === 0 && sortedVariacoes.length > 1;
                const pct = product.unidades_pagas > 0 ? (v.unidades_pagas / product.unidades_pagas) * 100 : 0;
                return (
                  <div key={v.variacao_id || i} className={`px-4 py-3 ${isTop ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isTop ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <span className="text-muted-foreground text-xs w-5 text-center">{i + 1}</span>}
                        <span className="text-sm font-medium text-foreground truncate">{v.nome_variacao}</span>
                      </div>
                      <span className="text-xs font-mono text-primary font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{v.unidades_pagas} un</span>
                      <span className="font-semibold text-primary">R$ {v.vendas_pago.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        {!isAdsOnly && <InsightsPanel produto={product} />}

        {/* Ads-only info banner */}
        {isAdsOnly && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dados parciais.</strong> Estes são apenas dados de Ads. Importe o relatório de produto do Seller Center para ver o funil completo (impressões orgânicas, CTR, conversão, variações).
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({ borderColor, label, value, sub, valueColor }: {
  borderColor: string; label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className={`rounded-xl border border-border border-t-2 ${borderColor} bg-card p-4`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl md:text-2xl font-bold font-mono mt-1 ${valueColor || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground font-mono mt-0.5">{value}</p>
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
