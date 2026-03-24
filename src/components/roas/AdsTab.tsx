import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Upload, Trash2, Megaphone, MapPin } from 'lucide-react';
import { parseShopeeAdsCSV } from '@/lib/shopeeAdsParser';
import { AdsDetailFullView } from './AdsDetailFullView';
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
  const [positionJustImported, setPositionJustImported] = useState(false);

  const products = currentStore?.products || [];

  const filtered = useMemo(() => {
    let result = data;
    if (filter === 'unlinked') result = data.filter(d => !d.product_id);
    else if (filter === 'ABAIXO_EMPATE') result = data.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    else if (filter !== 'all') result = data.filter(d => d.classificacao === filter);

    // Sort: products with position first, then linked, then unlinked
    return [...result].sort((a, b) => {
      const aPos = a.posicao_media !== null && a.posicao_media > 0 ? 1 : 0;
      const bPos = b.posicao_media !== null && b.posicao_media > 0 ? 1 : 0;
      if (bPos !== aPos) return bPos - aPos;
      const aLinked = a.product_id ? 1 : 0;
      const bLinked = b.product_id ? 1 : 0;
      return bLinked - aLinked;
    });
  }, [data, filter]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    const parsed = parseShopeeAdsCSV(text);
    if (!parsed) { toast.error('CSV inválido ou formato não reconhecido'); if (fileRef.current) fileRef.current.value = ''; return; }

    if (parsed.format === 'product') {
      await importProductCSV(text);
      const hasPosition = parsed.metrics.some(m => m.avgPosition !== null && m.avgPosition > 0);
      if (hasPosition) {
        setPositionJustImported(true);
        setTimeout(() => setPositionJustImported(false), 8000);
      }
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

      {/* ═══ Full-screen detail view ═══ */}
      {selectedDetail ? (
        <AdsDetailFullView
          ad={selectedDetail}
          allAds={filtered}
          onClose={() => setSelectedDetail(null)}
          onNavigate={(ad) => setSelectedDetail(ad)}
          onImportPosition={() => { setPositionTarget(selectedDetail.id); setSelectedDetail(null); positionFileRef.current?.click(); }}
          onLink={() => { setLinkTarget(selectedDetail.id); setSelectedDetail(null); }}
          onQuickRegister={() => { setQuickRegTarget(selectedDetail); setSelectedDetail(null); }}
          onReimport={() => { setPositionTarget(selectedDetail.id); positionFileRef.current?.click(); }}
        />
      ) : data.length === 0 ? (
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

          {/* ═══ Position banner ═══ */}
          {positionJustImported && (
            <div className="rounded-xl border-2 border-success/40 bg-success/10 p-4 flex items-center gap-3 animate-fade-in">
              <MapPin className="w-6 h-6 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-success">📍 Posição na Pesquisa Detectada!</p>
                <p className="text-xs text-text-2 mt-0.5">
                  O Posicionamento Médio foi extraído automaticamente do CSV Por Produto.
                </p>
              </div>
            </div>
          )}

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
