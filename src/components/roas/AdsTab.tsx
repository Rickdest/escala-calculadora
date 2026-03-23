import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, ClipboardList, Search } from 'lucide-react';
import { AdsDetailView } from './AdsDetailView';
import { AdsLinkModal } from './AdsLinkModal';
import { toast } from 'sonner';
import { FilterType } from './adsHelpers';
import { SummaryCards } from './SummaryCards';
import { FilterChips } from './FilterChips';
import { AdsProductCard } from './AdsProductCard';
import { AlertsSection } from './AlertsSection';
import { AdsEmptyState } from './AdsEmptyState';
import { ByProductContent } from './ByProductContent';

export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, importGeneralCSV, importProductCSV, linkProduct, reload } = useAdsData();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedDetail, setSelectedDetail] = useState<EnrichedAdsData | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const generalFileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);

  const products = currentStore?.products || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    if (filter === 'unlinked') return data.filter(d => !d.product_id);
    if (filter === 'ABAIXO_EMPATE') return data.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    return data.filter(d => d.classificacao === filter);
  }, [data, filter]);

  const handleGeneralFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    await importGeneralCSV(text);
    if (generalFileRef.current) generalFileRef.current.value = '';
  };

  const handleProductFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    await importProductCSV(text);
    if (productFileRef.current) productFileRef.current.value = '';
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
      <input ref={generalFileRef} type="file" accept=".csv" onChange={handleGeneralFile} className="hidden" />
      <input ref={productFileRef} type="file" accept=".csv" onChange={handleProductFile} className="hidden" />
      <input ref={positionFileRef} type="file" accept=".csv" onChange={handlePositionFile} className="hidden" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl bg-card border border-border p-1">
          <TabsTrigger value="overview" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="w-3.5 h-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="byProduct" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="w-3.5 h-3.5" /> Por Produto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-6 animate-fade-in">
          {data.length === 0 ? (
            <AdsEmptyState onImport={() => generalFileRef.current?.click()} />
          ) : (
            <div className="md:grid md:grid-cols-12 md:gap-6 space-y-6 md:space-y-0">
              <div className="md:col-span-8 space-y-6">
                <SummaryCards data={data} />
                <FilterChips filter={filter} setFilter={setFilter} data={data} />

                <Button
                  onClick={() => generalFileRef.current?.click()}
                  variant="outline"
                  className="w-full h-11 rounded-xl text-sm font-bold gap-2 border-dashed"
                >
                  <Upload className="w-4 h-4" /> Importar relatório de anúncios
                </Button>

                <div className="space-y-3">
                  {filtered.map(ad => (
                    <AdsProductCard
                      key={ad.id}
                      ad={ad}
                      onClick={() => setSelectedDetail(ad)}
                      onLink={() => setLinkTarget(ad.id)}
                      onUpdatePosition={() => { setPositionTarget(ad.id); positionFileRef.current?.click(); }}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-text-2 py-6">Nenhum produto neste filtro</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-4 space-y-6">
                <AlertsSection data={data} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="byProduct" className="mt-5 animate-fade-in">
          <ByProductContent
            data={data}
            onImport={() => productFileRef.current?.click()}
            onDetail={setSelectedDetail}
          />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
