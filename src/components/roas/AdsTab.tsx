import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Upload } from 'lucide-react';
import { AdsDetailView } from './AdsDetailView';
import { AdsLinkModal } from './AdsLinkModal';
import { QuickRegisterModal } from './QuickRegisterModal';
import { toast } from 'sonner';
import { FilterType } from './adsHelpers';
import { SummaryCards } from './SummaryCards';
import { FilterChips } from './FilterChips';
import { AdsProductCard } from './AdsProductCard';
import { AlertsSection } from './AlertsSection';
import { AdsEmptyState } from './AdsEmptyState';

export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, importGeneralCSV, importProductCSV, linkProduct, reload } = useAdsData();
  const [selectedDetail, setSelectedDetail] = useState<EnrichedAdsData | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [quickRegTarget, setQuickRegTarget] = useState<EnrichedAdsData | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);

  const products = currentStore?.products || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    if (filter === 'unlinked') return data.filter(d => !d.product_id);
    if (filter === 'ABAIXO_EMPATE') return data.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    return data.filter(d => d.classificacao === filter);
  }, [data, filter]);

  // Auto-detect CSV type
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();

    // Check first 10 lines for product-specific metadata
    const lines = text.split('\n').slice(0, 15).map(l => l.toLowerCase());
    const hasProductMeta = lines.some(l =>
      l.includes('id do produto') ||
      l.includes('nome do produto') ||
      l.includes('consulta de pesquisa')
    );
    const hasPositionHeaders = lines.some(l =>
      l.includes('palavra-chave/localização') ||
      l.includes('posicionamento médio') ||
      l.includes('posicionamento medio')
    );

    if (hasProductMeta || hasPositionHeaders) {
      await importProductCSV(text);
    } else {
      await importGeneralCSV(text);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePositionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importProductCSV(text, positionTarget);
    setPositionTarget(undefined);
    if (positionFileRef.current) positionFileRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
      <input ref={positionFileRef} type="file" accept=".csv" onChange={handlePositionFile} className="hidden" />

      {data.length === 0 ? (
        <AdsEmptyState onImport={() => fileRef.current?.click()} />
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0">
          <div className="lg:col-span-8 space-y-5">
            <SummaryCards data={data} />
            <FilterChips filter={filter} setFilter={setFilter} data={data} />

            {/* Compact import button */}
            <div
              className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-4 md:p-3 text-center cursor-pointer flex items-center gap-3 md:gap-2 justify-center"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-6 h-6 md:w-5 md:h-5 text-text-3 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm md:text-xs font-bold text-foreground">Importar CSV da Shopee</p>
                <p className="text-xs md:text-[10px] text-text-3 mt-0.5">
                  Aceita relatório geral ou individual (por produto)
                </p>
              </div>
            </div>

            {/* Cards grid */}
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {filtered.map(ad => (
                <AdsProductCard
                  key={ad.id}
                  ad={ad}
                  onClick={() => setSelectedDetail(ad)}
                  onLink={() => setLinkTarget(ad.id)}
                  onQuickRegister={() => setQuickRegTarget(ad)}
                  onUpdatePosition={() => { setPositionTarget(ad.id); positionFileRef.current?.click(); }}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-text-2 py-6 md:col-span-2">Nenhum produto neste filtro</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-6">
              <AlertsSection data={data} />
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <AdsDetailView
          ad={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onImportPosition={() => { setPositionTarget(selectedDetail.id); setSelectedDetail(null); positionFileRef.current?.click(); }}
          onLink={() => { setLinkTarget(selectedDetail.id); setSelectedDetail(null); }}
        />
      )}

      {/* Link Modal */}
      {linkTarget && (
        <AdsLinkModal
          products={products}
          onClose={() => setLinkTarget(null)}
          onLink={(productId) => { linkProduct(linkTarget, productId); setLinkTarget(null); }}
        />
      )}

      {/* Quick Register Modal */}
      {quickRegTarget && (
        <QuickRegisterModal
          adData={quickRegTarget}
          onClose={() => setQuickRegTarget(null)}
          onRegistered={(productId) => {
            linkProduct(quickRegTarget.id, productId);
            setQuickRegTarget(null);
          }}
        />
      )}
    </div>
  );
}
