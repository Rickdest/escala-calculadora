import { X, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Pause, ArrowUpRight, Eye, MousePointerClick, ShoppingCart, DollarSign, MapPin, Percent, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { Product } from '@/types/store';
import { calcProductRoas, RoasResult } from '@/lib/roasUtils';
import { useStore } from '@/contexts/StoreContext';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface ProductAdsDetailProps {
  metric: AdMetricDerived & { _productId: string | null; _id: string };
  product: Product | undefined;
  onClose: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getPerformanceStatus(roas: number, roasResult: RoasResult | null) {
  if (roasResult && !roasResult.margemInsuficiente && roasResult.roasEmpate) {
    if (roas < roasResult.roasEmpate) return { label: 'Prejuízo', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: TrendingDown };
    if (roas < (roasResult.roasSaudavel || roasResult.roasEmpate * 1.5)) return { label: 'Margem baixa', color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle };
    return { label: 'Lucrativo', color: 'text-success', bg: 'bg-success/10 border-success/30', icon: TrendingUp };
  }
  if (roas < 2) return { label: 'Prejuízo', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: TrendingDown };
  if (roas < 5) return { label: 'Margem baixa', color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle };
  return { label: 'Lucrativo', color: 'text-success', bg: 'bg-success/10 border-success/30', icon: TrendingUp };
}

function generateInsights(metric: AdMetricDerived, roasResult: RoasResult | null): Array<{ text: string; type: 'success' | 'warning' | 'danger'; icon: React.ElementType }> {
  const insights: Array<{ text: string; type: 'success' | 'warning' | 'danger'; icon: React.ElementType }> = [];

  // CTR analysis
  if (metric.ctr < 1) {
    insights.push({ text: 'CTR muito baixo. Melhore título, foto ou segmentação do anúncio.', type: 'danger', icon: MousePointerClick });
  } else if (metric.ctr >= 3) {
    insights.push({ text: 'CTR excelente! Seu anúncio atrai muitos cliques.', type: 'success', icon: MousePointerClick });
  }

  // CPC analysis
  if (metric.cpc > 2) {
    insights.push({ text: `CPC alto (${fmt(metric.cpc)}). Considere ajustar o lance ou segmentação.`, type: 'warning', icon: DollarSign });
  }

  // Conversion rate
  if (metric.convRate < 1) {
    insights.push({ text: 'Taxa de conversão baixa. Revise preço, fotos e descrição do produto.', type: 'danger', icon: ShoppingCart });
  } else if (metric.convRate >= 5) {
    insights.push({ text: 'Conversão alta! Produto bem posicionado para escalar.', type: 'success', icon: ShoppingCart });
  }

  // ROAS-based recommendations
  if (roasResult && !roasResult.margemInsuficiente && roasResult.roasEmpate) {
    if (metric.roas < roasResult.roasEmpate) {
      insights.push({ text: 'ROAS abaixo do empate. Considere pausar este anúncio.', type: 'danger', icon: Pause });
    } else if (metric.roas >= (roasResult.roasIdeal || roasResult.roasEmpate * 2.5)) {
      insights.push({ text: 'ROAS excelente! Aumente o orçamento para escalar vendas.', type: 'success', icon: ArrowUpRight });
    }
  } else {
    if (metric.roas < 2) {
      insights.push({ text: 'ROAS abaixo de 2x. Considere pausar este anúncio.', type: 'danger', icon: Pause });
    } else if (metric.roas >= 5) {
      insights.push({ text: 'ROAS excelente! Aumente o orçamento para escalar vendas.', type: 'success', icon: ArrowUpRight });
    }
  }

  // Position analysis
  if (metric.avgPosition !== null && metric.avgPosition > 20) {
    insights.push({ text: `Posição média #${metric.avgPosition} — aumente o lance para melhorar visibilidade.`, type: 'warning', icon: MapPin });
  }

  // Cost per sale
  if (metric.costPerSale > 0 && roasResult && roasResult.lucroBruto > 0 && metric.costPerSale > roasResult.lucroBruto) {
    insights.push({ text: `Custo por venda (${fmt(metric.costPerSale)}) maior que o lucro bruto. Anúncio dá prejuízo.`, type: 'danger', icon: DollarSign });
  }

  return insights;
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      </div>
      <p className="text-lg font-extrabold font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProductAdsDetail({ metric, product, onClose }: ProductAdsDetailProps) {
  const { currentStore } = useStore();
  const config = currentStore?.config;

  const roasResult = useMemo(() => {
    if (!product || !config) return null;
    return calcProductRoas(product, config);
  }, [product, config]);

  const status = getPerformanceStatus(metric.roas, roasResult);
  const StatusIcon = status.icon;
  const insights = useMemo(() => generateInsights(metric, roasResult), [metric, roasResult]);

  const periodLabel = (() => {
    const f = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
    return `${f(metric.periodStart)} – ${f(metric.periodEnd)}`;
  })();

  const displayName = product?.name || metric.shopeeProductName || 'Produto';

  // Profit per sale from ads
  const profitPerAdSale = roasResult ? roasResult.lucroBruto - metric.costPerSale : null;
  const breakEvenRoas = roasResult && !roasResult.margemInsuficiente && roasResult.roasEmpate ? roasResult.roasEmpate : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm truncate">{displayName}</h3>
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel}</p>
          </div>
          <Badge className={cn('border text-xs font-bold gap-1', status.bg, status.color)}>
            <StatusIcon className="w-3 h-3" /> {status.label}
          </Badge>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg ml-1">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={Eye} label="Impressões" value={metric.impressions.toLocaleString('pt-BR')} />
            <StatCard icon={MousePointerClick} label="Cliques" value={metric.clicks.toLocaleString('pt-BR')} />
            <StatCard icon={ShoppingCart} label="Vendas" value={String(metric.itemsSold)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={Percent} label="CTR" value={`${metric.ctr.toFixed(2)}%`} sub={metric.ctr >= 2 ? 'Bom' : 'Baixo'} />
            <StatCard icon={DollarSign} label="CPC" value={fmt(metric.cpc)} sub={metric.cpc <= 1 ? 'Bom' : 'Alto'} />
            <StatCard icon={Target} label="Conv. Rate" value={`${metric.convRate.toFixed(2)}%`} sub={metric.convRate >= 3 ? 'Bom' : 'Baixo'} />
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={DollarSign} label="Investimento" value={fmt(metric.spend)} />
            <StatCard icon={DollarSign} label="Receita (GMV)" value={fmt(metric.gmv)} />
          </div>

          {/* ROAS & Profit Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className={cn('rounded-xl border p-3 space-y-1', status.bg)}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">ROAS</span>
              <p className={cn('text-2xl font-extrabold font-mono tabular-nums', status.color)}>{metric.roas.toFixed(2)}x</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">ACOS</span>
              <p className={cn('text-2xl font-extrabold font-mono tabular-nums', metric.acos <= 20 ? 'text-success' : metric.acos <= 40 ? 'text-warning' : 'text-destructive')}>
                {metric.acos.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Retorno Líq.</span>
              <p className={cn('text-2xl font-extrabold font-mono tabular-nums', metric.liquidReturn >= 0 ? 'text-success' : 'text-destructive')}>
                {fmt(metric.liquidReturn)}
              </p>
            </div>
          </div>

          {/* Break-even & Profit Context */}
          {roasResult && !roasResult.margemInsuficiente && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Análise de Lucratividade
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {breakEvenRoas && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">ROAS Empate</p>
                    <p className="font-bold font-mono tabular-nums text-warning">{breakEvenRoas.toFixed(2)}x</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground">Lucro bruto/und</p>
                  <p className="font-bold font-mono tabular-nums text-foreground">{fmt(roasResult.lucroBruto)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Custo por venda</p>
                  <p className="font-bold font-mono tabular-nums text-foreground">{fmt(metric.costPerSale)}</p>
                </div>
                {profitPerAdSale !== null && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Lucro/venda c/ Ads</p>
                    <p className={cn('font-bold font-mono tabular-nums', profitPerAdSale >= 0 ? 'text-success' : 'text-destructive')}>
                      {fmt(profitPerAdSale)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Position */}
          {metric.avgPosition !== null && (
            <div className="flex items-center gap-2 px-1">
              <MapPin className="w-4 h-4 text-destructive" />
              <span className="text-sm font-bold font-mono tabular-nums">Posição Média: #{metric.avgPosition}</span>
            </div>
          )}

          {/* Smart Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Recomendações Inteligentes
              </p>
              <div className="space-y-1.5">
                {insights.map((insight, i) => {
                  const InsightIcon = insight.icon;
                  const colors = {
                    success: 'border-success/20 bg-success/5 text-success',
                    warning: 'border-warning/20 bg-warning/5 text-warning',
                    danger: 'border-destructive/20 bg-destructive/5 text-destructive',
                  };
                  return (
                    <div key={i} className={cn('flex items-start gap-2.5 p-2.5 rounded-lg border', colors[insight.type])}>
                      <InsightIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground">{insight.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
