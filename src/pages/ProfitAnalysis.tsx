import { useState, useMemo, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-border bg-card shadow-sm ${className}`}>{children}</div>;
}
import { useProfitAnalyses } from '@/hooks/useProfitAnalysis';
import { useShopeeProductLinks } from '@/hooks/useShopeeProductLinks';
import { parseShopeeProductOverview, isProductOverviewSheet, DailyOverviewRow } from '@/lib/parsers/parseShopeeProductOverview';
import { parseShopeeShopStats, isShopStatsWorkbook } from '@/lib/parsers/parseShopeeShopStats';
import { parseProductPerformanceExcel, ProductPerformanceRow } from '@/lib/parsers/parseProductPerformanceExcel';
import { calcLine, sumLines, groupDaily, getStoreTaxRate, ProfitLine } from '@/lib/profitAnalysis';
import { matchShopeeProduct, type MatchType } from '@/lib/profit/matchProduct';
import { ProfitLineChart } from '@/components/profit/ProfitLineChart';
import { ProfitFilters, RangePreset, DateRange } from '@/components/profit/ProfitFilters';
import { ParentSkuProfitTable, type ParentSkuLine, type RowLinkMode } from '@/components/profit/ParentSkuProfitTable';
import { exportProfitReportCSV } from '@/lib/profit/exportProfitReport';
import { exportShopeeProfitPDF } from '@/lib/profit/exportProfitPDF';
import { Upload, FileSpreadsheet, DollarSign, Loader2, Save, Trash2, ExternalLink, Plus, Package, X, TrendingUp, TrendingDown, AlertTriangle, Download, Info, ShoppingCart, Percent, Wallet } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MercadoLivreProfitTab } from '@/components/profit/ml/MercadoLivreProfitTab';
import { SortableTh } from '@/components/profit/SortableTh';
import { useTableSort } from '@/components/profit/useTableSort';
import { ProfitKpiCard } from '@/components/profit/ProfitKpiCard';


const LS_KEY = (storeId: string) => `profit-analysis:last:${storeId}`;

type Mode = 'timeline' | 'per-sku' | null;

interface CostLine {
  id: string;
  productId?: string;
  name: string;
  units: number;
  unitCost: number;
}

interface RowState {
  productId: string | null;
  matchType: MatchType;
  linkMode: RowLinkMode;
  manualCost: number;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number) {
  return `${v.toFixed(1).replace('.', ',')}%`;
}
function marginColor(m: number, target: number) {
  if (m >= target) return 'text-emerald-500';
  if (m >= target - 5) return 'text-amber-500';
  return 'text-red-500';
}

export default function ProfitAnalysis() {
  const { currentStore } = useStore();
  const { analyses, save, remove } = useProfitAnalyses(currentStore?.id);
  const { links: savedLinks, upsertLink, removeLink } = useShopeeProductLinks(currentStore?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>(null);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyOverviewRow[]>([]);
  const [productRows, setProductRows] = useState<ProductPerformanceRow[]>([]);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [extraCosts, setExtraCosts] = useState({ ads: 0, other: 0 });
  const [costLines, setCostLines] = useState<CostLine[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const taxRate = getStoreTaxRate(currentStore?.config);
  const targetMargin = currentStore?.config?.desiredMargin ?? 15;
  const hydratedRef = useRef(false);

  // Rehydrate last import from localStorage on store change
  useEffect(() => {
    if (!currentStore) return;
    hydratedRef.current = false;
    try {
      const raw = localStorage.getItem(LS_KEY(currentStore.id));
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.mode === 'timeline') {
        setDailyRows(s.dailyRows || []);
        setCostLines(s.costLines || []);
        setGranularity(s.granularity || 'day');
      } else if (s.mode === 'per-sku') {
        setProductRows(s.productRows || []);
        setRowState(s.rowState || {});
        setExtraCosts(s.extraCosts || { ads: 0, other: 0 });
      }
      setPeriod(s.period || { start: '', end: '' });
      setMode(s.mode || null);
    } catch { /* ignore */ }
    finally { hydratedRef.current = true; }
  }, [currentStore?.id]);

  // Persist current state
  useEffect(() => {
    if (!currentStore || !hydratedRef.current || !mode) return;
    const snapshot = {
      mode, period, granularity,
      dailyRows: mode === 'timeline' ? dailyRows : [],
      costLines: mode === 'timeline' ? costLines : [],
      productRows: mode === 'per-sku' ? productRows : [],
      rowState: mode === 'per-sku' ? rowState : {},
      extraCosts,
    };
    try { localStorage.setItem(LS_KEY(currentStore.id), JSON.stringify(snapshot)); } catch { /* quota */ }
  }, [currentStore?.id, mode, period, granularity, dailyRows, costLines, productRows, rowState, extraCosts]);

  // Re-run matching when rows / savedLinks / products change (auto-mode rows only)
  useEffect(() => {
    if (mode !== 'per-sku' || !currentStore) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const row of productRows) {
        const existing = next[row.item_id];
        if (existing && (existing.linkMode === 'manual-product' || existing.linkMode === 'manual-cost' || existing.linkMode === 'none')) {
          continue;
        }
        const match = matchShopeeProduct(row, currentStore.products, savedLinks);
        const linked = currentStore.products.find((p) => p.id === match.productId);
        // if saved link is manual-cost, honor it
        const savedLink = savedLinks.find((l) => l.shopee_item_id === row.item_id);
        if (savedLink && savedLink.link_type === 'manual_cost') {
          next[row.item_id] = {
            productId: null,
            matchType: null,
            linkMode: 'manual-cost',
            manualCost: Number(savedLink.manual_unit_cost) || 0,
          };
          continue;
        }
        next[row.item_id] = {
          productId: match.productId,
          matchType: match.matchType,
          linkMode: match.matchType === 'saved' ? 'manual-product' : match.matchType ? 'auto' : 'none',
          manualCost: linked?.costPrice ?? 0,
        };
      }
      return next;
    });
  }, [mode, productRows, currentStore, savedLinks]);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const headerRow: any[] = (utils.sheet_to_json(firstSheet, { header: 1, defval: '' })[0] as any[]) || [];
      const headers = headerRow.map((h) => String(h || ''));

      if (isProductOverviewSheet(headers)) {
        const parsed = await parseShopeeProductOverview(file);
        setDailyRows(parsed.rows);
        setProductRows([]);
        setPeriod({ start: parsed.period_start, end: parsed.period_end });
        setMode('timeline');
        toast.success('Product Overview carregado', { description: `${parsed.rows.length} dias detectados.` });
      } else if (isShopStatsWorkbook(wb.SheetNames)) {
        const parsed = await parseShopeeShopStats(file);
        setDailyRows(parsed.rows);
        setProductRows([]);
        setPeriod({ start: parsed.period_start, end: parsed.period_end });
        setMode('timeline');
        toast.success('Informações Gerenciais carregado', { description: `${parsed.rows.length} dias detectados.` });
      } else {
        const parsed = await parseProductPerformanceExcel(file);
        setProductRows(parsed.products);
        setDailyRows([]);
        setRowState({});
        setPeriod({ start: parsed.period_start, end: parsed.period_end });
        setMode('per-sku');
        toast.success('Parent SKU carregado', { description: `${parsed.products.length} produtos detectados.` });
      }
    } catch (e: any) {
      toast.error('Falha ao ler', { description: e?.message || 'Verifique o arquivo' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };


  // Filter daily rows by preset/custom range
  const filteredDailyRows = useMemo(() => {
    if (!dailyRows.length) return dailyRows;
    if (rangePreset === 'all') return dailyRows;
    const today = new Date();
    let start: string | null = null;
    let end: string | null = null;
    if (rangePreset === '7d' || rangePreset === '30d') {
      const days = rangePreset === '7d' ? 6 : 29;
      const s = new Date(today);
      s.setDate(today.getDate() - days);
      start = s.toISOString().slice(0, 10);
      end = today.toISOString().slice(0, 10);
    } else if (rangePreset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      end = today.toISOString().slice(0, 10);
    } else if (rangePreset === 'custom' && customRange) {
      start = customRange.start;
      end = customRange.end;
    }
    if (!start || !end) return dailyRows;
    return dailyRows.filter((r) => r.date >= start! && r.date <= end!);
  }, [dailyRows, rangePreset, customRange]);

  // Timeline calculations (revenue per day, cost from cost lines proportional to revenue)
  const totalCostLines = useMemo(
    () => costLines.reduce((a, c) => a + c.units * c.unitCost, 0),
    [costLines],
  );

  const timelineLines: ProfitLine[] = useMemo(() => {
    if (mode !== 'timeline') return [];
    const groups = groupDaily(filteredDailyRows, granularity);
    const totalRevenue = filteredDailyRows.reduce((a, r) => a + r.revenue, 0);
    return groups.map((g) => {
      const revenue = g.items.reduce((a, r) => a + r.revenue, 0);
      const units = g.items.reduce((a, r) => a + r.units, 0);
      // cost distributed proportionally by revenue
      const cost = totalRevenue > 0 ? (revenue / totalRevenue) * totalCostLines : 0;
      return calcLine({ key: g.key, label: g.label, revenue, units, cost, taxRate });
    });
  }, [mode, filteredDailyRows, granularity, totalCostLines, taxRate]);

  // Per-product lines derived from rowState
  const parentSkuLines: ParentSkuLine[] = useMemo(() => {
    if (mode !== 'per-sku' || !currentStore) return [];
    return productRows.filter((r) => (r.vendas_pago || 0) > 0 || (r.unidades_pagas || 0) > 0).map((r) => {
      const st = rowState[r.item_id];
      const linked = st?.productId ? currentStore.products.find((p) => p.id === st.productId) : null;
      let unitCost = 0;
      let hasCost = false;
      if (st?.linkMode === 'manual-cost') {
        unitCost = st.manualCost || 0;
        hasCost = unitCost > 0;
      } else if (linked) {
        unitCost = linked.costPrice || 0;
        hasCost = unitCost > 0;
      }
      return {
        row: r,
        productId: st?.productId ?? null,
        matchType: st?.matchType ?? null,
        linkMode: st?.linkMode ?? 'none',
        unitCost,
        hasCost,
      };
    });
  }, [mode, productRows, rowState, currentStore]);

  const skuLines: ProfitLine[] = useMemo(() => {
    if (mode !== 'per-sku') return [];
    return parentSkuLines.map((l) =>
      calcLine({
        key: l.row.item_id,
        label: l.row.nome,
        revenue: l.row.vendas_pago,
        units: l.row.unidades_pagas,
        cost: l.unitCost * l.row.unidades_pagas,
        taxRate,
        itemId: l.row.item_id,
        unitCost: l.unitCost,
        linked: !!l.productId,
      }),
    );
  }, [mode, parentSkuLines, taxRate]);

  const activeLines = mode === 'timeline' ? timelineLines : skuLines;
  const totals = useMemo(() => sumLines(activeLines), [activeLines]);
  const effectiveCostPct = totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0;
  const noCostCount = parentSkuLines.filter((l) => !l.hasCost).length;
  const profitBeforeAds = totals.revenue - totals.cost - totals.fees - totals.taxes - extraCosts.other;
  const marginBeforeAds = totals.revenue > 0 ? (profitBeforeAds / totals.revenue) * 100 : 0;
  const finalProfit = profitBeforeAds - extraCosts.ads;
  const finalMargin = totals.revenue > 0 ? (finalProfit / totals.revenue) * 100 : 0;
  const adsShareOfProfit = profitBeforeAds > 0 ? (extraCosts.ads / profitBeforeAds) * 100 : 0;

  const addCostLineFromProduct = (productId: string) => {
    if (!currentStore) return;
    const p = currentStore.products.find((x) => x.id === productId);
    if (!p) return;
    if (costLines.some((c) => c.productId === productId)) {
      toast.info('Produto já adicionado');
      return;
    }
    setCostLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: p.id, name: p.name, units: 1, unitCost: p.costPrice || 0 },
    ]);
  };

  const addCostLineManual = () => {
    setCostLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: 'Novo produto', units: 1, unitCost: 0 },
    ]);
  };

  const updateCostLine = (id: string, patch: Partial<CostLine>) => {
    setCostLines((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeCostLine = (id: string) => setCostLines((prev) => prev.filter((c) => c.id !== id));

  const filteredProducts = useMemo(() => {
    if (!currentStore) return [];
    const q = pickerSearch.toLowerCase();
    return currentStore.products.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [currentStore, pickerSearch]);

  const handleSave = async () => {
    if (!currentStore || !mode) return;
    setSaving(true);
    try {
      await save({
        name: `Análise ${period.start} → ${period.end}`,
        store_id: currentStore.id,
        period_start: period.start || null,
        period_end: period.end || null,
        report_type: mode === 'timeline' ? 'product_overview' : 'parent_sku',
        granularity: mode === 'timeline' ? granularity : 'custom',
        avg_cost_pct: mode === 'timeline' ? effectiveCostPct : null,
        total_revenue: totals.revenue,
        total_fees: totals.fees,
        total_taxes: totals.taxes,
        total_cost: totals.cost,
        total_profit: totals.profit,
        margin_pct: totals.margin,
        raw_rows: mode === 'timeline'
          ? { rows: dailyRows, granularity, costLines }
          : { rows: productRows, rowState },
        extra_costs: mode === 'per-sku' ? extraCosts : {},
      });
      toast.success('Análise salva');
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const loadSaved = (a: any) => {
    setPeriod({ start: a.period_start, end: a.period_end });
    if (a.report_type === 'product_overview') {
      setDailyRows(a.raw_rows.rows || []);
      setGranularity(a.raw_rows.granularity || 'day');
      setCostLines(a.raw_rows.costLines || []);
      setMode('timeline');
    } else {
      setProductRows(a.raw_rows.rows || []);
      setRowState(a.raw_rows.rowState || {});
      setExtraCosts({ ads: a.extra_costs?.ads || 0, other: a.extra_costs?.other || 0 });
      setMode('per-sku');
    }
  };

  // Per-row link handlers (persist to shopee_product_links)
  const handleLinkProduct = (itemId: string, productId: string) => {
    const row = productRows.find((r) => r.item_id === itemId);
    if (!row || !currentStore) return;
    const linked = currentStore.products.find((p) => p.id === productId);
    setRowState((prev) => ({
      ...prev,
      [itemId]: {
        productId,
        matchType: 'saved',
        linkMode: 'manual-product',
        manualCost: linked?.costPrice ?? 0,
      },
    }));
    upsertLink({
      shopee_item_id: itemId,
      parent_sku: row.parent_sku || null,
      variation_sku: row.variation_sku || null,
      product_id: productId,
      manual_unit_cost: null,
      link_type: 'product',
    });
  };

  const handleSetManualCost = (itemId: string, unitCost: number) => {
    const row = productRows.find((r) => r.item_id === itemId);
    if (!row) return;
    setRowState((prev) => ({
      ...prev,
      [itemId]: {
        productId: null,
        matchType: null,
        linkMode: 'manual-cost',
        manualCost: unitCost,
      },
    }));
    upsertLink({
      shopee_item_id: itemId,
      parent_sku: row.parent_sku || null,
      variation_sku: row.variation_sku || null,
      product_id: null,
      manual_unit_cost: unitCost,
      link_type: 'manual_cost',
    });
  };

  const handleClearLink = (itemId: string) => {
    setRowState((prev) => ({
      ...prev,
      [itemId]: { productId: null, matchType: null, linkMode: 'none', manualCost: 0 },
    }));
    removeLink(itemId);
  };

  return (
    <AppLayout>
      <PageHeader title="Análise de Lucro" subtitle="Separe seus resultados por marketplace." />

      <div className="page-container py-3 md:py-4 space-y-4">
      {!currentStore && (
        <Card className="p-6 text-center text-text-3">Selecione uma loja para começar.</Card>
      )}

      {currentStore && (
        <Tabs defaultValue="shopee" className="w-full">
          <TabsList className="mb-4 grid grid-cols-2 w-full md:inline-flex md:w-auto">
            <TabsTrigger value="shopee">Shopee</TabsTrigger>
            <TabsTrigger value="ml">Mercado Livre</TabsTrigger>
          </TabsList>
          <TabsContent value="ml">
            <MercadoLivreProfitTab storeId={currentStore.id} storeName={currentStore.name} defaultTaxPct={taxRate} />
          </TabsContent>
          <TabsContent value="shopee">
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Card className="p-4 md:p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {mode ? (
                    <>
                      <h2 className="text-sm font-medium text-text-3">
                        Relatório: <span className="text-foreground font-semibold">{mode === 'timeline' ? 'Shop Stats / Overview' : 'Parent SKU'}</span>
                      </h2>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] md:text-xs text-text-3">
                        {period.start && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            {period.start} → {period.end}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          Modo: {mode === 'timeline' ? 'Loja no tempo' : 'Por produto'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Envie o relatório da Shopee</p>
                      <p className="text-xs text-text-3 mt-1">
                        Product Overview, Informações Gerenciais ou Parent SKU - detectamos automaticamente.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                variant={mode ? 'outline' : 'default'}
                size="sm"
                className="w-full sm:w-auto shrink-0"
              >
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                {mode ? 'Alterar planilha' : 'Enviar planilha'}
              </Button>
            </div>
          </Card>

          {mode && (
            <>
              {/* Controls */}
              {mode === 'timeline' ? (
                <>
                  <Card className="p-3 md:p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                      <ProfitFilters
                        granularity={granularity}
                        onGranularityChange={setGranularity}
                        preset={rangePreset}
                        onPresetChange={setRangePreset}
                        customRange={customRange}
                        onCustomRangeChange={setCustomRange}
                      />
                      <div className="md:ml-auto grid grid-cols-3 md:flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full md:w-auto"
                          onClick={() => exportProfitReportCSV({
                            storeName: currentStore.name,
                            mode: 'timeline',
                            period,
                            lines: activeLines,
                            totals,
                          })}
                          disabled={activeLines.length === 0}
                        >
                          <Download className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">CSV</span><span className="md:hidden">CSV</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full md:w-auto"
                          onClick={() => exportShopeeProfitPDF({
                            storeName: currentStore.name,
                            mode: 'timeline',
                            period,
                            lines: activeLines,
                            totals,
                          })}
                          disabled={activeLines.length === 0}
                        >
                          <Download className="md:mr-2 h-4 w-4" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={handleSave} disabled={saving}>
                          <Save className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Salvar análise</span><span className="md:hidden">Salvar</span>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Cost lines */}
                  <Card className="p-3 md:p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-body font-medium">Custos por produto</p>
                        <p className="text-caption text-text-3">
                          Total: <span className="font-semibold text-foreground">{fmtBRL(totalCostLines)}</span>
                          {totals.revenue > 0 && <span> · {fmtPct(effectiveCostPct)} das vendas</span>}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:flex gap-2">
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full md:w-auto">
                              <Package className="mr-2 h-4 w-4" /> Do cadastro
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[90vw] max-w-sm md:w-80 p-2" align="end">
                            <Input
                              placeholder="Buscar produto..."
                              value={pickerSearch}
                              onChange={(e) => setPickerSearch(e.target.value)}
                              className="mb-2"
                            />
                            <div className="max-h-64 overflow-y-auto">
                              {filteredProducts.length === 0 && (
                                <p className="text-caption text-text-3 p-2">Nenhum produto</p>
                              )}
                              {filteredProducts.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    addCostLineFromProduct(p.id);
                                    setPickerOpen(false);
                                    setPickerSearch('');
                                  }}
                                  className="w-full text-left p-2 rounded hover:bg-muted/50 flex justify-between items-center"
                                >
                                  <span className="truncate flex-1 text-caption">{p.name}</span>
                                  <span className="text-caption text-text-3 ml-2">{fmtBRL(p.costPrice || 0)}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={addCostLineManual}>
                          <Plus className="mr-2 h-4 w-4" /> Manual
                        </Button>
                      </div>
                    </div>

                    {costLines.length === 0 ? (
                      <div className="text-center py-6 text-text-3 text-caption">
                        Nenhum produto adicionado. Sem custos, o lucro mostrado será apenas receita − taxas − impostos.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-caption">
                          <thead className="text-text-3">
                            <tr className="text-left">
                              <th className="py-2">Produto</th>
                              <th className="py-2 text-right w-24">Unidades</th>
                              <th className="py-2 text-right w-32">Custo unit.</th>
                              <th className="py-2 text-right w-32">Custo total</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {costLines.map((c) => (
                              <tr key={c.id} className="border-t border-border/50">
                                <td className="py-2 pr-2">
                                  <Input
                                    value={c.name}
                                    onChange={(e) => updateCostLine(c.id, { name: e.target.value })}
                                    className="h-8"
                                  />
                                  {c.productId && <div className="text-text-3 mt-0.5">vinculado</div>}
                                </td>
                                <td className="py-2 pr-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={c.units}
                                    onChange={(e) => updateCostLine(c.id, { units: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-right"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={c.unitCost}
                                    onChange={(e) => updateCostLine(c.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-right"
                                  />
                                </td>
                                <td className="py-2 pr-2 text-right font-medium">
                                  {fmtBRL(c.units * c.unitCost)}
                                </td>
                                <td className="py-2 text-right">
                                  <Button variant="ghost" size="sm" onClick={() => removeCostLine(c.id)}>
                                    <X className="h-4 w-4 text-text-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                    {/* Custos + Salvar */}
                    <Card className="lg:col-span-8 p-5">
                      <div className="mb-4">
                        <p className="text-sm font-semibold">Custos adicionais</p>
                        <p className="text-xs text-text-3 flex items-center gap-1 mt-1">
                          <Info className="h-3 w-3 shrink-0" /> Taxas Shopee são calculadas automaticamente por faixa de preço. Informe apenas anúncios e outros custos.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider text-text-3 font-bold">Anúncios (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm pointer-events-none">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={extraCosts.ads || ''}
                              onChange={(e) => setExtraCosts((p) => ({ ...p, ads: parseFloat(e.target.value) || 0 }))}
                              placeholder="0,00"
                              className="pl-10 h-11"
                            />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider text-text-3 font-bold">Outros custos (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm pointer-events-none">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={extraCosts.other || ''}
                              onChange={(e) => setExtraCosts((p) => ({ ...p, other: parseFloat(e.target.value) || 0 }))}
                              placeholder="0,00"
                              className="pl-10 h-11"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="h-11 px-6 shadow-lg shadow-primary/10 font-bold"
                        >
                          {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                          Salvar análise
                        </Button>
                      </div>
                    </Card>

                    {/* Export */}
                    <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Exportar relatório</p>
                        <p className="text-xs text-text-3 mt-1">Apresente ao cliente ou arquive.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-11"
                          onClick={() => exportProfitReportCSV({
                            storeName: currentStore.name,
                            mode: 'per-sku',
                            period,
                            lines: activeLines,
                            totals,
                            extras: { fees: 0, ads: extraCosts.ads, other: extraCosts.other },
                            finalProfit,
                            finalMargin,
                          })}
                          disabled={activeLines.length === 0}
                        >
                          <Download className="mr-2 h-4 w-4 text-emerald-500" /> CSV
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-11"
                          onClick={() => exportShopeeProfitPDF({
                            storeName: currentStore.name,
                            mode: 'per-sku',
                            period,
                            lines: activeLines,
                            totals,
                            extras: { ads: extraCosts.ads, other: extraCosts.other },
                            finalProfit,
                            finalMargin,
                          })}
                          disabled={activeLines.length === 0}
                        >
                          <Download className="mr-2 h-4 w-4 text-red-500" /> PDF
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {noCostCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg border-l-4 border-red-500 bg-red-500/10 text-red-300 text-sm">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                      <p>
                        Atenção: <span className="font-bold">{noCostCount} produto(s) sem custo</span> vinculados. Seu lucro final pode estar superestimado.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Summary */}
              {mode === 'per-sku' ? (
                <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mb-3">
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={ShoppingCart} label="Vendas pagas" value={fmtBRL(totals.revenue)} sub={`${totals.units} un.`} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Package} label="Custo produtos" value={fmtBRL(totals.cost)} sub={totals.revenue > 0 ? `${fmtPct(effectiveCostPct)} das vendas` : undefined} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Percent} label="Taxas Shopee" value={fmtBRL(totals.fees)} sub={totals.revenue > 0 ? `${fmtPct((totals.fees / totals.revenue) * 100)} · auto` : 'auto'} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Wallet} label="Imposto + Extras" value={fmtBRL(totals.taxes + extraCosts.ads + extraCosts.other)} sub={`Imp. ${fmtPct(taxRate)}`} />
                  <ProfitKpiCard
                    className="border-t-2 border-t-primary ring-1 ring-primary/20"
                    icon={finalProfit >= 0 ? TrendingUp : TrendingDown}
                    label="Lucro final"
                    value={fmtBRL(finalProfit)}
                    sub={`Margem ${fmtPct(finalMargin)}`}
                    tone={finalProfit < 0 ? 'destructive' : finalMargin >= targetMargin ? 'success' : finalMargin >= targetMargin - 5 ? 'warning' : 'destructive'}
                    bar={finalMargin <= 0 ? 0 : Math.min((finalMargin / 30) * 100, 100)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-4 text-caption">
                  <StatusChip color="emerald" active={activeLines.filter((l) => l.profit > 0).length > 0}>
                    {activeLines.filter((l) => l.profit > 0).length} com lucro
                  </StatusChip>
                  <StatusChip color="red" active={activeLines.filter((l) => l.profit < 0).length > 0}>
                    {activeLines.filter((l) => l.profit < 0).length} com prejuízo
                  </StatusChip>
                  <StatusChip color="amber" active={noCostCount > 0}>
                    {noCostCount} sem custo
                  </StatusChip>
                </div>
                </>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mb-4">
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={ShoppingCart} label="Vendas" value={fmtBRL(totals.revenue)} sub={`${totals.units} un.`} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Percent} label="Taxas Shopee" value={fmtBRL(totals.fees)} sub={fmtPct(totals.revenue > 0 ? (totals.fees / totals.revenue) * 100 : 0)} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Wallet} label="Impostos" value={fmtBRL(totals.taxes)} sub={fmtPct(taxRate)} />
                  <ProfitKpiCard className="border-t-2 border-t-border" icon={Package} label="Custo produtos" value={fmtBRL(totals.cost)} sub={totals.revenue > 0 ? fmtPct(effectiveCostPct) : undefined} />
                  <ProfitKpiCard
                    className="border-t-2 border-t-primary ring-1 ring-primary/20"
                    icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
                    label="Lucro líquido"
                    value={fmtBRL(totals.profit)}
                    sub={`Margem ${fmtPct(totals.margin)}`}
                    tone={totals.profit < 0 ? 'destructive' : totals.margin >= targetMargin ? 'success' : totals.margin >= targetMargin - 5 ? 'warning' : 'destructive'}
                    bar={totals.margin <= 0 ? 0 : Math.min((totals.margin / 30) * 100, 100)}
                  />
                </div>
              )}

              {/* Chart */}
              {activeLines.length > 0 && (
                <Card className="p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-body font-medium">
                      Vendas × Lucro {mode === 'per-sku' ? '(top 15 produtos)' : ''}
                    </p>
                  </div>
                  <ProfitLineChart lines={activeLines} mode={mode!} />
                </Card>
              )}

              {/* Table */}
              {mode === 'per-sku' ? (
                <ParentSkuProfitTable
                  lines={parentSkuLines}
                  products={currentStore.products}
                  onLinkProduct={handleLinkProduct}
                  onSetManualCost={handleSetManualCost}
                  onClearLink={handleClearLink}
                />
              ) : (
                <TimelineTable lines={activeLines} targetMargin={targetMargin} />
              )}
            </>
          )}

          {analyses.length > 0 && (
            <Card className="p-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="h-4 w-4" />
                <p className="font-medium">Análises salvas</p>
              </div>
              <div className="grid gap-2">
                {analyses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-body font-medium">
                        {a.period_start} → {a.period_end}
                      </p>
                      <p className="text-caption text-text-3">
                        {a.report_type === 'product_overview' ? 'Loja no tempo' : 'Por produto'} ·
                        {' '}Lucro {fmtBRL(Number(a.total_profit))} ({fmtPct(Number(a.margin_pct))})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => loadSaved(a)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
          </TabsContent>
        </Tabs>
      )}
      </div>
    </AppLayout>
  );
}

function StatusChip({
  children, color, active,
}: { children: React.ReactNode; color: 'emerald' | 'red' | 'amber'; active: boolean }) {
  const activeCls =
    color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : color === 'red' ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  const idleCls = 'bg-muted/30 text-text-3 border-border/60';
  return (
    <span className={`px-3 py-1 rounded-full border font-medium ${active ? activeCls : idleCls}`}>
      {children}
    </span>
  );
}

type TLKey = 'label' | 'units' | 'revenue' | 'cost' | 'fees' | 'taxes' | 'profit' | 'margin';

function TimelineTable({ lines, targetMargin }: { lines: ProfitLine[]; targetMargin: number }) {
  const { sort, toggle, sorted } = useTableSort<ProfitLine, TLKey>(lines, {
    label: (l) => l.label,
    units: (l) => l.units,
    revenue: (l) => l.revenue,
    cost: (l) => l.cost,
    fees: (l) => l.fees,
    taxes: (l) => l.taxes,
    profit: (l) => l.profit,
    margin: (l) => l.margin,
  });
  const th = (key: TLKey, label: string, align: 'left' | 'right' = 'right') => (
    <SortableTh active={sort.key === key} dir={sort.dir} onClick={() => toggle(key)} align={align}>
      {label}
    </SortableTh>
  );
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-caption">
          <thead className="bg-muted/40">
            <tr>
              {th('label', 'Período', 'left')}
              {th('units', 'Unidades')}
              {th('revenue', 'Vendas')}
              {th('cost', 'Custo total')}
              {th('fees', 'Taxa Shopee')}
              {th('taxes', 'Impostos')}
              {th('profit', 'Lucro')}
              {th('margin', 'Margem')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.key} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                <td className="p-3"><div className="font-medium">{l.label}</div></td>
                <td className="p-3 text-right">{l.units}</td>
                <td className="p-3 text-right font-medium">{fmtBRL(l.revenue)}</td>
                <td className="p-3 text-right">{fmtBRL(l.cost)}</td>
                <td className="p-3 text-right">{fmtBRL(l.fees)}</td>
                <td className="p-3 text-right">{fmtBRL(l.taxes)}</td>
                <td className={`p-3 text-right font-semibold ${l.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtBRL(l.profit)}
                </td>
                <td className={`p-3 text-right font-semibold ${marginColor(l.margin, targetMargin)}`}>
                  {fmtPct(l.margin)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-text-3">Sem dados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
