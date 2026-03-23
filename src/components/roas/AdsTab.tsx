import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, RefreshCw, Plus, CheckCircle, Megaphone,
  FileSpreadsheet, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { Product } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';
import { useProductAdsMetrics } from '@/hooks/useProductAdsMetrics';
import { ImportAdsModal } from './ImportAdsModal';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
function truncate(str: string, max: number) { return str.length > max ? str.slice(0, max) + '…' : str; }
function formatShort(v: number) { return v >= 1000 ? `R$${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : formatCurrency(v); }
function getRoasColorDynamic(roas: number, empate: number, ideal: number) {
  if (roas < empate) return 'text-destructive';
  if (roas < ideal) return 'text-warning';
  return 'text-success';
}
function getAcosColor(acos: number) { return acos <= 20 ? 'text-success' : acos <= 40 ? 'text-warning' : 'text-destructive'; }

// ─── Summary (4 cards only) ───

function SummarySection({ metrics }: { metrics: AdMetricDerived[] }) {
  const totals = useMemo(() => {
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const totalGmv = metrics.reduce((s, m) => s + m.gmv, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgAcos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    return { totalSpend, totalGmv, avgRoas, avgAcos };
  }, [metrics]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'ROAS MÉDIO', value: totals.avgRoas.toFixed(2), color: totals.avgRoas >= 5 ? 'text-success' : totals.avgRoas >= 2 ? 'text-warning' : 'text-destructive' },
        { label: 'ACOS MÉDIO', value: `${totals.avgAcos.toFixed(1)}%`, color: getAcosColor(totals.avgAcos) },
        { label: 'INVESTIMENTO', value: formatCurrency(totals.totalSpend), color: 'text-foreground' },
        { label: 'VENDAS (GMV)', value: formatCurrency(totals.totalGmv), color: 'text-foreground' },
      ].map(({ label, value, color }) => (
        <div key={label} className="surface-card p-3">
          <p className="section-label mb-1">{label}</p>
          <p className={cn('text-lg font-extrabold font-mono tabular-nums', color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── ROAS Bar ───

function RoasBar({ roas, empate, ideal }: { roas: number; empate: number; ideal: number }) {
  const maxRoas = Math.max(10, roas * 1.3, ideal * 1.5);
  const pos = Math.min((roas / maxRoas) * 100, 100);
  return (
    <div className="w-full">
      <div className="relative w-full h-1.5 rounded-full overflow-hidden">
        <div className="absolute inset-0 rounded-full bg-secondary" />
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pos}%`,
            backgroundColor: roas >= ideal ? 'hsl(var(--success))' : roas >= empate ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
          }}
        />
      </div>
    </div>
  );
}

// ─── Ranking List ───

function RankingList({
  metrics,
  products,
  onUpdateCSV,
}: {
  metrics: (AdMetricDerived & { _productId: string | null })[];
  products: Product[];
  onUpdateCSV: (productId: string) => void;
}) {
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const sorted = useMemo(() => [...metrics].sort((a, b) => b.roas - a.roas), [metrics]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const getTargets = useCallback((m: AdMetricDerived & { _productId: string | null }) => {
    if (!config) return { empate: 2, ideal: 5 };
    const product = m._productId ? products.find(p => p.id === m._productId) : null;
    if (!product || product.salePrice <= 0) return { empate: 2, ideal: 5 };
    const result = calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost, 0, 0);
    if (result.margemInsuficiente || !result.roasEmpate) return { empate: 2, ideal: 5 };
    return { empate: result.roasEmpate, ideal: result.roasIdeal || 5 };
  }, [config, products]);

  return (
    <div className="space-y-2">
      <p className="section-label font-bold">RANKING DE PRODUTOS</p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {sorted.map((m, i) => {
          const isOpen = expandedIdx === i;
          const targets = getTargets(m);
          const statusColor = getRoasColorDynamic(m.roas, targets.empate, targets.ideal);
          const product = m._productId ? products.find(p => p.id === m._productId) : null;
          const displayName = product?.name || m.shopeeProductName || 'Produto sem nome';

          return (
            <div key={i}>
              <button
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold font-mono flex-shrink-0',
                    i < 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  )}>
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{truncate(displayName, 28)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                      {m.avgPosition !== null && <span>📍 #{m.avgPosition}</span>}
                      <span>{formatCurrency(m.spend)} investido</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="section-label">ROAS</p>
                    <p className={cn('text-sm font-bold font-mono tabular-nums', statusColor)}>{m.roas.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="section-label">ACOS</p>
                    <p className={cn('text-sm font-bold font-mono tabular-nums', getAcosColor(m.acos))}>{m.acos.toFixed(1)}%</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-3 animate-fade-in">
                  <div className="h-px bg-border" />
                  <RoasBar roas={m.roas} empate={targets.empate} ideal={targets.ideal} />
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="section-label">GMV</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{formatShort(m.gmv)}</p></div>
                    <div><p className="section-label">CTR</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.ctr.toFixed(2)}%</p></div>
                    <div><p className="section-label">CONV</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.convRate.toFixed(2)}%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="section-label">RETORNO LÍQ.</p><p className={cn('text-[13px] font-bold font-mono tabular-nums', m.liquidReturn >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(m.liquidReturn)}</p></div>
                    <div><p className="section-label">VENDIDOS</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{m.itemsSold} itens</p></div>
                  </div>
                  {m._productId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); onUpdateCSV(m._productId!); }}
                      className="h-8 text-[11px] gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Atualizar CSV
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

function AlertsSection({ metrics, products }: { metrics: (AdMetricDerived & { _productId: string | null })[]; products: Product[] }) {
  const alerts = useMemo(() => {
    const result: Array<{ type: AlertType; metric: AdMetricDerived & { _productId: string | null } }> = [];
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
      <p className="section-label font-bold">ALERTAS</p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {alerts.map((alert, i) => {
          const cfg = alertConfig[alert.type];
          const Icon = cfg.icon;
          const isOpen = expandedIdx === i;
          const product = alert.metric._productId ? products.find(p => p.id === alert.metric._productId) : null;
          const displayName = product?.name || alert.metric.shopeeProductName || 'Produto';
          return (
            <div key={i}>
              <button onClick={() => setExpandedIdx(isOpen ? null : i)} className="w-full h-12 flex items-center gap-3 px-3 text-left hover:bg-secondary/50 transition-colors">
                <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.iconColor)} />
                <span className="text-[13px] font-semibold text-foreground truncate flex-1">{truncate(displayName, 28)}</span>
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

// ─── Empty State ───

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <Megaphone className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2 mt-4">
        <p className="text-[15px] font-bold text-foreground">Nenhum dado de Ads</p>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mx-auto">
          Importe o CSV "Por Produto" da Shopee para começar a analisar seus anúncios
        </p>
      </div>
      <Button onClick={onAdd} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-6">
        <Plus className="w-4 h-4" /> Adicionar produto com ads
      </Button>
    </div>
  );
}

// ─── Main AdsTab ───

export function AdsTab() {
  const { currentStore } = useStore();
  const { allMetrics, loading, reload } = useProductAdsMetrics();
  const [showImportModal, setShowImportModal] = useState(false);
  const [updateProductId, setUpdateProductId] = useState<string | undefined>();

  const products = currentStore?.products || [];

  const handleAddNew = () => {
    setUpdateProductId(undefined);
    setShowImportModal(true);
  };

  const handleUpdateCSV = (productId: string) => {
    setUpdateProductId(productId);
    setShowImportModal(true);
  };

  const handleImportSuccess = () => {
    reload();
    setShowImportModal(false);
    setUpdateProductId(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasData = allMetrics.length > 0;

  const periodLabel = (() => {
    if (allMetrics.length === 0) return '';
    const starts = allMetrics.map(m => m.periodStart).sort();
    const ends = allMetrics.map(m => m.periodEnd).sort();
    const s = starts[0], e = ends[ends.length - 1];
    if (s && e) {
      const fmt = (d: string) => { const [y, mo, dd] = d.split('-'); return `${dd}/${mo}`; };
      return `${fmt(s)} – ${fmt(e)}`;
    }
    return '';
  })();

  return (
    <div className="space-y-4">
      {/* Import Modal */}
      {showImportModal && (
        <ImportAdsModal
          products={products}
          preselectedProductId={updateProductId}
          onClose={() => { setShowImportModal(false); setUpdateProductId(undefined); }}
          onSuccess={handleImportSuccess}
        />
      )}

      {!hasData ? (
        <EmptyState onAdd={handleAddNew} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Desempenho de Ads</p>
              {periodLabel && <span className="text-[11px] text-muted-foreground">· {periodLabel}</span>}
            </div>
            <Button size="sm" variant="default" onClick={handleAddNew} className="h-8 text-xs gap-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>

          {/* Summary */}
          <SummarySection metrics={allMetrics} />

          {/* Desktop 2-column: Ranking (wider) | Alerts */}
          <div className="md:grid md:grid-cols-[3fr_2fr] md:gap-6 space-y-4 md:space-y-0">
            <RankingList
              metrics={allMetrics as any}
              products={products}
              onUpdateCSV={handleUpdateCSV}
            />
            <AlertsSection metrics={allMetrics as any} products={products} />
          </div>
        </>
      )}
    </div>
  );
}
