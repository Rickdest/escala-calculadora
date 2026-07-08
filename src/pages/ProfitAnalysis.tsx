import { useState, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>;
}
import { useProfitAnalyses } from '@/hooks/useProfitAnalysis';
import { parseShopeeProductOverview, isProductOverviewSheet, DailyOverviewRow } from '@/lib/parsers/parseShopeeProductOverview';
import { parseShopeeShopStats, isShopStatsWorkbook } from '@/lib/parsers/parseShopeeShopStats';
import { parseProductPerformanceExcel, ProductPerformanceRow } from '@/lib/parsers/parseProductPerformanceExcel';
import { calcLine, sumLines, groupDaily, getStoreTaxRate, ProfitLine } from '@/lib/profitAnalysis';
import { ProfitLineChart } from '@/components/profit/ProfitLineChart';
import { ProfitFilters, RangePreset, DateRange } from '@/components/profit/ProfitFilters';
import { Upload, FileSpreadsheet, DollarSign, Loader2, Save, Trash2, ExternalLink, Plus, Package, X, TrendingUp } from 'lucide-react';

type Mode = 'timeline' | 'per-sku' | null;

interface CostLine {
  id: string;
  productId?: string;
  name: string;
  units: number;
  unitCost: number;
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>(null);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [dailyRows, setDailyRows] = useState<DailyOverviewRow[]>([]);
  const [productRows, setProductRows] = useState<ProductPerformanceRow[]>([]);
  const [productCosts, setProductCosts] = useState<Record<string, number>>({});
  const [costLines, setCostLines] = useState<CostLine[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const taxRate = getStoreTaxRate(currentStore?.config);
  const targetMargin = currentStore?.config?.desiredMargin ?? 15;

  const applyCostsFromStore = (rows: ProductPerformanceRow[]): Record<string, number> => {
    const map: Record<string, number> = {};
    if (!currentStore) return map;
    for (const r of rows) {
      const match = currentStore.products.find((p) => String(p.shopeeItemId ?? '') === r.item_id);
      if (match && match.costPrice) map[r.item_id] = match.costPrice;
    }
    return map;
  };

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
        setProductCosts(applyCostsFromStore(parsed.products));
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

  // Timeline calculations (revenue per day, cost from cost lines proportional to revenue)
  const totalCostLines = useMemo(
    () => costLines.reduce((a, c) => a + c.units * c.unitCost, 0),
    [costLines],
  );

  const timelineLines: ProfitLine[] = useMemo(() => {
    if (mode !== 'timeline') return [];
    const groups = groupDaily(dailyRows, granularity);
    const totalRevenue = dailyRows.reduce((a, r) => a + r.revenue, 0);
    return groups.map((g) => {
      const revenue = g.items.reduce((a, r) => a + r.revenue, 0);
      const units = g.items.reduce((a, r) => a + r.units, 0);
      // cost distributed proportionally by revenue
      const cost = totalRevenue > 0 ? (revenue / totalRevenue) * totalCostLines : 0;
      return calcLine({ key: g.key, label: g.label, revenue, units, cost, taxRate });
    });
  }, [mode, dailyRows, granularity, totalCostLines, taxRate]);

  const skuLines: ProfitLine[] = useMemo(() => {
    if (mode !== 'per-sku') return [];
    return productRows.map((p) => {
      const unitCost = productCosts[p.item_id] ?? 0;
      const cost = unitCost * p.unidades_pagas;
      const linked = !!currentStore?.products.find((x) => String(x.shopeeItemId ?? '') === p.item_id);
      return calcLine({
        key: p.item_id,
        label: p.nome,
        revenue: p.vendas_pago,
        units: p.unidades_pagas,
        cost,
        taxRate,
        itemId: p.item_id,
        unitCost,
        linked,
      });
    });
  }, [mode, productRows, productCosts, taxRate, currentStore]);

  const activeLines = mode === 'timeline' ? timelineLines : skuLines;
  const totals = useMemo(() => sumLines(activeLines), [activeLines]);
  const effectiveCostPct = totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0;

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
          : { rows: productRows, costs: productCosts },
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
      setProductCosts(a.raw_rows.costs || {});
      setMode('per-sku');
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Análise de Lucro" subtitle="Envie o relatório da Shopee, veja quanto sobrou depois das taxas." />

      {!currentStore && (
        <Card className="p-6 text-center text-text-3">Selecione uma loja para começar.</Card>
      )}

      {currentStore && (
        <>
          <Card className="p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <p className="text-body font-medium">Envie o relatório da Shopee</p>
                <p className="text-caption text-text-3">
                  Aceita <span className="font-medium">Product Overview</span>, <span className="font-medium">Informações Gerenciais</span> (Shop Stats) ou <span className="font-medium">Parent SKU Detail</span>. Detectamos automaticamente.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                Enviar planilha
              </Button>
            </div>
            {period.start && (
              <p className="mt-2 text-caption text-text-3">
                Período: {period.start} → {period.end} · Modo: {mode === 'timeline' ? 'Loja no tempo' : 'Por produto'}
              </p>
            )}
          </Card>

          {mode && (
            <>
              {/* Controls */}
              {mode === 'timeline' ? (
                <>
                  <Card className="p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div>
                        <Label className="text-caption">Agrupar por</Label>
                        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as any)}>
                          <TabsList>
                            <TabsTrigger value="day">Dia</TabsTrigger>
                            <TabsTrigger value="week">Semana</TabsTrigger>
                            <TabsTrigger value="month">Mês</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <div className="ml-auto">
                        <Button variant="outline" onClick={handleSave} disabled={saving}>
                          <Save className="mr-2 h-4 w-4" /> Salvar análise
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Cost lines */}
                  <Card className="p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-body font-medium">Custos por produto</p>
                        <p className="text-caption text-text-3">
                          Adicione cada produto vendido no período com sua quantidade e custo unitário. Total: <span className="font-semibold text-foreground">{fmtBRL(totalCostLines)}</span>
                          {totals.revenue > 0 && <span> · {fmtPct(effectiveCostPct)} das vendas</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Package className="mr-2 h-4 w-4" /> Do cadastro
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-2" align="end">
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
                        <Button variant="outline" size="sm" onClick={addCostLineManual}>
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
                <Card className="p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-caption text-text-3">
                      Custos preenchidos a partir do cadastro quando o SKU bate. Edite qualquer célula abaixo.
                    </p>
                    <Button variant="outline" onClick={handleSave} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" /> Salvar análise
                    </Button>
                  </div>
                </Card>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <SummaryCard label="Vendas" value={fmtBRL(totals.revenue)} />
                <SummaryCard label="Taxas Shopee" value={fmtBRL(totals.fees)} sub={fmtPct(totals.revenue > 0 ? (totals.fees / totals.revenue) * 100 : 0)} />
                <SummaryCard label="Impostos" value={fmtBRL(totals.taxes)} sub={fmtPct(taxRate)} />
                <SummaryCard label="Custo produtos" value={fmtBRL(totals.cost)} sub={totals.revenue > 0 ? fmtPct(effectiveCostPct) : undefined} />
                <SummaryCard
                  label="Lucro líquido"
                  value={fmtBRL(totals.profit)}
                  sub={fmtPct(totals.margin)}
                  valueClass={marginColor(totals.margin, targetMargin)}
                />
              </div>

              {/* Table */}
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-caption">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="p-3">{mode === 'timeline' ? 'Período' : 'Produto'}</th>
                        <th className="p-3 text-right">Unidades</th>
                        <th className="p-3 text-right">Vendas</th>
                        {mode === 'per-sku' && <th className="p-3 text-right">Custo unit.</th>}
                        <th className="p-3 text-right">Custo total</th>
                        <th className="p-3 text-right">Taxa Shopee</th>
                        <th className="p-3 text-right">Impostos</th>
                        <th className="p-3 text-right">Lucro</th>
                        <th className="p-3 text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLines.map((l) => (
                        <tr key={l.key} className="border-t border-border/50">
                          <td className="p-3">
                            <div className="font-medium">{l.label}</div>
                            {mode === 'per-sku' && (
                              <div className="text-text-3">
                                {l.itemId} {l.linked ? '· vinculado' : '· não vinculado'}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">{l.units}</td>
                          <td className="p-3 text-right">{fmtBRL(l.revenue)}</td>
                          {mode === 'per-sku' && (
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={productCosts[l.itemId!] ?? 0}
                                onChange={(e) =>
                                  setProductCosts({ ...productCosts, [l.itemId!]: parseFloat(e.target.value) || 0 })
                                }
                                className="w-24 h-8 text-right ml-auto"
                              />
                            </td>
                          )}
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
                      {activeLines.length === 0 && (
                        <tr>
                          <td colSpan={mode === 'per-sku' ? 9 : 8} className="p-6 text-center text-text-3">
                            Sem dados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
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
      )}
    </AppLayout>
  );
}

function SummaryCard({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-caption text-text-3">
        <DollarSign className="h-3 w-3" /> {label}
      </div>
      <div className={`text-h3 font-semibold mt-1 ${valueClass ?? ''}`}>{value}</div>
      {sub && <div className="text-caption text-text-3">{sub}</div>}
    </Card>
  );
}
