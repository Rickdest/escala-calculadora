import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet, Upload, TrendingUp, TrendingDown, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Link2, RefreshCw, CheckCircle, Search, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseShopeeAdsCSV, ParsedAdsFile, ParsedAdMetric, deriveMetrics, AdMetricDerived } from '@/lib/shopeeAdsParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Product } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
function truncate(str: string, max: number) { return str.length > max ? str.slice(0, max) + '…' : str; }
function getRoasColorDynamic(roas: number, empate: number, ideal: number) {
  if (roas < empate) return 'text-destructive';
  if (roas < ideal) return 'text-warning';
  return 'text-success';
}
function getAcosColor(acos: number) { return acos <= 20 ? 'text-success' : acos <= 40 ? 'text-warning' : 'text-destructive'; }
function getRoiColor(roi: number) { return roi > 100 ? 'text-success' : roi >= 0 ? 'text-warning' : 'text-destructive'; }

// ─── DB types ───

interface AdsMetricRow {
  id: string;
  product_id: string | null;
  shopee_product_id: string | null;
  shopee_product_name: string | null;
  period_start: string;
  period_end: string;
  impressions: number;
  clicks: number;
  items_sold: number;
  gmv: number;
  spend: number;
  roas: number;
  acos: number;
  avg_position: number | null;
  ctr: number;
  conv_rate: number;
  direct_roas: number;
  direct_acos: number;
  cost_per_conv: number;
}

function rowToMetric(r: AdsMetricRow): AdMetricDerived {
  const m: ParsedAdMetric = {
    shopeeProductId: r.shopee_product_id || '',
    shopeeProductName: r.shopee_product_name || '',
    periodStart: r.period_start,
    periodEnd: r.period_end,
    impressions: r.impressions,
    clicks: r.clicks,
    itemsSold: r.items_sold,
    gmv: Number(r.gmv),
    spend: Number(r.spend),
    roas: Number(r.roas),
    acos: Number(r.acos),
    avgPosition: r.avg_position,
    ctr: Number(r.ctr),
    convRate: Number(r.conv_rate),
    directRoas: Number(r.direct_roas),
    directAcos: Number(r.direct_acos),
    costPerConv: Number(r.cost_per_conv),
  };
  return { ...deriveMetrics(m), _productId: r.product_id, _id: r.id } as any;
}

// ─── Linking Modal ───

interface LinkingModalProps {
  metric: ParsedAdMetric;
  products: Product[];
  onLink: (productId: string) => void;
  onCreate: () => void;
  onSkip: () => void;
  onClose: () => void;
}

function LinkingModal({ metric, products, onLink, onCreate, onSkip, onClose }: LinkingModalProps) {
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-scale-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground text-sm">Produto encontrado</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-2 rounded-lg"><X className="w-4 h-4 text-text-2" /></button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {!showList ? (
            <>
              <div className="surface-card p-3 space-y-1">
                <p className="text-sm font-bold text-foreground">{truncate(metric.shopeeProductName, 50)}</p>
                {metric.shopeeProductId && <p className="text-[11px] text-text-2 font-mono">ID Shopee: {metric.shopeeProductId}</p>}
              </div>
              <p className="text-xs text-text-2">Este produto já está cadastrado no Precify?</p>
              <div className="space-y-2">
                <Button onClick={() => setShowList(true)} variant="outline" className="w-full h-11 justify-start gap-2 text-sm">
                  <Link2 className="w-4 h-4 text-primary" /> Vincular a produto existente
                </Button>
                <Button onClick={onCreate} variant="outline" className="w-full h-11 justify-start gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-primary" /> Criar produto novo
                </Button>
                <Button onClick={onSkip} variant="ghost" className="w-full h-11 justify-start gap-2 text-sm text-text-2">
                  <Upload className="w-4 h-4" /> Importar só os dados de Ads
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-2" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-10 h-10 text-sm" />
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                {filtered.length > 0 ? filtered.map(p => (
                  <button key={p.id} onClick={() => onLink(p.id)} className="w-full text-left p-2.5 rounded-lg hover:bg-surface-2/50 transition-colors">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-text-2">{p.category || 'Sem categoria'} · R$ {p.salePrice.toFixed(2)}</p>
                  </button>
                )) : (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhum produto encontrado</p>
                )}
              </div>
              <Button onClick={() => setShowList(false)} variant="ghost" size="sm" className="w-full">Voltar</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary ───

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-secondary px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={cn('text-lg font-extrabold tabular-nums font-mono mt-0.5 leading-tight', color)}>{value}</p>
    </div>
  );
}

function SummarySection({ metrics }: { metrics: AdMetricDerived[] }) {
  const totals = useMemo(() => {
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const totalGmv = metrics.reduce((s, m) => s + m.gmv, 0);
    const totalItemsSold = metrics.reduce((s, m) => s + m.itemsSold, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgAcos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    const totalLiquidReturn = totalGmv - totalSpend;
    const avgRoi = totalSpend > 0 ? ((totalGmv - totalSpend) / totalSpend) * 100 : 0;
    return { totalSpend, totalGmv, totalItemsSold, avgRoas, avgAcos, totalLiquidReturn, avgRoi };
  }, [metrics]);

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">RESUMO</p>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="INVESTIDO" value={formatCurrency(totals.totalSpend)} color="text-foreground" />
        <MetricCard label="RETORNO LÍQUIDO" value={formatCurrency(totals.totalLiquidReturn)} color={totals.totalLiquidReturn >= 0 ? 'text-success' : 'text-destructive'} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="ROAS" value={totals.avgRoas.toFixed(2)} color={getRoasColor(totals.avgRoas)} />
        <MetricCard label="ACOS" value={`${totals.avgAcos.toFixed(1)}%`} color={getAcosColor(totals.avgAcos)} />
        <MetricCard label="ROI" value={`${totals.avgRoi.toFixed(0)}%`} color={getRoiColor(totals.avgRoi)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="GMV TOTAL" value={formatCurrency(totals.totalGmv)} color="text-foreground" />
        <MetricCard label="VENDIDOS" value={`${totals.totalItemsSold} itens`} color="text-foreground" />
      </div>
    </div>
  );
}

// ─── Alerts ───

type AlertType = 'noreturn' | 'pause' | 'optimize' | 'scale';
const alertConfig: Record<AlertType, { icon: React.ElementType; iconColor: string; rec: string; metricLabel: (m: AdMetricDerived) => string }> = {
  noreturn: { icon: XCircle, iconColor: 'text-destructive', rec: 'Pausar imediatamente', metricLabel: m => `R$${m.spend.toFixed(0)} s/ venda` },
  pause: { icon: TrendingDown, iconColor: 'text-destructive', rec: 'Consumindo sua margem — considere pausar', metricLabel: m => `ROAS ${m.roas.toFixed(2)}` },
  optimize: { icon: AlertTriangle, iconColor: 'text-warning', rec: 'Monitore antes de escalar', metricLabel: m => `ROAS ${m.roas.toFixed(2)}` },
  scale: { icon: TrendingUp, iconColor: 'text-success', rec: 'Performance excelente — aumente o orçamento', metricLabel: m => `ROAS ${m.roas.toFixed(2)}` },
};

function AlertsSection({ metrics }: { metrics: AdMetricDerived[] }) {
  const alerts = useMemo(() => {
    const result: Array<{ type: AlertType; metric: AdMetricDerived }> = [];
    for (const m of metrics) {
      if (m.spend > 0 && m.roas === 0) result.push({ type: 'noreturn', metric: m });
      else if (m.roas > 0 && m.roas < 2) result.push({ type: 'pause', metric: m });
      else if (m.roas >= 2 && m.roas < 5) result.push({ type: 'optimize', metric: m });
      else if (m.roas >= 5) result.push({ type: 'scale', metric: m });
    }
    const order: Record<AlertType, number> = { noreturn: 0, pause: 1, optimize: 2, scale: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);
    return result;
  }, [metrics]);

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">ALERTAS</p>
      <div className="rounded-xl border border-border bg-secondary divide-y divide-border overflow-hidden">
        {alerts.map((alert, i) => {
          const cfg = alertConfig[alert.type];
          const Icon = cfg.icon;
          const isOpen = expandedIdx === i;
          return (
            <div key={i}>
              <button onClick={() => setExpandedIdx(isOpen ? null : i)} className="w-full h-12 flex items-center gap-3 px-3 text-left hover:bg-card/50 transition-colors">
                <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.iconColor)} />
                <span className="text-[13px] font-semibold text-foreground truncate flex-1">{truncate(alert.metric.shopeeProductName, 28)}</span>
                <span className={cn('text-xs font-bold font-mono tabular-nums flex-shrink-0', cfg.iconColor)}>{cfg.metricLabel(alert.metric)}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>
              {isOpen && <div className="px-3 pb-2.5 pl-10"><p className="text-[11px] text-muted-foreground">{cfg.rec}</p></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ranking ───

function RoasBar({ roas, empate, ideal }: { roas: number; empate?: number; ideal?: number }) {
  const e = empate ?? 2;
  const id = ideal ?? 5;
  const maxRoas = Math.max(10, roas * 1.3, id * 1.5);
  const pos = Math.min((roas / maxRoas) * 100, 100);
  const empatePos = (e / maxRoas) * 100;
  const idealPos = (id / maxRoas) * 100;
  return (
    <div className="space-y-1">
      <div className="relative w-full h-1.5 rounded-full overflow-hidden">
        <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, hsl(0 85% 60%) 0%, hsl(45 95% 50%) ${empatePos}%, hsl(152 70% 42%) ${idealPos}%, hsl(152 70% 42%) 100%)`, opacity: 0.25 }} />
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pos}%`, backgroundColor: roas >= id ? 'hsl(152,70%,42%)' : roas >= e ? 'hsl(45,95%,50%)' : 'hsl(0,85%,60%)' }} />
      </div>
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold">
        <span>0</span><span className="flex-1" />
        <span className="text-warning">Empate {e.toFixed(1)}</span>
        <span className="text-success">Ideal {id.toFixed(1)}</span>
        <span className={cn('font-mono', getRoasColor(roas))}>{roas.toFixed(2)}</span>
      </div>
    </div>
  );
}

function RankingSection({ metrics, products }: { metrics: AdMetricDerived[]; products: Product[] }) {
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const sorted = useMemo(() => [...metrics].sort((a, b) => b.roas - a.roas), [metrics]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Compute dynamic empate/ideal per metric
  const getProductRoasTargets = useCallback((m: AdMetricDerived) => {
    if (!config) return { empate: 2, ideal: 5 };
    const pid = (m as any)._productId;
    const product = pid ? products.find(p => p.id === pid) : null;
    if (!product || product.salePrice <= 0) return { empate: 2, ideal: 5 };
    const result = calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost, 0, 0);
    if (result.margemInsuficiente || !result.roasEmpate) return { empate: 2, ideal: 5 };
    return { empate: result.roasEmpate, ideal: result.roasIdeal || 5 };
  }, [config, products]);

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">RANKING</p>
      <div className="rounded-xl border border-border bg-secondary divide-y divide-border overflow-hidden">
        {sorted.map((m, i) => {
          const isOpen = expandedIndex === i;
          const StatusIcon = m.roas >= 5 ? TrendingUp : m.roas >= 2 ? AlertTriangle : TrendingDown;
          const statusColor = getRoasColor(m.roas);
          const targets = getProductRoasTargets(m);
          return (
            <div key={i}>
              <button onClick={() => setExpandedIndex(isOpen ? null : i)} className="w-full p-2.5 md:p-3.5 flex items-center gap-2 text-left hover:bg-card/50 transition-colors">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold font-mono flex-shrink-0', i < 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-muted-foreground')}>#{i + 1}</span>
                <div className="flex-1 min-w-0 px-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-foreground truncate">{truncate(m.shopeeProductName, 24)}</p>
                    <StatusIcon className={cn('w-4 h-4 flex-shrink-0', statusColor)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums mt-0.5">{formatCurrency(m.spend)} → {formatCurrency(m.gmv)}</p>
                </div>
                <span className={cn('text-[15px] font-extrabold tabular-nums font-mono flex-shrink-0', statusColor)}>{m.roas.toFixed(2)}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-2.5 pb-2.5 md:px-3.5 md:pb-3.5 space-y-3 animate-fade-in">
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><p className="text-[9px] text-muted-foreground uppercase">ACOS</p><p className={cn('text-[13px] font-bold font-mono tabular-nums', getAcosColor(m.acos))}>{m.acos.toFixed(1)}%</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase">ROI</p><p className={cn('text-[13px] font-bold font-mono tabular-nums', getRoiColor(m.roi))}>{m.roi.toFixed(0)}%</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase">CTR</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.ctr.toFixed(2)}%</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase">CONV</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.convRate.toFixed(2)}%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-muted-foreground uppercase">RETORNO LÍQUIDO</p><p className={cn('text-[13px] font-bold font-mono tabular-nums', m.liquidReturn >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(m.liquidReturn)}</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase">VENDIDOS</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.itemsSold} itens</p></div>
                  </div>
                  {m.avgPosition !== null && (
                    <div><p className="text-[9px] text-muted-foreground uppercase">POSIÇÃO MÉDIA</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">#{m.avgPosition}</p></div>
                  )}
                  <RoasBar roas={m.roas} empate={targets.empate} ideal={targets.ideal} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Margin vs Ads ───

function MarginSection({ metrics, products }: { metrics: AdMetricDerived[]; products: Product[] }) {
  const { currentStore, calculateProduct } = useStore();
  const config = currentStore?.config;
  const matches = useMemo(() => {
    const result: Array<{ metric: AdMetricDerived; product: Product }> = [];
    for (const m of metrics) {
      const pid = (m as any)._productId;
      let match = pid ? products.find(p => p.id === pid) : null;
      if (!match && m.shopeeProductName) {
        const adWords = m.shopeeProductName.toLowerCase().split(/\s+/).slice(0, 3);
        if (adWords.length >= 2) {
          match = products.find(p => {
            const pWords = p.name.toLowerCase().split(/\s+/);
            return adWords.filter(w => pWords.some(pw => pw.includes(w))).length >= 2;
          });
        }
      }
      if (match) result.push({ metric: m, product: match });
    }
    return result;
  }, [metrics, products]);

  if (matches.length === 0 || !config) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MARGEM vs ADS</p>
      <div className="space-y-2">
        {matches.map(({ metric: m, product }, i) => {
          // BUG 3 FIX: Use calculateProduct for real margin with ALL costs
          const calc = calculateProduct(product, config);
          const margin = calc.realMargin;
          const marginWithAds = margin - m.acos;
          let StatusIcon: React.ElementType, color: string, message: string;
          if (marginWithAds >= 17) { StatusIcon = TrendingUp; color = 'text-success'; message = 'Margem excelente mesmo com ads'; }
          else if (marginWithAds >= 10) { StatusIcon = CheckCircle; color = 'text-success'; message = 'Você lucra mesmo anunciando'; }
          else if (marginWithAds >= 0) { StatusIcon = AlertTriangle; color = 'text-warning'; message = 'Margem apertada — otimize o ACOS'; }
          else { StatusIcon = XCircle; color = 'text-destructive'; message = 'Ads estão consumindo toda a margem'; }
          return (
            <div key={i} className="rounded-xl border border-border bg-secondary p-3.5 space-y-2">
              <div className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /><p className="text-sm font-bold text-foreground truncate flex-1">{truncate(product.name, 35)}</p></div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Margem do produto:</span><span className="font-bold font-mono tabular-nums">{margin.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ACOS do anúncio:</span><span className="font-bold font-mono tabular-nums">{m.acos.toFixed(1)}%</span></div>
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Margem c/ ads:</span><span className={cn('text-sm font-extrabold font-mono tabular-nums flex items-center gap-1', color)}>{marginWithAds.toFixed(1)}%<StatusIcon className="w-3.5 h-3.5" /></span></div>
                <p className="text-[11px] text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Empty State ───

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2 mt-4">
        <p className="text-[15px] font-bold text-foreground">Importe seu relatório de Ads</p>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mx-auto">Exporte "Dados Gerais de Anúncios" no painel da Shopee e importe aqui</p>
      </div>
      <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mt-6">
        <Upload className="w-4 h-4" /> Importar relatório CSV
      </Button>
      <p className="text-[11px] text-muted-foreground mt-3">Shopee Ads → Exportar dados → Dados Gerais de Anúncios</p>
    </div>
  );
}

// ─── Main AdsTab ───

export function AdsTab() {
  const { currentStore, addProduct, updateProduct } = useStore();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [dbMetrics, setDbMetrics] = useState<AdsMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');

  // Linking flow state
  const [pendingMetrics, setPendingMetrics] = useState<ParsedAdMetric[]>([]);
  const [currentLinkIdx, setCurrentLinkIdx] = useState(0);

  const products = currentStore?.products || [];

  // Load from DB
  const loadMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('product_ads_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('roas', { ascending: false });
    if (data) setDbMetrics(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const derivedMetrics = useMemo(() => dbMetrics.map(rowToMetric), [dbMetrics]);

  const periodLabel = useMemo(() => {
    if (dbMetrics.length === 0) return '';
    const starts = dbMetrics.map(m => m.period_start).sort();
    const ends = dbMetrics.map(m => m.period_end).sort();
    const s = starts[0], e = ends[ends.length - 1];
    if (s && e) {
      const fmt = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
      return `${fmt(s)} – ${fmt(e)}`;
    }
    return period;
  }, [dbMetrics, period]);

  // Import flow
  const handleImport = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseShopeeAdsCSV(text);
      if (!parsed || parsed.metrics.length === 0) { toast.error('CSV inválido ou sem dados'); return; }
      setPeriod(parsed.period);

      // Check auto-linking
      const toLink: ParsedAdMetric[] = [];
      let autoLinked = 0;

      for (const metric of parsed.metrics) {
        // Check if shopee_product_id already mapped to a product
        const existingProduct = products.find(p => (p as any).shopeeProductId === metric.shopeeProductId);
        if (existingProduct) {
          await saveMetricToDB(metric, existingProduct.id);
          autoLinked++;
        } else {
          toLink.push(metric);
        }
      }

      if (autoLinked > 0) toast.success(`${autoLinked} produto(s) vinculados automaticamente`);

      if (toLink.length > 0) {
        setPendingMetrics(toLink);
        setCurrentLinkIdx(0);
      } else {
        await loadMetrics();
      }
    } catch { toast.error('Erro ao ler o arquivo'); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const saveMetricToDB = async (metric: ParsedAdMetric, productId?: string) => {
    if (!user) return;
    // Delete existing metrics for this shopee product to avoid duplicates
    if (metric.shopeeProductId) {
      await supabase.from('product_ads_metrics').delete().eq('user_id', user.id).eq('shopee_product_id', metric.shopeeProductId);
    }
    await supabase.from('product_ads_metrics').insert({
      user_id: user.id,
      product_id: productId || null,
      shopee_product_id: metric.shopeeProductId || null,
      shopee_product_name: metric.shopeeProductName || null,
      period_start: metric.periodStart,
      period_end: metric.periodEnd,
      impressions: metric.impressions,
      clicks: metric.clicks,
      items_sold: metric.itemsSold,
      gmv: metric.gmv,
      spend: metric.spend,
      roas: metric.roas,
      acos: metric.acos,
      avg_position: metric.avgPosition,
      ctr: metric.ctr,
      conv_rate: metric.convRate,
      direct_roas: metric.directRoas,
      direct_acos: metric.directAcos,
      cost_per_conv: metric.costPerConv,
    } as any);
  };

  const handleLink = async (productId: string) => {
    const metric = pendingMetrics[currentLinkIdx];
    // Update product with shopee_product_id
    await updateProduct(productId, { shopeeProductId: metric.shopeeProductId } as any);
    await saveMetricToDB(metric, productId);
    toast.success('Produto vinculado com sucesso');
    advanceLinking();
  };

  const handleCreate = async () => {
    const metric = pendingMetrics[currentLinkIdx];
    const newProduct = {
      storeId: currentStore?.id || '',
      name: metric.shopeeProductName.slice(0, 100),
      costPrice: 0,
      salePrice: 0,
      packagingCost: 0,
      adsCost: 0,
      adsRevenue: 0,
      stockQuantity: 0,
      minStockQuantity: 5,
      hasVariations: false,
      attributes: [],
      variations: [],
      shopeeAcelera: 'none' as const,
    };
    // BUG 5 FIX: Use return value from addProduct and update with shopeeProductId
    const created = await addProduct(newProduct);
    await updateProduct(created.id, { shopeeProductId: metric.shopeeProductId } as any);
    await saveMetricToDB(metric, created.id);
    toast.success('Produto criado — complete preço de venda e custo');
    advanceLinking();
  };

  const handleSkip = async () => {
    const metric = pendingMetrics[currentLinkIdx];
    await saveMetricToDB(metric);
    toast.info('Dados importados sem vínculo');
    advanceLinking();
  };

  const advanceLinking = () => {
    if (currentLinkIdx < pendingMetrics.length - 1) {
      setCurrentLinkIdx(prev => prev + 1);
    } else {
      setPendingMetrics([]);
      setCurrentLinkIdx(0);
      loadMetrics();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  const hasData = derivedMetrics.length > 0;

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

      {/* Linking modal */}
      {pendingMetrics.length > 0 && pendingMetrics[currentLinkIdx] && (
        <LinkingModal
          metric={pendingMetrics[currentLinkIdx]}
          products={products}
          onLink={handleLink}
          onCreate={handleCreate}
          onSkip={handleSkip}
          onClose={() => { setPendingMetrics([]); loadMetrics(); }}
        />
      )}

      {!hasData ? (
        <EmptyState onImport={handleImport} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-foreground">{periodLabel && <span className="text-muted-foreground font-normal">· {periodLabel}</span>}</p>
            <Button size="sm" variant="outline" onClick={handleImport} className="h-8 text-[11px] gap-1.5 rounded-lg">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </Button>
          </div>

          {/* Desktop 2-column */}
          <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-6 space-y-4 md:space-y-0">
            <div className="space-y-4">
              <SummarySection metrics={derivedMetrics} />
              <AlertsSection metrics={derivedMetrics} />
            </div>
            <div className="space-y-4">
              <RankingSection metrics={derivedMetrics} products={products} />
              <MarginSection metrics={derivedMetrics} products={products} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
