import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  Plus, RefreshCw, MapPin, Megaphone, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { Product } from '@/types/store';
import { useProductAdsMetrics } from '@/hooks/useProductAdsMetrics';
import { ImportAdsModal } from './ImportAdsModal';

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
    { label: 'ACOS Médio', value: `${totals.avgAcos.toFixed(2)}%`, color: getAcosColor(totals.avgAcos) },
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

// ─── Product Ads Card ───

function ProductAdsCard({
  metric,
  product,
  onUpdateCSV,
}: {
  metric: AdMetricDerived & { _productId: string | null };
  product: Product | undefined;
  onUpdateCSV: (productId: string) => void;
}) {
  const displayName = product?.name || metric.shopeeProductName || 'Produto';

  const periodLabel = (() => {
    const fmt = (d: string) => {
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}`;
    };
    return `${fmt(metric.periodStart)} – ${fmt(metric.periodEnd)}`;
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
      {/* Top row: image + name + ROAS badge + position */}
      <div className="flex items-start gap-3">
        {/* Product image */}
        <div className="flex-shrink-0">
          {product?.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={displayName}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Name + period */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel}</p>
        </div>

        {/* ROAS badge + Position */}
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
      </div>

      {/* Update CSV */}
      {metric._productId && (
        <button
          onClick={() => onUpdateCSV(metric._productId!)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar CSV
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

      {!hasData ? (
        <EmptyState onAdd={handleAddNew} />
      ) : (
        <>
          {/* Summary 2x2 */}
          <SummarySection metrics={allMetrics} />

          {/* Product List */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">Seus Produtos com Ads</p>
            {sortedMetrics.map((m, i) => {
              const product = (m as any)._productId
                ? products.find(p => p.id === (m as any)._productId)
                : undefined;
              return (
                <ProductAdsCard
                  key={i}
                  metric={m as any}
                  product={product}
                  onUpdateCSV={handleUpdateCSV}
                />
              );
            })}
          </div>

          {/* Add button */}
          <Button
            onClick={handleAddNew}
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 border-dashed"
          >
            <Plus className="w-4 h-4" /> Adicionar produto com ads
          </Button>
        </>
      )}
    </div>
  );
}
