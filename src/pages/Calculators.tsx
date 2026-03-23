import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { calcTikTok, type TikTokResult } from '@/lib/tiktokUtils';
import { calcShein, type SheinResult, type SheinCategory } from '@/lib/sheinUtils';
import { calcAmazon, type AmazonResult, type AmazonPlan, AMAZON_CATEGORIES } from '@/lib/amazonUtils';
import { calcML, type MLResult, type MLAnuncio, ML_CATEGORIES } from '@/lib/mlUtils';
import { TrendingUp, AlertTriangle, TrendingDown, ExternalLink, CalendarDays } from 'lucide-react';

type TabKey = 'tiktok' | 'shein' | 'amazon' | 'ml';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'shein', label: 'Shein' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'ml', label: 'Mercado Livre' },
];

// ── Formatters ──

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ── Margin status ──

function getMarginStatus(margin: number, netProfit: number) {
  if (netProfit <= 0) return { label: 'Prejuízo', icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/10 border-danger/30' };
  if (margin < 10) return { label: 'Atenção', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' };
  if (margin < 17) return { label: 'Saudável', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10 border-success/30' };
  return { label: 'Ideal', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10 border-success/30' };
}

// ── Shared input component ──

function NumInput({ label, value, onChange, placeholder, suffix, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-text-2 font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0,00'}
          className="input-modern pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-3">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Result panel ──

interface CostLine { label: string; value: number }

function ResultPanel({ costs, netProfit, margin, salePrice, isReady, showRoas = false }: {
  costs: CostLine[]; netProfit: number; margin: number; salePrice: number; isReady: boolean; showRoas?: boolean;
}) {
  const [salesCount, setSalesCount] = useState(50);
  const status = getMarginStatus(margin, netProfit);
  const StatusIcon = status.icon;

  if (!isReady) {
    return (
      <div className="rounded-[10px] bg-surface-2 border border-border p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-text-3 text-sm text-center">Preencha os campos para ver o resultado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breakdown */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-2">
        <p className="section-label mb-3">Breakdown de custos</p>
        {costs.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-sm">
            <span className="text-text-2">{c.label}</span>
            <span className="text-foreground font-medium tabular-nums">{fmt(c.value)}</span>
          </div>
        ))}
        <div className="border-t border-border my-2" />
        <div className="flex items-center justify-between text-sm font-bold">
          <span className={netProfit >= 0 ? 'text-success' : 'text-danger'}>Lucro líquido</span>
          <span className={cn('tabular-nums', netProfit >= 0 ? 'text-success' : 'text-danger')}>{fmt(netProfit)}</span>
        </div>
      </div>

      {/* Margin */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 text-center space-y-2">
        <p className="section-label">Margem real</p>
        <p className={cn('text-3xl font-extrabold tabular-nums', netProfit >= 0 ? 'text-success' : 'text-danger')}>
          {fmtPct(margin)}
        </p>
        <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold', status.bg, status.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {/* Monthly simulation */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Simulação Mensal</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-3">Vendas por mês</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={salesCount}
              onChange={(e) => setSalesCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 h-8 text-sm text-center font-bold input-modern"
            />
          </div>
          <Slider
            value={[salesCount]}
            onValueChange={([v]) => setSalesCount(v)}
            min={1}
            max={1000}
            step={1}
          />
          <div className="flex justify-between text-[10px] text-text-3">
            <span>1</span><span>500</span><span>1000</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Receita', value: fmt(salePrice * salesCount), color: 'text-foreground' },
            { label: 'Custos', value: fmt((salePrice - netProfit) * salesCount), color: 'text-danger' },
            { label: 'Lucro', value: fmt(netProfit * salesCount), color: netProfit >= 0 ? 'text-success' : 'text-danger' },
          ].map((item) => (
            <div key={item.label} className="bg-background/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-text-3 font-bold uppercase tracking-wider">{item.label}</p>
              <p className={cn('text-xs font-extrabold tabular-nums mt-1', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showRoas && netProfit > 0 && (() => {
        const roasEmpate   = parseFloat((salePrice / netProfit).toFixed(2));
        const roasSaudavel = parseFloat((roasEmpate / 0.61).toFixed(2));
        const roasIdeal    = parseFloat((roasEmpate / 0.40).toFixed(2));
        return (
          <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
            <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider">ROAS</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Empate</span>
                  <span className="text-[10px] text-text-3 ml-1.5">abaixo disso = prejuízo</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">{roasEmpate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Saudável</span>
                  <span className="text-[10px] text-text-3 ml-1.5">lucro consistente</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">{roasSaudavel.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Ideal</span>
                  <span className="text-[10px] text-text-3 ml-1.5">escalar com segurança</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-primary">{roasIdeal.toFixed(2)}</span>
              </div>
            </div>
            {/* Barra colorida */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-text-3 mb-1.5">
                <span>Empate</span><span>Saudável</span><span>Ideal</span>
              </div>
              <div className="relative h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1F2433' }}>
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #EF4444, #EAB308, #22C55E)' }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[10px] tabular-nums" style={{ color: '#EF4444' }}>{roasEmpate.toFixed(2)}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: '#EAB308' }}>{roasSaudavel.toFixed(2)}</span>
                <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: '#22C55E' }}>{roasIdeal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════
// TAB: TikTok Shop
// ══════════════════════════════════════════

function TikTokTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [taxes, setTaxes] = useState('');
  const [hasAffiliate, setHasAffiliate] = useState(false);
  const [affiliatePct, setAffiliatePct] = useState('');

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;

  const result = useMemo<TikTokResult | null>(() => {
    if (!isReady) return null;
    return calcTikTok(sp, cp, parseFloat(packaging) || 0, parseFloat(taxes) || 0, hasAffiliate ? (parseFloat(affiliatePct) || 0) : 0);
  }, [sp, cp, packaging, taxes, hasAffiliate, affiliatePct, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: 'Comissão (6%)', value: result.commission },
    { label: 'Frete (6%)', value: result.shippingFee },
    ...(result.fixedFee > 0 ? [{ label: 'Taxa fixa', value: result.fixedFee }] : []),
    ...(result.affiliateCost > 0 ? [{ label: 'Afiliado', value: result.affiliateCost }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />
        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <NumInput label="Impostos" value={taxes} onChange={setTaxes} suffix="%" />

        <div className="flex items-center justify-between rounded-[10px] bg-surface-2 border border-border p-3">
          <Label className="text-sm text-text-2">Tem afiliado?</Label>
          <Switch checked={hasAffiliate} onCheckedChange={setHasAffiliate} />
        </div>
        {hasAffiliate && (
          <NumInput label="Comissão do afiliado" value={affiliatePct} onChange={setAffiliatePct} suffix="%" />
        )}

        <div className="rounded-[10px] bg-surface-2 border border-border p-3">
          <p className="section-label mb-1">Taxas aplicadas automaticamente</p>
          <p className="text-xs text-text-2">Comissão 6% · Frete 6% · Taxa fixa R$4,00 (se {'<'} R$79)</p>
        </div>
      </div>

      <ResultPanel
        costs={costs}
        netProfit={result?.netProfit ?? 0}
        margin={result?.margin ?? 0}
        salePrice={sp}
        isReady={isReady && !!result}
        showRoas
      />
    </div>
  );
}

// ══════════════════════════════════════════
// TAB: Shein
// ══════════════════════════════════════════

function SheinTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState<SheinCategory>('moda');
  const [weightBand, setWeightBand] = useState('0.3');
  const [packaging, setPackaging] = useState('');
  const [taxes, setTaxes] = useState('');

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;

  const result = useMemo<SheinResult | null>(() => {
    if (!isReady) return null;
    return calcShein(sp, cp, category, parseFloat(weightBand), parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, category, weightBand, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(0)}%)`, value: result.commissionCost },
    ...(result.freightCost > 0 ? [{ label: 'Frete', value: result.freightCost }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as SheinCategory)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="moda">Moda (20%)</SelectItem>
              <SelectItem value="outros">Outras categorias (18%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Peso do produto</Label>
          <Select value={weightBand} onValueChange={setWeightBand}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.3">Até 300g — R$4,00</SelectItem>
              <SelectItem value="1">300g até 1kg — R$5,00</SelectItem>
              <SelectItem value="2">1kg até 2kg — R$5,00</SelectItem>
              <SelectItem value="5">2kg até 5kg — R$6,00</SelectItem>
              <SelectItem value="9">5kg até 9kg — R$7,00</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <NumInput label="Impostos" value={taxes} onChange={setTaxes} suffix="%" />
      </div>

      <ResultPanel
        costs={costs}
        netProfit={result?.netProfit ?? 0}
        margin={result?.margin ?? 0}
        salePrice={sp}
        isReady={isReady && !!result}
      />
    </div>
  );
}

// ══════════════════════════════════════════
// TAB: Amazon
// ══════════════════════════════════════════

function AmazonTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [categoryIdx, setCategoryIdx] = useState('35'); // Demais Categorias
  const [plan, setPlan] = useState<AmazonPlan>('profissional');
  const [packaging, setPackaging] = useState('');
  const [taxes, setTaxes] = useState('');

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;
  const idx = parseInt(categoryIdx);
  const cat = AMAZON_CATEGORIES[idx];

  const result = useMemo<AmazonResult | null>(() => {
    if (!isReady) return null;
    return calcAmazon(sp, cp, cat.rate, plan, parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, cat.rate, plan, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(0)}%)`, value: result.commissionCost },
    ...(result.planFixedFee > 0 ? [{ label: 'Taxa plano individual', value: result.planFixedFee }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Categoria</Label>
          <Select value={categoryIdx} onValueChange={setCategoryIdx}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {AMAZON_CATEGORIES.map((c, i) => (
                <SelectItem key={i} value={String(i)}>
                  {c.label} ({(c.rate * 100).toFixed(0)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Plano</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as AmazonPlan)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="profissional">Profissional</SelectItem>
              <SelectItem value="individual">Individual (+R$2/item)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <NumInput label="Impostos" value={taxes} onChange={setTaxes} suffix="%" />
      </div>

      <ResultPanel
        costs={costs}
        netProfit={result?.netProfit ?? 0}
        margin={result?.margin ?? 0}
        salePrice={sp}
        isReady={isReady && !!result}
      />
    </div>
  );
}

// ══════════════════════════════════════════
// TAB: Mercado Livre
// ══════════════════════════════════════════

function MLTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [categoryIdx, setCategoryIdx] = useState('0');
  const [anuncio, setAnuncio] = useState<MLAnuncio>('classico');
  const [freight, setFreight] = useState('');
  const [packaging, setPackaging] = useState('');
  const [taxes, setTaxes] = useState('');

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;
  const idx = parseInt(categoryIdx);

  const result = useMemo<MLResult | null>(() => {
    if (!isReady) return null;
    return calcML(sp, cp, idx, anuncio, parseFloat(freight) || 0, parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, idx, anuncio, freight, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(1)}%)`, value: result.commissionCost },
    ...(result.fixedFee > 0 ? [{ label: 'Taxa fixa', value: result.fixedFee }] : []),
    ...(result.freightCost > 0 ? [{ label: 'Frete', value: result.freightCost }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Categoria</Label>
          <Select value={categoryIdx} onValueChange={setCategoryIdx}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {ML_CATEGORIES.map((c, i) => (
                <SelectItem key={i} value={String(i)}>
                  {c.label} (Clássico {(c.classico * 100).toFixed(1)}% | Premium {(c.premium * 100).toFixed(1)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Tipo de anúncio</Label>
          <Select value={anuncio} onValueChange={(v) => setAnuncio(v as MLAnuncio)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="classico">Clássico</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <NumInput label="Custo de envio" value={freight} onChange={setFreight} suffix="R$" />
          <a
            href="https://www.mercadolivre.com.br/ajuda/custos-envio-reputacao-verde-mercado-lider_40538"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Consultar tabela de custos do ML <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <NumInput label="Impostos" value={taxes} onChange={setTaxes} suffix="%" />
      </div>

      <ResultPanel
        costs={costs}
        netProfit={result?.netProfit ?? 0}
        margin={result?.margin ?? 0}
        salePrice={sp}
        isReady={isReady && !!result}
        showRoas
      />
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════

const TAB_COMPONENTS: Record<TabKey, () => JSX.Element> = {
  tiktok: TikTokTab,
  shein: SheinTab,
  amazon: AmazonTab,
  ml: MLTab,
};

export default function Calculators() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = rawTab && TAB_COMPONENTS[rawTab] ? rawTab : 'tiktok';

  const setTab = useCallback((tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <AppLayout>
      <PageHeader title="Calculadoras" subtitle="Compare custos entre marketplaces" showStoreSelector={false} />

      <div className="py-4 space-y-5 max-w-4xl mx-auto">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-[10px] bg-surface-2 border border-border p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 min-w-fit px-3 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap',
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-2 hover:text-foreground hover:bg-background/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <ActiveComponent />
      </div>
    </AppLayout>
  );
}
