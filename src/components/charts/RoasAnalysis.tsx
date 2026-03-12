import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, Product } from '@/types/store';
import { cn } from '@/lib/utils';
import {
  Target, AlertTriangle, TrendingUp, TrendingDown, Sliders, Upload,
  FileSpreadsheet, Trash2, Eye, Package, Search, DollarSign,
  BarChart3, PieChart, Zap, ArrowUpRight, ArrowDownRight, Percent, ShoppingCart
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseShopeeCSV, ShopeeAdsReport, ShopeeAdRow } from '@/lib/shopeeAdsParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
  Legend
} from 'recharts';
import { TooltipLabel, getTooltipText } from '@/components/roas/TooltipLabel';
import { ProductHealthBanner } from '@/components/roas/ProductHealthBanner';
import { MonthlySalesSimulation } from '@/components/roas/MonthlySalesSimulation';
import { ShareResult } from '@/components/roas/ShareResult';
import { SavedProducts, SavedRoasProduct } from '@/components/roas/SavedProducts';

// ─── Shared Utilities ───

interface RoasResult {
  roasAtual: number | null;
  roasEmpate: number | null;
  roasIdeal: number | null;
  lucroBruto: number;
  taxaShopee: number;
  valorRecebido: number;
  margemInsuficiente: boolean;
}

function calcRoasFromValues(precoVenda: number, custoP: number, gastoAds: number, receitaAds: number): RoasResult {
  const fee = getShopeeFeeForPrice(precoVenda);
  const taxaShopee = (precoVenda * fee.percent / 100) + fee.fixed;
  const valorRecebido = precoVenda - taxaShopee;
  const lucroBruto = valorRecebido - custoP;
  if (lucroBruto <= 0) {
    return { roasAtual: null, roasEmpate: null, roasIdeal: null, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: true };
  }
  const roasEmpate = parseFloat((precoVenda / lucroBruto).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate * 1.4).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;
  return { roasAtual, roasEmpate, roasIdeal, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: false };
}

function getRoasStatus(roasAtual: number, roasEmpate: number, roasIdeal: number) {
  if (roasAtual < roasEmpate) return 'danger';
  if (roasAtual < roasIdeal) return 'warning';
  return 'success';
}

function getRoasMessage(status: string) {
  switch (status) {
    case 'danger': return 'Os anúncios estão gerando prejuízo. Reduza o gasto ou otimize as palavras-chave.';
    case 'warning': return 'Gerando lucro, mas ainda há espaço para otimizar antes de escalar.';
    case 'success': return 'Campanha saudável! Pronta para escalar com segurança.';
    default: return '';
  }
}

function getRoasEmoji(status: string) {
  switch (status) {
    case 'danger': return '🔴';
    case 'warning': return '🟡';
    case 'success': return '🟢';
    default: return '';
  }
}

const statusColors = { danger: 'text-destructive', warning: 'text-warning', success: 'text-success' };
const statusBg = { danger: 'bg-destructive/10 border-destructive/30', warning: 'bg-warning/10 border-warning/30', success: 'bg-success/10 border-success/30' };
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CHART_COLORS = [
  'hsl(16, 100%, 50%)',
  'hsl(152, 70%, 42%)',
  'hsl(40, 95%, 50%)',
  'hsl(220, 70%, 55%)',
  'hsl(280, 70%, 55%)',
];

// ─── ROAS Gauge Chart ───

function RoasGauge({ roasAtual, roasEmpate, roasIdeal, status }: {
  roasAtual: number; roasEmpate: number; roasIdeal: number; status: string;
}) {
  const maxVal = Math.max(roasIdeal * 1.5, roasAtual * 1.2);
  const percent = Math.min((roasAtual / maxVal) * 100, 100);
  const fillColor = status === 'danger' ? 'hsl(0, 85%, 60%)' : status === 'warning' ? 'hsl(40, 95%, 50%)' : 'hsl(152, 70%, 42%)';

  const data = [{ name: 'ROAS', value: percent, fill: fillColor }];

  return (
    <div className="relative w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%" cy="85%" innerRadius="70%" outerRadius="100%"
          startAngle={180} endAngle={0} barSize={14} data={data}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={8}
            background={{ fill: 'hsl(var(--secondary))' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className={cn('text-4xl font-extrabold tabular-nums', statusColors[status as keyof typeof statusColors])}>
          {roasAtual.toFixed(2)}
        </p>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">ROAS ATUAL</p>
      </div>
    </div>
  );
}

// ─── Cost Breakdown Donut ───

function CostBreakdownChart({ product, roasData }: { product: Product; roasData: RoasResult }) {
  const data = useMemo(() => [
    { name: 'Custo Produto', value: product.costPrice, color: CHART_COLORS[0] },
    { name: 'Taxa Shopee', value: roasData.taxaShopee, color: CHART_COLORS[1] },
    { name: 'Lucro', value: Math.max(0, roasData.lucroBruto), color: CHART_COLORS[2] },
  ], [product, roasData]);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <RechartsPie data={data}>
          <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
        </RechartsPie>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground flex-1">{item.name}</span>
            <span className="font-bold tabular-nums">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ───

function KpiCard({ icon: Icon, label, value, subValue, variant = 'default', highlight = false, tooltipKey }: {
  icon: React.ElementType; label: string; value: string; subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  highlight?: boolean;
  tooltipKey?: string;
}) {
  const variants = {
    default: 'bg-card border-border/50',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    danger: 'bg-destructive/5 border-destructive/20',
  };
  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
  };

  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-all duration-300 hover:shadow-md',
      variants[variant],
      highlight && 'ring-2 ring-primary/30 shadow-lg shadow-primary/10 scale-[1.02]'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'rounded-xl flex items-center justify-center flex-shrink-0',
          iconVariants[variant],
          highlight ? 'w-11 h-11' : 'w-9 h-9'
        )}>
          <Icon className={highlight ? 'w-5 h-5' : 'w-4.5 h-4.5'} />
        </div>
        <div className="min-w-0">
          {tooltipKey ? (
            <TooltipLabel label={label} tooltip={getTooltipText(tooltipKey)} />
          ) : (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
          )}
          <p className={cn('font-extrabold tabular-nums leading-tight', highlight ? 'text-2xl' : 'text-lg')}>{value}</p>
          {subValue && <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Product Selector ───

function ProductSelector({ products, selectedId, onSelect }: { products: Product[]; selectedId: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="space-y-2.5">
      {products.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 input-modern h-9 text-sm" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin">
        {filtered.map(p => {
          const isActive = p.id === selectedId;
          const roasData = calcRoasFromValues(p.salePrice, p.costPrice, p.adsCost, p.adsRevenue);
          const hasAds = p.adsCost > 0;

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 border group active:scale-[0.98]',
                isActive
                  ? 'bg-primary/10 border-primary/40 shadow-sm shadow-primary/10'
                  : 'bg-card/50 border-border/30 hover:bg-primary/5 hover:border-primary/20'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isActive ? 'bg-primary/20' : 'bg-secondary group-hover:bg-primary/10'
              )}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <Package className={cn('w-5 h-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70')} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate transition-colors', isActive ? 'text-primary' : 'text-foreground')}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(p.salePrice)}</span>
                  {hasAds && roasData.roasAtual !== null && !roasData.margemInsuficiente && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                      roasData.roasAtual >= (roasData.roasIdeal || 0) ? 'bg-success/15 text-success' :
                      roasData.roasAtual >= (roasData.roasEmpate || 0) ? 'bg-warning/15 text-warning' :
                      'bg-destructive/15 text-destructive'
                    )}>
                      {roasData.roasAtual.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && search.trim() && (
        <p className="text-center text-xs text-muted-foreground py-3">Nenhum produto encontrado</p>
      )}
    </div>
  );
}

// ─── Product Import Section ───

interface SavedReport {
  id: string;
  report_period: string;
  shop_name: string;
  imported_at: string;
  ads_data: ShopeeAdRow[];
  product_id: string | null;
}

function ProductAdsImport({ product, storeId }: { product: Product; storeId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [parsedReport, setParsedReport] = useState<ShopeeAdsReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ads_reports').select('*')
      .eq('store_id', storeId).eq('product_id', product.id)
      .order('imported_at', { ascending: false });
    if (data) {
      setSavedReports(data.map(r => ({
        ...r, ads_data: (r.ads_data as unknown as ShopeeAdRow[]) || [],
        product_id: (r as any).product_id || null,
      })));
    }
    setLoading(false);
  }, [storeId, product.id]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV exportado da Shopee'); return; }
    setImporting(true);
    try {
      const text = await file.text();
      const report = parseShopeeCSV(text);
      if (!report || report.ads.length === 0) { toast.error('CSV inválido ou sem dados de Ads.'); return; }
      setParsedReport(report);
      toast.success(`${report.ads.length} anúncios encontrados!`);
    } catch { toast.error('Erro ao ler o arquivo'); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSaveReport = async () => {
    if (!parsedReport) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login para salvar relatórios'); return; }
    const { error } = await supabase.from('ads_reports').insert([{
      user_id: user.id, store_id: storeId, product_id: product.id,
      report_period: parsedReport.period, shop_name: parsedReport.shopName,
      ads_data: JSON.parse(JSON.stringify(parsedReport.ads)),
    }]);
    if (error) { toast.error('Erro ao salvar relatório'); console.error(error); }
    else { toast.success('Relatório salvo!'); setParsedReport(null); loadReports(); }
  };

  const handleDeleteReport = async (id: string) => {
    const { error } = await supabase.from('ads_reports').delete().eq('id', id);
    if (!error) { toast.success('Relatório removido'); loadReports(); if (viewingReport?.id === id) setViewingReport(null); }
  };

  const displayAds = viewingReport ? viewingReport.ads_data : parsedReport?.ads;
  const displayTitle = viewingReport ? `${viewingReport.shop_name} — ${viewingReport.report_period}` : parsedReport ? `${parsedReport.shopName} — ${parsedReport.period}` : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground">Relatórios de Ads</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 rounded-lg active:scale-95 transition-transform" onClick={() => setShowImport(!showImport)}>
          <Upload className="w-3 h-3" />
          Importar CSV
        </Button>
      </div>

      {showImport && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2 transition-all animate-fade-in">
          <Upload className="w-8 h-8 text-primary/60 mx-auto" />
          <p className="text-xs text-muted-foreground">Exporte o relatório de Ads da Shopee (CSV)</p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" size="sm" className="h-8 text-xs active:scale-95 transition-transform">
            {importing ? 'Importando...' : 'Selecionar arquivo'}
          </Button>
        </div>
      )}

      {parsedReport && !viewingReport && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{parsedReport.shopName}</p>
              <p className="text-[10px] text-muted-foreground">{parsedReport.period}</p>
            </div>
            <Button size="sm" onClick={handleSaveReport} className="gradient-primary h-7 text-xs active:scale-95 transition-transform">💾 Salvar</Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Investido', value: formatCurrency(parsedReport.totals.totalSpend), color: 'text-destructive' },
              { label: 'Receita', value: formatCurrency(parsedReport.totals.totalGmv), color: 'text-success' },
              { label: 'ROAS', value: parsedReport.totals.avgRoas.toFixed(2), color: 'text-primary' },
              { label: 'Vendidos', value: String(parsedReport.totals.totalItemsSold), color: 'text-foreground' },
            ].map(item => (
              <div key={item.label} className="p-2 rounded-lg bg-card/80 text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{item.label}</p>
                <p className={cn('text-sm font-extrabold tabular-nums', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedReports.length > 0 && (
        <div className="space-y-1.5">
          {savedReports.map(report => (
            <div key={report.id} className={cn('rounded-xl border p-2.5 flex items-center gap-2.5 transition-all', viewingReport?.id === report.id ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-card/50')}>
              <FileSpreadsheet className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{report.shop_name || 'Relatório'}</p>
                <p className="text-[10px] text-muted-foreground">{report.report_period} • {report.ads_data.length} anúncios</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewingReport(viewingReport?.id === report.id ? null : report)}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteReport(report.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-center text-xs text-muted-foreground py-2">Carregando...</p>}

      {displayAds && displayAds.length > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/50 p-3 space-y-2 animate-fade-in">
          {displayTitle && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{displayTitle}</p>}
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
            {displayAds.map((ad, i) => {
              const roasVal = ad.roas;
              const adStatus = ad.spend === 0 ? null : roasVal >= 5 ? 'success' : roasVal >= 2 ? 'warning' : 'danger';
              return (
                <div key={i} className="p-2.5 rounded-lg bg-secondary/30 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold truncate flex-1">{ad.adName}</p>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                      ad.status === 'Pausado' ? 'bg-warning/20 text-warning' : ad.status === 'Encerrado' ? 'bg-muted text-muted-foreground' : 'bg-success/20 text-success'
                    )}>{ad.status}</span>
                  </div>
                  {(ad.keyword || ad.positioning) && (
                    <div className="flex flex-wrap gap-1">
                      {ad.keyword && ad.keyword !== '-' && <span className="text-[9px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">🔍 {ad.keyword}</span>}
                      {ad.positioning && ad.positioning !== '-' && <span className="text-[9px] bg-secondary text-muted-foreground font-medium px-1.5 py-0.5 rounded-full">📍 {ad.positioning}</span>}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div><p className="text-muted-foreground">Gasto</p><p className="font-bold text-destructive">{formatCurrency(ad.spend)}</p></div>
                    <div><p className="text-muted-foreground">GMV</p><p className="font-bold text-success">{formatCurrency(ad.gmv)}</p></div>
                    <div><p className="text-muted-foreground">ROAS</p><p className={cn('font-bold', adStatus ? statusColors[adStatus as keyof typeof statusColors] : 'text-muted-foreground')}>{roasVal.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Vendidos</p><p className="font-bold">{ad.itemsSold}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && savedReports.length === 0 && !parsedReport && !showImport && (
        <p className="text-[10px] text-muted-foreground text-center py-2 italic">Nenhum relatório importado para este produto</p>
      )}
    </div>
  );
}

// ─── ROAS Dashboard (Product Analysis) ───

function ProductAnalysis() {
  const { currentStore, updateProduct } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [gastoAds, setGastoAds] = useState<string>('');
  const [receitaAds, setReceitaAds] = useState<string>('');

  const selectedProduct = useMemo(() => {
    if (!currentStore || !selectedProductId) return null;
    return currentStore.products.find(p => p.id === selectedProductId) || null;
  }, [currentStore, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      setGastoAds(selectedProduct.adsCost > 0 ? String(selectedProduct.adsCost) : '');
      setReceitaAds(selectedProduct.adsRevenue > 0 ? String(selectedProduct.adsRevenue) : '');
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const timeout = setTimeout(() => {
      const newGasto = parseFloat(gastoAds) || 0;
      const newReceita = parseFloat(receitaAds) || 0;
      if (newGasto !== selectedProduct.adsCost || newReceita !== selectedProduct.adsRevenue) {
        updateProduct(selectedProduct.id, { adsCost: newGasto, adsRevenue: newReceita });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [gastoAds, receitaAds, selectedProduct?.id]);

  const roasData = useMemo(() => {
    if (!selectedProduct) return null;
    return calcRoasFromValues(selectedProduct.salePrice, selectedProduct.costPrice, parseFloat(gastoAds) || 0, parseFloat(receitaAds) || 0);
  }, [selectedProduct, gastoAds, receitaAds]);

  const marginPercent = useMemo(() => {
    if (!roasData || !selectedProduct) return 0;
    return (roasData.lucroBruto / selectedProduct.salePrice) * 100;
  }, [roasData, selectedProduct]);

  const status = roasData && !roasData.margemInsuficiente && roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal
    ? getRoasStatus(roasData.roasAtual, roasData.roasEmpate, roasData.roasIdeal) : null;

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <p className="text-base font-bold text-foreground mb-1">Nenhum produto cadastrado</p>
        <p className="text-sm text-muted-foreground max-w-xs">Adicione seus produtos na página Produtos para começar a analisar o ROAS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Product Selector */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <Label className="text-sm font-bold">Selecione o Produto</Label>
        </div>
        <ProductSelector products={currentStore.products} selectedId={selectedProductId} onSelect={setSelectedProductId} />
      </div>

      {selectedProduct && (
        <div className="space-y-5 animate-fade-in">
          {/* Ads Input Card */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold">Dados de Ads</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <TooltipLabel label="Gasto em Ads (R$)" tooltip={getTooltipText('gasto_ads')} />
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="0,00" className="input-modern h-11 text-base font-semibold" />
              </div>
              <div className="space-y-1.5">
                <TooltipLabel label="Receita Ads (R$)" tooltip={getTooltipText('receita_ads')} />
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="0,00" className="input-modern h-11 text-base font-semibold" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" /> Valores salvos automaticamente
            </p>
          </div>

          {/* Product Health Banner */}
          {roasData && !roasData.margemInsuficiente && (
            <ProductHealthBanner marginPercent={marginPercent} />
          )}

          {/* ROAS Dashboard */}
          {roasData && !roasData.margemInsuficiente && (
            <>
              {/* Gauge + KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gauge */}
                <div className="glass-card p-4">
                  {roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal && status ? (
                    <RoasGauge roasAtual={roasData.roasAtual} roasEmpate={roasData.roasEmpate} roasIdeal={roasData.roasIdeal} status={status} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[180px] text-center">
                      <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">Preencha o gasto e a receita de Ads</p>
                    </div>
                  )}
                </div>

                {/* Cost Breakdown */}
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    <p className="text-xs font-bold text-foreground">Composição do Preço</p>
                  </div>
                  <CostBreakdownChart product={selectedProduct} roasData={roasData} />
                </div>
              </div>

              {/* KPI Cards — ROAS Ideal highlighted */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={Target}
                  label="ROAS Empate"
                  value={roasData.roasEmpate!.toFixed(2) + 'x'}
                  subValue="Mínimo para não perder"
                  variant="warning"
                  tooltipKey="roas_empate"
                />
                <KpiCard
                  icon={TrendingUp}
                  label="ROAS Ideal"
                  value={roasData.roasIdeal!.toFixed(2) + 'x'}
                  subValue="Meta saudável"
                  variant="success"
                  highlight
                  tooltipKey="roas_ideal"
                />
                <KpiCard
                  icon={DollarSign}
                  label="Lucro Bruto"
                  value={formatCurrency(roasData.lucroBruto)}
                  subValue="Antes de Ads"
                  variant={roasData.lucroBruto > 0 ? 'success' : 'danger'}
                  tooltipKey="lucro_bruto"
                />
                <KpiCard
                  icon={Percent}
                  label="Taxa Shopee"
                  value={formatCurrency(roasData.taxaShopee)}
                  subValue={`${((roasData.taxaShopee / selectedProduct.salePrice) * 100).toFixed(1)}% do preço`}
                  variant="default"
                  tooltipKey="taxa_shopee"
                />
              </div>

              {/* Share + Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <ShareResult
                  productName={selectedProduct.name}
                  salePrice={selectedProduct.salePrice}
                  lucroBruto={roasData.lucroBruto}
                  roasEmpate={roasData.roasEmpate}
                  roasIdeal={roasData.roasIdeal}
                  status={status as 'danger' | 'warning' | 'success' | null}
                />
              </div>

              {/* Status Banner */}
              {status && (
                <div className={cn('rounded-2xl border p-4 flex items-start gap-3 transition-all animate-fade-in', statusBg[status as keyof typeof statusBg])}>
                  <span className="text-xl">{getRoasEmoji(status)}</span>
                  <div>
                    <p className={cn('font-bold text-sm', statusColors[status as keyof typeof statusColors])}>
                      {status === 'danger' ? 'Atenção' : status === 'warning' ? 'Quase lá' : 'Excelente!'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{getRoasMessage(status)}</p>
                  </div>
                </div>
              )}

              {/* ROAS Progress Bar */}
              {roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal && status && (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <TooltipLabel label="Posição do ROAS" tooltip={getTooltipText('roas')} />
                  </div>
                  <div className="relative pt-1">
                    <div className="w-full h-4 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out',
                          status === 'danger' && 'bg-gradient-to-r from-destructive/80 to-destructive',
                          status === 'warning' && 'bg-gradient-to-r from-warning/80 to-warning',
                          status === 'success' && 'bg-gradient-to-r from-success/80 to-success',
                        )}
                        style={{ width: `${Math.min((roasData.roasAtual / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100, 100)}%` }}
                      />
                    </div>
                    {/* Markers */}
                    <div className="absolute top-1 h-4 w-0.5 bg-warning/80 rounded-full" style={{ left: `${(roasData.roasEmpate / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%` }} />
                    <div className="absolute top-1 h-4 w-0.5 bg-success/80 rounded-full" style={{ left: `${(roasData.roasIdeal / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                    <span>0</span>
                    <span className="text-warning">⚡ Empate {roasData.roasEmpate.toFixed(1)}</span>
                    <span className="text-success">🎯 Ideal {roasData.roasIdeal.toFixed(1)}</span>
                  </div>
                </div>
              )}

              {/* Monthly Sales Simulation */}
              {roasData.roasEmpate && (
                <MonthlySalesSimulation
                  salePrice={selectedProduct.salePrice}
                  costPrice={selectedProduct.costPrice}
                  taxaShopee={roasData.taxaShopee}
                  lucroBruto={roasData.lucroBruto}
                  roasEmpate={roasData.roasEmpate}
                />
              )}

              {/* Detalhamento */}
              <div className="glass-card p-4 space-y-2.5">
                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" /> Detalhamento Financeiro
                </p>
                <div className="divide-y divide-border/30">
                  {[
                    { label: 'Preço de Venda', value: formatCurrency(selectedProduct.salePrice), icon: ArrowUpRight, color: 'text-foreground' },
                    { label: 'Taxa Shopee', value: `-${formatCurrency(roasData.taxaShopee)}`, icon: ArrowDownRight, color: 'text-destructive' },
                    { label: 'Valor Recebido', value: formatCurrency(roasData.valorRecebido), icon: DollarSign, color: 'text-foreground' },
                    { label: 'Custo do Produto', value: `-${formatCurrency(selectedProduct.costPrice)}`, icon: ArrowDownRight, color: 'text-destructive' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums', item.color)}>{item.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-sm font-extrabold">Lucro antes de Ads</span>
                    <span className={cn('text-base font-extrabold tabular-nums', roasData.lucroBruto >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(roasData.lucroBruto)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Saved Products (localStorage) */}
              <SavedProducts
                currentProduct={{
                  salePrice: selectedProduct.salePrice,
                  costPrice: selectedProduct.costPrice,
                  lucroBruto: roasData.lucroBruto,
                  roasEmpate: roasData.roasEmpate,
                  roasIdeal: roasData.roasIdeal,
                  marginPercent,
                }}
              />
            </>
          )}

          {roasData?.margemInsuficiente && (
            <div className="space-y-5">
              <ProductHealthBanner marginPercent={marginPercent} />
              <div className="glass-card p-5 border border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-destructive">Margem insuficiente para anunciar</p>
                    <p className="text-sm text-muted-foreground mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Aumente o preço de venda ou reduza o custo do produto.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Section */}
          <div className="glass-card p-4">
            <ProductAdsImport product={selectedProduct} storeId={currentStore.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simulator ───

function RoasSimulator() {
  const { currentStore } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const selectedProduct = useMemo(() => {
    if (!currentStore || !selectedProductId) return null;
    return currentStore.products.find(p => p.id === selectedProductId) || null;
  }, [currentStore, selectedProductId]);

  const [simPrice, setSimPrice] = useState(0);
  const [simCost, setSimCost] = useState(0);
  const [simGasto, setSimGasto] = useState(50);

  useEffect(() => {
    if (selectedProduct) {
      setSimPrice(selectedProduct.salePrice);
      setSimCost(selectedProduct.costPrice);
      setSimGasto(selectedProduct.adsCost || 50);
    }
  }, [selectedProduct?.id]);

  const simData = useMemo(() => {
    if (!selectedProduct || simPrice <= 0) return null;
    return calcRoasFromValues(simPrice, simCost, simGasto, simGasto * 3);
  }, [simPrice, simCost, simGasto, selectedProduct]);

  const scenarios = useMemo(() => {
    if (!selectedProduct || simPrice <= 0 || simCost <= 0) return [];
    const fee = getShopeeFeeForPrice(simPrice);
    const taxa = (simPrice * fee.percent / 100) + fee.fixed;
    const lucro = simPrice - taxa - simCost;
    if (lucro <= 0) return [];
    const empate = simPrice / lucro;
    const ideal = empate * 1.4;
    const results = [];
    for (let roas = Math.max(1, Math.floor(empate - 1)); roas <= Math.ceil(ideal + 2); roas += 0.5) {
      const receita = simGasto * roas;
      results.push({ roas: `${roas.toFixed(1)}x`, receita, lucroAds: receita - simGasto, status: roas < empate ? 'danger' : roas < ideal ? 'warning' : 'success', roasNum: roas });
    }
    return results;
  }, [simPrice, simCost, simGasto, selectedProduct]);

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sliders className="w-8 h-8 text-primary" />
        </div>
        <p className="text-base font-bold text-foreground mb-1">Adicione produtos primeiro</p>
        <p className="text-sm text-muted-foreground">Use a página Produtos para cadastrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <Label className="text-sm font-bold">Selecione o Produto</Label>
        </div>
        <ProductSelector products={currentStore.products} selectedId={selectedProductId} onSelect={setSelectedProductId} />
      </div>

      {selectedProduct && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card p-5 space-y-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold">Ajuste os Valores</p>
            </div>
            {[
              { label: 'Preço de Venda', tooltipKey: 'preco_venda', value: simPrice, setValue: setSimPrice, min: Math.max(1, selectedProduct.salePrice * 0.5), max: selectedProduct.salePrice * 2, step: 1 },
              { label: 'Custo do Produto', tooltipKey: 'custo_produto', value: simCost, setValue: setSimCost, min: Math.max(0.5, selectedProduct.costPrice * 0.3), max: selectedProduct.costPrice * 2, step: 0.5 },
              { label: 'Gasto em Ads', tooltipKey: 'gasto_ads', value: simGasto, setValue: setSimGasto, min: 5, max: 500, step: 5 },
            ].map(s => (
              <div key={s.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <TooltipLabel label={s.label} tooltip={getTooltipText(s.tooltipKey)} />
                  <span className="text-sm font-extrabold tabular-nums text-primary">{formatCurrency(s.value)}</span>
                </div>
                <Slider value={[s.value]} onValueChange={([v]) => s.setValue(v)} min={s.min} max={s.max} step={s.step} />
              </div>
            ))}
          </div>

          {simData && !simData.margemInsuficiente && (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={Target} label="ROAS Empate" value={simData.roasEmpate!.toFixed(2) + 'x'} variant="warning" tooltipKey="roas_empate" />
              <KpiCard icon={TrendingUp} label="ROAS Ideal" value={simData.roasIdeal!.toFixed(2) + 'x'} variant="success" highlight tooltipKey="roas_ideal" />
            </div>
          )}

          {simData?.margemInsuficiente && (
            <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="font-bold text-destructive text-sm">Margem insuficiente neste cenário</p>
            </div>
          )}

          {/* Scenarios Chart */}
          {scenarios.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold">Cenários de ROAS</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scenarios} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="roas" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === 'lucroAds' ? 'Lucro' : 'Receita']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="lucroAds" radius={[6, 6, 0, 0]}>
                    {scenarios.map((entry, i) => (
                      <Cell key={i} fill={entry.status === 'danger' ? 'hsl(0, 85%, 60%)' : entry.status === 'warning' ? 'hsl(40, 95%, 50%)' : 'hsl(152, 70%, 42%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-muted-foreground pb-1 border-b border-border/50 px-1">
                  <span>ROAS</span><span className="text-right">Receita</span><span className="text-right">Lucro Ads</span>
                </div>
                {scenarios.map((s, i) => (
                  <div key={i} className={cn('grid grid-cols-3 text-sm py-2 rounded-lg px-1', i % 2 === 0 && 'bg-secondary/20')}>
                    <span className={cn('font-bold tabular-nums', statusColors[s.status as keyof typeof statusColors])}>{s.roas}</span>
                    <span className="text-right tabular-nums font-medium">{formatCurrency(s.receita)}</span>
                    <span className={cn('text-right tabular-nums font-bold', s.lucroAds >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(s.lucroAds)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ranking ───

function RoasRanking() {
  const { currentStore } = useStore();
  const ranking = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    return currentStore.products
      .map(p => {
        const data = calcRoasFromValues(p.salePrice, p.costPrice, p.adsCost, p.adsRevenue);
        const status = data.roasAtual !== null && data.roasEmpate && data.roasIdeal && !data.margemInsuficiente
          ? getRoasStatus(data.roasAtual, data.roasEmpate, data.roasIdeal) : null;
        return { product: p, ...data, status };
      })
      .sort((a, b) => {
        if (a.roasAtual !== null && b.roasAtual !== null) return b.roasAtual - a.roasAtual;
        if (a.roasAtual !== null) return -1;
        if (b.roasAtual !== null) return 1;
        return (a.roasEmpate ?? 999) - (b.roasEmpate ?? 999);
      });
  }, [currentStore]);

  const chartData = useMemo(() => {
    return ranking
      .filter(r => r.roasAtual !== null)
      .slice(0, 8)
      .map(r => ({
        name: r.product.name.length > 12 ? r.product.name.slice(0, 12) + '…' : r.product.name,
        roas: r.roasAtual!,
        empate: r.roasEmpate || 0,
        ideal: r.roasIdeal || 0,
        status: r.status,
      }));
  }, [ranking]);

  if (!currentStore || ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <p className="text-base font-bold text-foreground mb-1">Nenhum produto para rankear</p>
        <p className="text-sm text-muted-foreground">Adicione produtos e dados de Ads.</p>
      </div>
    );
  }

  const withAds = ranking.filter(r => r.roasAtual !== null);
  const withoutAds = ranking.filter(r => r.roasAtual === null);

  return (
    <div className="space-y-5">
      {chartData.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">Comparativo de ROAS</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="roas" name="ROAS Atual" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.status === 'danger' ? 'hsl(0, 85%, 60%)' : entry.status === 'warning' ? 'hsl(40, 95%, 50%)' : 'hsl(152, 70%, 42%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {withAds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Com dados de Ads ({withAds.length})
          </p>
          {withAds.map((r, i) => (
            <div key={r.product.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                  r.status === 'success' ? 'bg-success/15 text-success' : r.status === 'warning' ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive')}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">Gasto: {formatCurrency(r.product.adsCost)}</span>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <span className="text-[10px] text-success font-semibold">{formatCurrency(r.product.adsRevenue)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {r.status === 'success' ? <TrendingUp className="w-4 h-4 text-success" /> : r.status === 'danger' ? <TrendingDown className="w-4 h-4 text-destructive" /> : <Target className="w-4 h-4 text-warning" />}
                    <span className={cn('font-extrabold text-xl tabular-nums', statusColors[r.status as keyof typeof statusColors])}>{r.roasAtual!.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span>Emp: <span className="text-warning font-bold">{r.roasEmpate?.toFixed(1)}</span></span>
                    <span>Ideal: <span className="text-success font-bold">{r.roasIdeal?.toFixed(1)}</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutAds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sem dados de Ads ({withoutAds.length})</p>
          {withoutAds.map(r => (
            <div key={r.product.id} className="glass-card p-3.5 opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-secondary text-muted-foreground">—</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(r.product.salePrice)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {r.margemInsuficiente ? (
                    <span className="text-[10px] font-bold text-destructive">Margem insuficiente</span>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">
                      <p>Emp: <span className="text-warning font-bold">{r.roasEmpate?.toFixed(2)}</span></p>
                      <p>Ideal: <span className="text-success font-bold">{r.roasIdeal?.toFixed(2)}</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ───

export function RoasAnalysis() {
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <Tabs defaultValue="product" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-secondary/60 p-1">
          <TabsTrigger value="product" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Target className="w-3.5 h-3.5 mr-1.5" />
            Produto
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="ranking" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Ranking
          </TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="mt-5"><ProductAnalysis /></TabsContent>
        <TabsContent value="simulator" className="mt-5"><RoasSimulator /></TabsContent>
        <TabsContent value="ranking" className="mt-5"><RoasRanking /></TabsContent>
      </Tabs>
    </div>
  );
}
