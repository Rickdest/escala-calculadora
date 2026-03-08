import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, Product } from '@/types/store';
import { cn } from '@/lib/utils';
import { Target, AlertTriangle, TrendingUp, TrendingDown, Sliders, Upload, FileSpreadsheet, Trash2, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseShopeeCSV, ShopeeAdsReport, ShopeeAdRow } from '@/lib/shopeeAdsParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    case 'danger': return '⚠️ Os anúncios estão gerando prejuízo.';
    case 'warning': return '⚡ Os anúncios estão gerando lucro, mas ainda podem melhorar.';
    case 'success': return '🚀 Campanha saudável e pronta para escalar.';
    default: return '';
  }
}

const statusColors = { danger: 'text-destructive', warning: 'text-warning', success: 'text-success' };
const statusBg = { danger: 'bg-destructive/10 border-destructive/30', warning: 'bg-warning/10 border-warning/30', success: 'bg-success/10 border-success/30' };
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── ROAS Display Component ───

function RoasDisplay({ roasData, status }: { roasData: RoasResult; status: string | null }) {
  const progressData = useMemo(() => {
    if (roasData.margemInsuficiente || !roasData.roasEmpate || !roasData.roasIdeal || roasData.roasAtual === null) return null;
    const maxRoas = Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1);
    return {
      percent: Math.min((roasData.roasAtual / maxRoas) * 100, 100),
      empatePercent: (roasData.roasEmpate / maxRoas) * 100,
      idealPercent: (roasData.roasIdeal / maxRoas) * 100,
    };
  }, [roasData]);

  if (roasData.margemInsuficiente) {
    return (
      <div className="glass-card p-4 border border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
          <div>
            <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
            <p className="text-xs text-muted-foreground mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className={cn('glass-card p-4 text-center', status && statusBg[status as keyof typeof statusBg])}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">ROAS Atual</p>
          <p className={cn('text-2xl font-extrabold tabular-nums', roasData.roasAtual !== null ? statusColors[status as keyof typeof statusColors] || 'text-foreground' : 'text-muted-foreground')}>
            {roasData.roasAtual !== null ? roasData.roasAtual.toFixed(2) : '—'}
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Empate</p>
          <p className="text-2xl font-extrabold tabular-nums text-warning">{roasData.roasEmpate!.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Ideal</p>
          <p className="text-2xl font-extrabold tabular-nums text-success">{roasData.roasIdeal!.toFixed(2)}</p>
        </div>
      </div>

      {progressData && status && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posição do ROAS</p>
          <div className="relative">
            <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', status === 'danger' && 'bg-destructive', status === 'warning' && 'bg-warning', status === 'success' && 'bg-success')} style={{ width: `${progressData.percent}%` }} />
            </div>
            <div className="absolute top-0 h-3 w-0.5 bg-warning" style={{ left: `${progressData.empatePercent}%` }} />
            <div className="absolute top-0 h-3 w-0.5 bg-success" style={{ left: `${progressData.idealPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>0</span>
            <span className="text-warning">Empate: {roasData.roasEmpate!.toFixed(2)}</span>
            <span className="text-success">Ideal: {roasData.roasIdeal!.toFixed(2)}</span>
          </div>
        </div>
      )}

      {status && (
        <div className={cn('glass-card p-4 border', statusBg[status as keyof typeof statusBg])}>
          <p className={cn('font-bold text-sm', statusColors[status as keyof typeof statusColors])}>{getRoasMessage(status)}</p>
        </div>
      )}
    </>
  );
}

// ─── Product Analysis Sub-tab ───

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

  const status = roasData && !roasData.margemInsuficiente && roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal
    ? getRoasStatus(roasData.roasAtual, roasData.roasEmpate, roasData.roasIdeal) : null;

  if (!currentStore || currentStore.products.length === 0) {
    return <EmptyState icon={Target} text="Adicione produtos primeiro" />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-4">
        <Label className="text-sm font-bold">Selecione o Produto</Label>
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger><SelectValue placeholder="Escolha um produto..." /></SelectTrigger>
          <SelectContent>
            {currentStore.products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.salePrice)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProduct && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Gasto em Ads (R$)</Label>
                <Input type="number" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="0,00" className="input-modern" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Receita dos Ads (R$)</Label>
                <Input type="number" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="0,00" className="input-modern" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">💾 Valores salvos automaticamente</p>
          </>
        )}
      </div>

      {roasData && <RoasDisplay roasData={roasData} status={status} />}

      {roasData && !roasData.margemInsuficiente && selectedProduct && (
        <>
          <div className="glass-card p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Detalhamento</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço de Venda</span><span className="font-semibold">{formatCurrency(selectedProduct.salePrice)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa Shopee</span><span className="font-semibold text-destructive">-{formatCurrency(roasData.taxaShopee)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor Recebido</span><span className="font-semibold">{formatCurrency(roasData.valorRecebido)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo do Produto</span><span className="font-semibold text-destructive">-{formatCurrency(selectedProduct.costPrice)}</span></div>
            <div className="flex justify-between text-sm pt-2 border-t border-border/50"><span className="font-bold">Lucro antes de Ads</span><span className={cn('font-bold', roasData.lucroBruto >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(roasData.lucroBruto)}</span></div>
          </div>
          <div className="glass-card p-4 bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground leading-relaxed"><strong>ROAS de empate</strong> é o mínimo para não ter prejuízo. <strong>ROAS ideal</strong> indica lucro saudável para escalar.</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Simulator Sub-tab ───

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
      results.push({ roas, receita, lucroAds: receita - simGasto, status: roas < empate ? 'danger' : roas < ideal ? 'warning' : 'success' });
    }
    return results;
  }, [simPrice, simCost, simGasto, selectedProduct]);

  if (!currentStore || currentStore.products.length === 0) {
    return <EmptyState icon={Sliders} text="Adicione produtos primeiro" />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-4">
        <Label className="text-sm font-bold">Selecione o Produto</Label>
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger><SelectValue placeholder="Escolha um produto..." /></SelectTrigger>
          <SelectContent>
            {currentStore.products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.salePrice)}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {selectedProduct && (
        <>
          <div className="glass-card p-4 space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Simulação de Cenários</p>
            <div className="space-y-2">
              <div className="flex justify-between"><Label className="text-xs text-muted-foreground">Preço de Venda</Label><span className="text-sm font-bold">{formatCurrency(simPrice)}</span></div>
              <Slider value={[simPrice]} onValueChange={([v]) => setSimPrice(v)} min={Math.max(1, selectedProduct.salePrice * 0.5)} max={selectedProduct.salePrice * 2} step={1} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label className="text-xs text-muted-foreground">Custo do Produto</Label><span className="text-sm font-bold">{formatCurrency(simCost)}</span></div>
              <Slider value={[simCost]} onValueChange={([v]) => setSimCost(v)} min={Math.max(0.5, selectedProduct.costPrice * 0.3)} max={selectedProduct.costPrice * 2} step={0.5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label className="text-xs text-muted-foreground">Gasto em Ads</Label><span className="text-sm font-bold">{formatCurrency(simGasto)}</span></div>
              <Slider value={[simGasto]} onValueChange={([v]) => setSimGasto(v)} min={5} max={500} step={5} />
            </div>
          </div>

          {simData && !simData.margemInsuficiente && (
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">ROAS Empate</p>
                <p className="text-xl font-extrabold tabular-nums text-warning">{simData.roasEmpate!.toFixed(2)}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">ROAS Ideal</p>
                <p className="text-xl font-extrabold tabular-nums text-success">{simData.roasIdeal!.toFixed(2)}</p>
              </div>
            </div>
          )}

          {simData?.margemInsuficiente && (
            <div className="glass-card p-4 border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="font-bold text-destructive text-sm">Margem insuficiente neste cenário</p>
              </div>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tabela de Cenários</p>
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-muted-foreground pb-1 border-b border-border/50">
                  <span>ROAS</span><span className="text-right">Receita</span><span className="text-right">Lucro Ads</span>
                </div>
                {scenarios.map((s, i) => (
                  <div key={i} className={cn('grid grid-cols-3 text-sm py-1.5 rounded px-1', i % 2 === 0 && 'bg-secondary/30')}>
                    <span className={cn('font-bold tabular-nums', statusColors[s.status as keyof typeof statusColors])}>{s.roas.toFixed(1)}x</span>
                    <span className="text-right tabular-nums font-medium">{formatCurrency(s.receita)}</span>
                    <span className={cn('text-right tabular-nums font-bold', s.lucroAds >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(s.lucroAds)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Ranking Sub-tab ───

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

  if (!currentStore || ranking.length === 0) {
    return <EmptyState icon={Target} text="Adicione produtos para ver o ranking" />;
  }

  const withAds = ranking.filter(r => r.roasAtual !== null);
  const withoutAds = ranking.filter(r => r.roasAtual === null);

  return (
    <div className="space-y-4">
      {withAds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Com dados de Ads</p>
          {withAds.map((r, i) => (
            <div key={r.product.id} className="glass-card p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                  r.status === 'success' ? 'bg-success/20 text-success' : r.status === 'warning' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive')}>#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">Ads: {formatCurrency(r.product.adsCost)} → {formatCurrency(r.product.adsRevenue)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {r.status === 'success' ? <TrendingUp className="w-4 h-4 text-success" /> : r.status === 'danger' ? <TrendingDown className="w-4 h-4 text-destructive" /> : null}
                    <span className={cn('font-extrabold text-lg tabular-nums', statusColors[r.status as keyof typeof statusColors])}>{r.roasAtual!.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-muted-foreground"><span>Emp: {r.roasEmpate?.toFixed(1)}</span><span>Ideal: {r.roasIdeal?.toFixed(1)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutAds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sem dados de Ads</p>
          {withoutAds.map(r => (
            <div key={r.product.id} className="glass-card p-4 opacity-70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-secondary text-muted-foreground">—</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(r.product.salePrice)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {r.margemInsuficiente ? (
                    <span className="text-xs font-bold text-destructive">Margem insuficiente</span>
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

      <div className="glass-card p-4 bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground leading-relaxed">Preencha o <strong>Gasto</strong> e a <strong>Receita de Ads</strong> na aba "Produto" ou importe um relatório da Shopee na aba "Importar".</p>
      </div>
    </div>
  );
}

// ─── Import Sub-tab ───

interface SavedReport {
  id: string;
  report_period: string;
  shop_name: string;
  imported_at: string;
  ads_data: ShopeeAdRow[];
}

function AdsImport() {
  const { currentStore } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [parsedReport, setParsedReport] = useState<ShopeeAdsReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    if (!currentStore) return;
    setLoading(true);
    const { data } = await supabase
      .from('ads_reports')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('imported_at', { ascending: false });

    if (data) {
      setSavedReports(data.map(r => ({
        ...r,
        ads_data: (r.ads_data as unknown as ShopeeAdRow[]) || [],
      })));
    }
    setLoading(false);
  }, [currentStore?.id]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo CSV exportado da Shopee');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const report = parseShopeeCSV(text);
      if (!report || report.ads.length === 0) {
        toast.error('Não foi possível ler o relatório. Verifique se é um CSV de Ads da Shopee.');
        return;
      }
      setParsedReport(report);
      toast.success(`${report.ads.length} anúncios encontrados!`);
    } catch {
      toast.error('Erro ao ler o arquivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveReport = async () => {
    if (!parsedReport || !currentStore) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login para salvar relatórios');
      return;
    }

    const { error } = await supabase.from('ads_reports').insert([{
      user_id: user.id,
      store_id: currentStore.id,
      report_period: parsedReport.period,
      shop_name: parsedReport.shopName,
      ads_data: JSON.parse(JSON.stringify(parsedReport.ads)),
    }]);

    if (error) {
      toast.error('Erro ao salvar relatório');
      console.error(error);
    } else {
      toast.success('Relatório salvo!');
      setParsedReport(null);
      loadReports();
    }
  };

  const handleDeleteReport = async (id: string) => {
    const { error } = await supabase.from('ads_reports').delete().eq('id', id);
    if (!error) {
      toast.success('Relatório removido');
      loadReports();
      if (viewingReport?.id === id) setViewingReport(null);
    }
  };

  if (!currentStore) return <EmptyState icon={Upload} text="Selecione uma loja primeiro" />;

  const displayAds = viewingReport ? viewingReport.ads_data : parsedReport?.ads;
  const displayTitle = viewingReport 
    ? `${viewingReport.shop_name} — ${viewingReport.report_period}` 
    : parsedReport 
      ? `${parsedReport.shopName} — ${parsedReport.period}` 
      : null;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-bold">Importar Relatório da Shopee</p>
        <p className="text-xs text-muted-foreground">Exporte o relatório de Ads da Shopee em CSV e importe aqui.</p>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" className="w-full h-12">
          <Upload className="w-4 h-4 mr-2" />
          {importing ? 'Importando...' : 'Selecionar arquivo CSV'}
        </Button>
      </div>

      {/* Parsed Preview */}
      {parsedReport && !viewingReport && (
        <div className="glass-card p-4 space-y-3 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{parsedReport.shopName}</p>
              <p className="text-xs text-muted-foreground">{parsedReport.period}</p>
            </div>
            <Button size="sm" onClick={handleSaveReport} className="gradient-primary">
              💾 Salvar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Investido</p>
              <p className="text-lg font-extrabold text-destructive tabular-nums">{formatCurrency(parsedReport.totals.totalSpend)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Receita (GMV)</p>
              <p className="text-lg font-extrabold text-success tabular-nums">{formatCurrency(parsedReport.totals.totalGmv)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ROAS Médio</p>
              <p className="text-lg font-extrabold text-primary tabular-nums">{parsedReport.totals.avgRoas.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Itens Vendidos</p>
              <p className="text-lg font-extrabold text-foreground tabular-nums">{parsedReport.totals.totalItemsSold}</p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Relatórios Salvos</p>
          {savedReports.map(report => (
            <div key={report.id} className={cn('glass-card p-3 flex items-center gap-3', viewingReport?.id === report.id && 'border border-primary/40')}>
              <FileSpreadsheet className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{report.shop_name || 'Relatório'}</p>
                <p className="text-[10px] text-muted-foreground">{report.report_period} • {report.ads_data.length} anúncios</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingReport(viewingReport?.id === report.id ? null : report)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteReport(report.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>}

      {/* Ads Detail Table */}
      {displayAds && displayAds.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          {displayTitle && <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{displayTitle}</p>}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {displayAds.map((ad, i) => {
              const roasVal = ad.roas;
              const adStatus = ad.spend === 0 ? null : roasVal >= 5 ? 'success' : roasVal >= 2 ? 'warning' : 'danger';
              return (
                <div key={i} className="p-3 rounded-lg bg-secondary/30 space-y-1.5">
                  <p className="text-sm font-bold truncate">{ad.adName}</p>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Gasto</p>
                      <p className="font-bold text-destructive">{formatCurrency(ad.spend)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GMV</p>
                      <p className="font-bold text-success">{formatCurrency(ad.gmv)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROAS</p>
                      <p className={cn('font-bold', adStatus ? statusColors[adStatus as keyof typeof statusColors] : 'text-muted-foreground')}>{roasVal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vendidos</p>
                      <p className="font-bold">{ad.itemsSold}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{ad.impressions.toLocaleString()} imp.</span>
                    <span>{ad.clicks} cliques</span>
                    <span>CTR: {ad.ctr.toFixed(2)}%</span>
                    <span className="ml-auto font-medium">{ad.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && savedReports.length === 0 && !parsedReport && (
        <div className="glass-card p-4 bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            📊 Acesse <strong>Shopee Seller Center → Anúncios → Relatórios</strong>, exporte em CSV e importe aqui para acompanhar seu ROAS ao longo do tempo.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ───

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Main Export ───

export function RoasAnalysis() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="product" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="product" className="text-xs">Produto</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">Simulador</TabsTrigger>
          <TabsTrigger value="ranking" className="text-xs">Ranking</TabsTrigger>
          <TabsTrigger value="import" className="text-xs">Importar</TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="mt-4"><ProductAnalysis /></TabsContent>
        <TabsContent value="simulator" className="mt-4"><RoasSimulator /></TabsContent>
        <TabsContent value="ranking" className="mt-4"><RoasRanking /></TabsContent>
        <TabsContent value="import" className="mt-4"><AdsImport /></TabsContent>
      </Tabs>
    </div>
  );
}
