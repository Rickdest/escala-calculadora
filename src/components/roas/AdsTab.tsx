import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  Plus, RefreshCw, MapPin, Megaphone, Package, Upload,
  TrendingUp, TrendingDown, AlertTriangle, Zap, Crown, SkullIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { Product } from '@/types/store';
import { useProductAdsMetrics } from '@/hooks/useProductAdsMetrics';
import { ImportAdsModal } from './ImportAdsModal';
import { ProductAdsDetail } from './ProductAdsDetail';
import { calcProductRoas } from '@/lib/roasUtils';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getRoasColor(roas: number) {
  if (roas >= 5) return 'text-success';
  if (roas >= 2) return 'text-warning';
  return 'text-destructive';
}

function getRoasBg(roas: number) {
  if (roas >= 5) return 'bg-success/15 border-success/30';
  if (roas >= 2) return 'bg-warning/15 border-warning/30';
  return 'bg-destructive/15 border-destructive/30';
}

function getAcosColor(acos: number) {
  return acos <= 20 ? 'text-success' : acos <= 40 ? 'text-warning' : 'text-destructive';
}

type MetricWithMeta = AdMetricDerived & { _productId: string | null; _id: string };

// ─── Summary Cards ───

function SummarySection({ metrics }: { metrics: AdMetricDerived[] }) {
  const totals = useMemo(() => {
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const totalGmv = metrics.reduce((s, m) => s + m.gmv, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgAcos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    return { totalSpend, totalGmv, avgRoas, avgAcos };
  }, [metrics]);

  const cards = [
    { label: 'ROAS Médio', value: totals.avgRoas.toFixed(2), color: getRoasColor(totals.avgRoas) },
    { label: 'ACOS Médio', value: `${totals.avgAcos.toFixed(1)}%`, color: getAcosColor(totals.avgAcos) },
    { label: 'Investimento', value: formatCurrency(totals.totalSpend), color: 'text-foreground' },
    { label: 'GMV Total', value: formatCurrency(totals.totalGmv), color: 'text-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{label}</p>
          <p className={cn('text-xl font-extrabold font-mono tabular-nums', color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Top / Worst Performers ───

function PerformersSection({ metrics, products }: { metrics: MetricWithMeta[]; products: Product[] }) {
  if (metrics.length < 2) return null;

  const sorted = [...metrics].sort((a, b) => b.roas - a.roas);
  const top = sorted.slice(0, 3);
  const worst = sorted.slice(-3).reverse();

  const getName = (m: MetricWithMeta) => {
    const p = m._productId ? products.find(pr => pr.id === m._productId) : undefined;
    return p?.name || m.shopeeProductName || 'Produto';
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-success/20 bg-success/5 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-success flex items-center gap-1">
          <Crown className="w-3 h-3" /> Top Performers
        </p>
        {top.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="truncate flex-1 text-foreground font-medium">{getName(m)}</span>
            <span className={cn('font-bold font-mono tabular-nums ml-2', getRoasColor(m.roas))}>{m.roas.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-destructive flex items-center gap-1">
          <TrendingDown className="w-3 h-3" /> Pior Performance
        </p>
        {worst.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="truncate flex-1 text-foreground font-medium">{getName(m)}</span>
            <span className={cn('font-bold font-mono tabular-nums ml-2', getRoasColor(m.roas))}>{m.roas.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alerts Section ───

function AlertsSection({ metrics, products, config }: { metrics: MetricWithMeta[]; products: Product[]; config: any }) {
  const alerts = useMemo(() => {
    const result: Array<{ product: string; type: 'pause' | 'scale' | 'optimize'; message: string }> = [];

    for (const m of metrics) {
      const p = m._productId ? products.find(pr => pr.id === m._productId) : undefined;
      const name = p?.name || m.shopeeProductName || 'Produto';

      // Check against break-even if product exists
      if (p && config) {
        const roas = calcProductRoas(p, config);
        if (!roas.margemInsuficiente && roas.roasEmpate) {
          if (m.roas < roas.roasEmpate) {
            result.push({ product: name, type: 'pause', message: `ROAS ${m.roas.toFixed(2)} abaixo do empate (${roas.roasEmpate.toFixed(2)}). Pausar anúncio.` });
            continue;
          }
          if (m.roas >= (roas.roasIdeal || roas.roasEmpate * 2.5)) {
            result.push({ product: name, type: 'scale', message: `ROAS ${m.roas.toFixed(2)} acima do ideal. Escalar investimento.` });
            continue;
          }
        }
      }

      // Fallback thresholds
      if (m.roas < 2) {
        result.push({ product: name, type: 'pause', message: `ROAS ${m.roas.toFixed(2)} — considere pausar.` });
      } else if (m.roas >= 5) {
        result.push({ product: name, type: 'scale', message: `ROAS ${m.roas.toFixed(2)} — escale o investimento!` });
      }

      if (m.ctr < 1) {
        result.push({ product: name, type: 'optimize', message: `CTR ${m.ctr.toFixed(2)}% muito baixo. Otimize o anúncio.` });
      }
    }

    return result;
  }, [metrics, products, config]);

  if (alerts.length === 0) return null;

  const icons = { pause: AlertTriangle, scale: TrendingUp, optimize: Zap };
  const colors = {
    pause: 'border-destructive/20 bg-destructive/5 text-destructive',
    scale: 'border-success/20 bg-success/5 text-success',
    optimize: 'border-warning/20 bg-warning/5 text-warning',
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" /> Alertas
      </p>
      <div className="space-y-1.5">
        {alerts.slice(0, 6).map((a, i) => {
          const Icon = icons[a.type];
          return (
            <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg border', colors[a.type])}>
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{a.product}</p>
                <p className="text-[11px] text-muted-foreground">{a.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Product Ads Card ───

function ProductAdsCard({
  metric, product, onUpdateCSV, onClick,
}: {
  metric: MetricWithMeta;
  product: Product | undefined;
  onUpdateCSV: (productId: string) => void;
  onClick: () => void;
}) {
  const displayName = product?.name || metric.shopeeProductName || 'Produto';

  const periodLabel = (() => {
    const f = (d: string) => { const [, m, dd] = d.split('-'); return `${dd}/${m}`; };
    return `${f(metric.periodStart)} – ${f(metric.periodEnd)}`;
  })();

  // Performance badge
  const perfColor = metric.roas >= 5 ? 'text-success' : metric.roas >= 2 ? 'text-warning' : 'text-destructive';
  const perfLabel = metric.roas >= 5 ? 'Lucrativo' : metric.roas >= 2 ? 'Margem baixa' : 'Prejuízo';
  const PerfIcon = metric.roas >= 5 ? TrendingUp : metric.roas >= 2 ? AlertTriangle : TrendingDown;

  return (
    <div
      className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt={displayName} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            'px-2 py-1 rounded-lg text-xs font-bold font-mono tabular-nums border',
            getRoasBg(metric.roas), getRoasColor(metric.roas)
          )}>
            ROAS {metric.roas.toFixed(2)}
          </span>
          {metric.avgPosition !== null && (
            <span className="flex items-center gap-0.5 text-xs font-bold font-mono tabular-nums text-muted-foreground">
              <MapPin className="w-3 h-3 text-destructive" />
              #{metric.avgPosition}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">{metric.itemsSold} vendidos</span>
        <span>·</span>
        <span className="font-mono tabular-nums">CTR {metric.ctr.toFixed(2)}%</span>
        <span>·</span>
        <span className={cn('font-mono tabular-nums font-semibold', getAcosColor(metric.acos))}>
          ACOS {metric.acos.toFixed(1)}%
        </span>
        <span>·</span>
        <span className={cn('font-semibold flex items-center gap-0.5', perfColor)}>
          <PerfIcon className="w-3 h-3" /> {perfLabel}
        </span>
      </div>

      {/* Update CSV */}
      {metric._productId && (
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateCSV(metric._productId!); }}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar relatório
        </button>
      )}
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
          Importe o relatório de anúncios da Shopee para começar a analisar a performance dos seus produtos
        </p>
      </div>
      <Button onClick={onAdd} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-6">
        <Upload className="w-4 h-4" /> Importar relatório de anúncios
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
  const [detailMetric, setDetailMetric] = useState<MetricWithMeta | null>(null);

  const products = currentStore?.products || [];
  const config = currentStore?.config;

  const sortedMetrics = useMemo(
    () => [...allMetrics].sort((a, b) => b.roas - a.roas),
    [allMetrics]
  );

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

  const hasData = sortedMetrics.length > 0;

  return (
    <div className="space-y-5">
      {/* Import Modal */}
      {showImportModal && (
        <ImportAdsModal
          products={products}
          preselectedProductId={updateProductId}
          onClose={() => { setShowImportModal(false); setUpdateProductId(undefined); }}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Detail Modal */}
      {detailMetric && (
        <ProductAdsDetail
          metric={detailMetric}
          product={detailMetric._productId ? products.find(p => p.id === detailMetric._productId) : undefined}
          onClose={() => setDetailMetric(null)}
        />
      )}

      {!hasData ? (
        <EmptyState onAdd={handleAddNew} />
      ) : (
        <div className="md:grid md:grid-cols-12 md:gap-6 space-y-5 md:space-y-0">
          {/* Left Panel — Main content */}
          <div className="md:col-span-8 space-y-5">
            {/* Summary 2x2 */}
            <SummarySection metrics={allMetrics} />

            {/* Top / Worst Performers */}
            <PerformersSection metrics={sortedMetrics as MetricWithMeta[]} products={products} />

            {/* Import Button */}
            <Button onClick={handleAddNew} className="w-full h-12 rounded-xl text-sm font-bold gap-2">
              <Upload className="w-4 h-4" /> Importar relatório de anúncios
            </Button>

            {/* Product List */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">Ranking de Produtos com Ads</p>
              {sortedMetrics.map((m, i) => {
                const metric = m as MetricWithMeta;
                const product = metric._productId
                  ? products.find(p => p.id === metric._productId)
                  : undefined;
                return (
                  <ProductAdsCard
                    key={i}
                    metric={metric}
                    product={product}
                    onUpdateCSV={handleUpdateCSV}
                    onClick={() => setDetailMetric(metric)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Panel — Alerts */}
          <div className="md:col-span-4 space-y-4">
            <AlertsSection metrics={sortedMetrics as MetricWithMeta[]} products={products} config={config} />
          </div>
        </div>
      )}
    </div>
  );
}
