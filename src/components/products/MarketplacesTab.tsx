import { useState, useMemo, useEffect } from 'react';
import { Wallet, DollarSign, Percent, Target, Store, ChevronDown, BarChart3, Zap, Pencil, Save, Loader2 } from 'lucide-react';
import { cn, getMarginStatus } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ChannelResult } from '@/lib/outrosCanaisUtils';
import { calcML, ML_CATEGORIES, type MLAnuncio } from '@/lib/mlUtils';
import { MLChannelData, OutrosCanais } from '@/types/store';
import { toast } from 'sonner';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const SALES_PRESETS = [30, 50, 100, 200, 500];

const COLORS = [
  'hsl(217 91% 60%)',
  'hsl(var(--primary))',
  'hsl(271 91% 65%)',
  'hsl(48 96% 53%)',
  'hsl(173 80% 40%)',
  'hsl(330 81% 60%)',
  'hsl(24 95% 53%)',
];

interface Props {
  channels: ChannelResult[];
  desiredMargin: number;
  onEditProduct: () => void;
  mlData?: MLChannelData;
  outrosCanais?: OutrosCanais;
  taxesPercent?: number;
  onSaveOutrosCanais?: (next: OutrosCanais) => void | Promise<void>;
}

function MLInlineEditor({
  initial,
  taxesPercent,
  desiredMargin,
  onSave,
}: {
  initial: MLChannelData;
  taxesPercent: number;
  desiredMargin: number;
  onSave: (next: MLChannelData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MLChannelData>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const priceClassico = draft.salePriceClassico ?? draft.salePrice ?? 0;
  const pricePremium = draft.salePricePremium ?? draft.salePrice ?? 0;

  const classico = useMemo(
    () => calcML(priceClassico, draft.costPrice || 0, draft.categoryIndex ?? 0, 'classico', draft.freightCost || 0, draft.packagingCost || 0, taxesPercent),
    [priceClassico, draft, taxesPercent]
  );
  const premium = useMemo(
    () => calcML(pricePremium, draft.costPrice || 0, draft.categoryIndex ?? 0, 'premium', draft.freightCost || 0, draft.packagingCost || 0, taxesPercent),
    [pricePremium, draft, taxesPercent]
  );

  const current = draft.anuncio || 'classico';

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sincroniza salePrice com o preço do anúncio selecionado, para manter compatibilidade
      // com calcOutrosCanais (que usa salePrice).
      const activePrice = (draft.anuncio === 'premium' ? pricePremium : priceClassico) || draft.salePrice;
      await onSave({ ...draft, salePrice: activePrice });
      toast.success('Mercado Livre atualizado!');
      setOpen(false);
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const diffProfit = premium.netProfit - classico.netProfit;
  const diffMargin = premium.margin - classico.margin;

  const PlanCard = ({ label, data, kind }: { label: string; data: ReturnType<typeof calcML>; kind: MLAnuncio }) => {
    const isCurrent = current === kind;
    const status = getMarginStatus(data.margin);
    return (
      <button
        type="button"
        onClick={() => setDraft(d => ({ ...d, anuncio: kind }))}
        className={cn(
          'text-left rounded-lg border p-3 transition-all',
          isCurrent ? 'border-yellow-400/70 bg-yellow-400/5 ring-1 ring-yellow-400/40' : 'border-border bg-secondary/30 hover:border-yellow-400/30'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-foreground">{label}</span>
          {isCurrent && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-400 text-black px-1.5 py-0.5 rounded">Atual</span>
          )}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-muted-foreground">Comissão {(data.commissionRate * 100).toFixed(1)}%</p>
          <p className="text-[10px] font-mono text-foreground/80 tabular-nums">{fmt(data.salePrice)}</p>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className={cn('font-mono text-base font-bold tabular-nums', data.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
              {fmt(data.netProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">Lucro/un</p>
          </div>
          <div className="text-right">
            <p className={cn('font-mono text-base font-bold tabular-nums', status.color)}>{data.margin.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Margem</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="border-t border-yellow-400/20 pt-4 mt-2 space-y-4">
      {/* Comparativo Clássico vs Premium */}
      <div>
        <p className="section-label mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-yellow-400" />
          Comparativo Clássico vs Premium
          <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">— clique para escolher</span>
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <PlanCard label="Clássico" data={classico} kind="classico" />
          <PlanCard label="Premium" data={premium} kind="premium" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] bg-secondary/40 border border-border rounded-md px-2.5 py-1.5">
          <span className="text-muted-foreground">Premium vs Clássico</span>
          <span className="font-mono font-semibold tabular-nums">
            <span className={diffProfit >= 0 ? 'text-success' : 'text-destructive'}>
              {diffProfit >= 0 ? '+' : ''}{fmt(diffProfit)}
            </span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className={diffMargin >= 0 ? 'text-success' : 'text-destructive'}>
              {diffMargin >= 0 ? '+' : ''}{diffMargin.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Toggle editor */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-foreground bg-secondary/40 hover:bg-secondary border border-border rounded-md px-3 py-2 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-yellow-400" />
          Editar dados do Mercado Livre
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 bg-secondary/20 border border-border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="section-label">Custo (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0"
                value={draft.costPrice || ''}
                onChange={e => setDraft(d => ({ ...d, costPrice: parseFloat(e.target.value) || 0 }))}
                className="h-10 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="section-label">Venda (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0"
                value={draft.salePrice || ''}
                onChange={e => setDraft(d => ({ ...d, salePrice: parseFloat(e.target.value) || 0 }))}
                className="h-10 font-mono" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="section-label">Categoria</label>
            <select
              value={draft.categoryIndex ?? 0}
              onChange={e => setDraft(d => ({ ...d, categoryIndex: parseInt(e.target.value) }))}
              className="h-10 w-full bg-background border border-border rounded-lg text-xs px-2 text-foreground"
            >
              {ML_CATEGORIES.map((cat, i) => (
                <option key={cat.label} value={i}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="section-label">Frete (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0"
                value={draft.freightCost || ''}
                onChange={e => setDraft(d => ({ ...d, freightCost: parseFloat(e.target.value) || 0 }))}
                className="h-10 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="section-label">Embalagem (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0"
                value={draft.packagingCost || ''}
                onChange={e => setDraft(d => ({ ...d, packagingCost: parseFloat(e.target.value) || 0 }))}
                className="h-10 font-mono" />
            </div>
          </div>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className={cn(
              'w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
              dirty && !saving
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : dirty ? 'Salvar alterações' : 'Sem alterações'}
          </button>
        </div>
      )}
    </div>
  );
}

function ChannelDetail({
  channel,
  desiredMargin,
  mlEditor,
}: {
  channel: ChannelResult;
  desiredMargin: number;
  mlEditor?: React.ReactNode;
}) {
  const [monthlySales, setMonthlySales] = useState(50);
  const [showAll, setShowAll] = useState(false);
  const status = getMarginStatus(channel.margin);
  const marginDiff = channel.margin - desiredMargin;
  const isML = channel.key === 'ml';

  const allCosts = [
    { label: 'Custo do produto', value: channel.costPrice, color: COLORS[0] },
    ...channel.fees.map((f, i) => ({ label: f.label, value: f.value, color: COLORS[(i + 1) % COLORS.length] })),
  ];
  const totalCosts = allCosts.reduce((s, c) => s + c.value, 0);
  const visible = showAll ? allCosts : allCosts.filter(c => c.value > 0);
  const hiddenCount = allCosts.length - allCosts.filter(c => c.value > 0).length;

  const projection = {
    revenue: channel.salePrice * monthlySales,
    costs: totalCosts * monthlySales,
    profit: channel.netProfit * monthlySales,
  };

  const statusBadge = (() => {
    if (channel.margin < 0) return { text: '✕ Prejuízo', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (channel.margin < 10) return { text: '⚠ Atenção', cls: 'bg-warning/10 text-warning border-warning/30' };
    const diff = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1);
    return { text: `✓ ${status.label} · ${diff}% vs meta`, cls: 'bg-success/10 text-success border-success/30' };
  })();

  return (
    <div className={cn(
      'surface-card p-4 md:p-5 space-y-4 md:space-y-5',
      isML && 'border-l-4 border-l-yellow-400'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Store className={cn('w-4 h-4 shrink-0', isML ? 'text-yellow-400' : 'text-primary')} />
          <h3 className={cn('font-bold text-base md:text-lg truncate', isML ? 'text-yellow-300' : 'text-foreground')}>
            {channel.label}
          </h3>
          {isML && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-400 text-black px-1.5 py-0.5 rounded shrink-0">ML</span>
          )}
        </div>
        <span className={cn('inline-flex items-center text-[11px] md:text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0', statusBadge.cls)}>
          {statusBadge.text}
        </span>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <div className={cn('bg-secondary/50 p-3 border-l-2 rounded-lg', channel.netProfit >= 0 ? 'border-l-success' : 'border-l-destructive')}>
          <DollarSign className="w-3 h-3 text-muted-foreground/40 mb-1" />
          <p className={cn('font-mono text-lg md:text-xl font-bold tabular-nums truncate', channel.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
            {fmt(channel.netProfit)}
          </p>
          <p className="label-metric mt-0.5">Lucro/un</p>
        </div>
        <div className={cn('bg-secondary/50 p-3 border-l-2 rounded-lg',
          channel.margin < 0 ? 'border-l-destructive' : channel.margin < 10 ? 'border-l-warning' : 'border-l-success')}>
          <Percent className="w-3 h-3 text-muted-foreground/40 mb-1" />
          <p className={cn('font-mono text-lg md:text-xl font-bold tabular-nums truncate', status.color)}>
            {channel.margin.toFixed(1)}%
          </p>
          <p className="label-metric mt-0.5">Margem real</p>
        </div>
        <div className={cn('bg-secondary/50 p-3 border-l-2 rounded-lg', marginDiff >= 0 ? 'border-l-primary' : 'border-l-destructive')}>
          <Target className="w-3 h-3 text-muted-foreground/40 mb-1" />
          <p className={cn('font-mono text-lg md:text-xl font-bold tabular-nums truncate', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
            {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
          </p>
          <p className="label-metric mt-0.5">vs Meta {desiredMargin}%</p>
        </div>
        <div className="bg-secondary/50 p-3 border-l-2 border-l-foreground/30 rounded-lg">
          <BarChart3 className="w-3 h-3 text-muted-foreground/40 mb-1" />
          <p className="font-mono text-lg md:text-xl font-bold tabular-nums truncate text-foreground">
            {fmt(channel.salePrice)}
          </p>
          <p className="label-metric mt-0.5">Preço venda</p>
        </div>
      </div>

      {/* ML inline editor + classico/premium comparison */}
      {isML && mlEditor}

      {/* Breakdown */}
      <div>
        <p className="section-label mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Breakdown de Custos
        </p>
        {totalCosts > 0 && (
          <div className="mb-4">
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-secondary">
              {allCosts.filter(c => c.value > 0).map((item) => {
                const pct = (item.value / totalCosts) * 100;
                return (
                  <div key={item.label} style={{ width: `${pct}%`, background: item.color }} title={`${item.label}: ${pct.toFixed(1)}%`} />
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Distribuição proporcional dos custos</p>
          </div>
        )}
        <div className="space-y-1">
          {visible.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className={cn('font-mono text-sm font-medium tabular-nums w-24 text-right shrink-0',
                item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                {item.value > 0 ? fmt(item.value) : '—'}
              </span>
            </div>
          ))}
        </div>
        {hiddenCount > 0 && !showAll && (
          <button onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
            <ChevronDown className="w-3 h-3" />
            Ver {hiddenCount} {hiddenCount === 1 ? 'item zerado' : 'itens zerados'}
          </button>
        )}
        <div className="border-t border-border pt-3 mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">Total de custos</span>
          <span className="font-mono text-sm font-bold text-destructive tabular-nums">{fmt(totalCosts)}</span>
        </div>
      </div>

      {/* Projeção mensal */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="section-label flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Projeção Mensal
          </p>
          <div className="flex items-baseline gap-1.5 bg-secondary/60 border border-border rounded-lg px-2.5 py-1">
            <input
              value={monthlySales}
              onChange={e => setMonthlySales(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              type="number"
              className="w-12 bg-transparent text-right font-mono text-sm font-bold text-primary outline-none tabular-nums"
            />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">vendas/mês</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SALES_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setMonthlySales(preset)}
              className={cn(
                'flex-1 min-w-[52px] h-8 rounded-md text-xs font-semibold border transition-all tabular-nums',
                monthlySales === preset
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} />
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/60 font-mono tabular-nums">
            <span>1</span>
            <span>1.000</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-secondary/50 border border-border rounded-lg p-3">
            <p className="font-mono text-sm md:text-base font-bold text-success tabular-nums truncate">{fmt(projection.revenue)}</p>
            <p className="label-metric text-muted-foreground mt-0.5">Receita bruta</p>
          </div>
          <div className="bg-secondary/50 border border-border rounded-lg p-3">
            <p className="font-mono text-sm md:text-base font-bold text-destructive tabular-nums truncate">{fmt(projection.costs)}</p>
            <p className="label-metric text-muted-foreground mt-0.5">Custos totais</p>
          </div>
          <div className="bg-secondary/50 border border-border rounded-lg p-3">
            <p className={cn('font-mono text-sm md:text-base font-bold tabular-nums truncate', projection.profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(projection.profit)}</p>
            <p className="label-metric text-muted-foreground mt-0.5">Lucro mensal</p>
          </div>
          <div className="bg-secondary/50 border border-border rounded-lg p-3">
            <p className={cn('font-mono text-sm md:text-base font-bold tabular-nums', status.color)}>{channel.margin.toFixed(1)}%</p>
            <p className="label-metric text-muted-foreground mt-0.5">Margem</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketplacesTab({
  channels,
  desiredMargin,
  onEditProduct,
  mlData,
  outrosCanais,
  taxesPercent = 0,
  onSaveOutrosCanais,
}: Props) {
  if (channels.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <Store className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Nenhum outro marketplace cadastrado</p>
        <p className="text-xs text-muted-foreground/70 mb-4">
          Cadastre TikTok Shop, Shein, Amazon ou Mercado Livre no produto para ver a análise detalhada por canal.
        </p>
        <button
          onClick={onEditProduct}
          className="inline-flex h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold items-center gap-1.5 hover:bg-primary/90 transition-colors"
        >
          Preencher "Outros Canais"
        </button>
      </div>
    );
  }

  const handleSaveMl = async (next: MLChannelData) => {
    if (!onSaveOutrosCanais) return;
    await onSaveOutrosCanais({ ...(outrosCanais ?? {}), ml: next });
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {channels.map(c => (
        <ChannelDetail
          key={c.key}
          channel={c}
          desiredMargin={desiredMargin}
          mlEditor={
            c.key === 'ml' && mlData && onSaveOutrosCanais ? (
              <MLInlineEditor
                initial={mlData}
                taxesPercent={taxesPercent}
                desiredMargin={desiredMargin}
                onSave={handleSaveMl}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
