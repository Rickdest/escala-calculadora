import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Upload, Trash2, Megaphone } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, importGeneralCSV, importProductCSV, linkProduct, reload, deleteAdsData, deleteAll } = useAdsData();
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    const lines = text.split('\n').slice(0, 15).map(l => l.toLowerCase());
    const hasProductMeta = lines.some(l =>
      l.includes('id do produto') || l.includes('nome do produto') || l.includes('consulta de pesquisa')
    );
    const hasPositionHeaders = lines.some(l =>
      l.includes('palavra-chave/localização') || l.includes('posicionamento médio') || l.includes('posicionamento medio')
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
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
      <input ref={positionFileRef} type="file" accept=".csv" onChange={handlePositionFile} className="hidden" />

      {data.length === 0 ? (
        <AdsEmptyState onImport={() => fileRef.current?.click()} />
      ) : (
        <>
          {/* ═══ Toolbar ═══ */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm font-bold text-foreground">{data.length} anúncio{data.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-text-3 hidden md:inline">· {filtered.length} visíveis</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 text-xs font-bold"
              >
                <Upload className="w-3.5 h-3.5" /> Importar CSV
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs">
                    <Trash2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Excluir Tudo</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir todos os dados de Ads?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso removerá permanentemente todos os dados importados de anúncios. Você precisará importar novamente o CSV.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir Tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* ═══ Summary + Filters ═══ */}
          <SummaryCards data={data} />
          <FilterChips filter={filter} setFilter={setFilter} data={data} />

          {/* ═══ Main content ═══ */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">
            {/* Cards */}
            <div className="lg:col-span-9">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {filtered.map(ad => (
                  <AdsProductCard
                    key={ad.id}
                    ad={ad}
                    onClick={() => setSelectedDetail(ad)}
                    onLink={() => setLinkTarget(ad.id)}
                    onQuickRegister={() => setQuickRegTarget(ad)}
                    onUpdatePosition={() => { setPositionTarget(ad.id); positionFileRef.current?.click(); }}
                    onDelete={() => deleteAdsData(ad.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-text-2 py-6 md:col-span-2 xl:col-span-3">Nenhum produto neste filtro</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-3 mt-6 lg:mt-0">
              <div className="lg:sticky lg:top-4 space-y-6">
                <AlertsSection data={data} />
              </div>
            </div>
          </div>
        </>
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
