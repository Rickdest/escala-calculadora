import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { FEATURES } from '@/config/features';
import { Upload, Trash2, MapPin, Calendar, ShoppingBag, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseShopeeAdsCSV, validateCSVSecurity } from '@/lib/shopeeAdsParser';
import { AdsDetailFullView } from './AdsDetailFullView';
import { AdsLinkModal } from './AdsLinkModal';
import { QuickRegisterModal } from './QuickRegisterModal';
import { ShopeeIntegrationModal } from './ShopeeIntegrationModal';
import { AdsEmptyState } from './AdsEmptyState';
import { toast } from 'sonner';
import { FilterType } from './adsHelpers';
import { cn } from '@/lib/utils';
import { SummaryCards } from './SummaryCards';
import { FilterChips } from './FilterChips';
import { AdsProductCard } from './AdsProductCard';
import { AlertsSection } from './AlertsSection';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Sort priority map: lower = appears first
const classOrder: Record<string, number> = {
  'PREJUIZO': 0,
  'ABAIXO_EMPATE': 1,
  'MARGEM_APERTADA': 2,
  'LUCRATIVO': 3,
};

function formatPeriodLabel(inicio: string, fim: string) {
  const fShort = (d: string) => { const p = d.split('-'); return `${p[2]}/${p[1]}`; };
  const fFull = (d: string) => { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
  return `${fShort(inicio)} – ${fFull(fim)}`;
}

function AdsHeader({ periodLabel, onImportCSV, onImportAds, syncing }: { periodLabel: string; onImportCSV: () => void; onImportAds: () => void; syncing?: boolean }) {
  const { isConnected, token } = useShopeeToken();

  const syncAgo = token?.updated_at
    ? formatDistanceToNow(new Date(token.updated_at), { addSuffix: false, locale: ptBR })
    : null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <p className="text-sm font-bold text-foreground">Análise de Ads</p>
        {periodLabel && (
          <p className="text-[11px] text-muted-foreground font-mono">{periodLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {isConnected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-600">
              Shopee conectada{syncAgo ? ` · sync há ${syncAgo}` : ''}
            </span>
          </div>
        )}
        <button
          onClick={onImportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-[12px] font-semibold text-foreground transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Atualizar CSV
        </button>
        {isConnected && (
          <button
            onClick={onImportAds}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EE4D2D]/30 bg-[#EE4D2D]/5 text-[#EE4D2D] hover:bg-[#EE4D2D]/10 text-[12px] font-semibold transition-colors disabled:opacity-50"
          >
            <Download className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? 'Importando...' : 'Importar Ads'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ Main AdsTab ═══ */
export function AdsTab({ onDetailOpen }: { onDetailOpen?: (open: boolean) => void }) {
  const { currentStore } = useStore();
  const { data, loading, operating, importGeneralCSV, importProductCSV, importFromApi, linkProduct, unlinkProduct, reload, deleteAdsData, deleteAll } = useAdsData();
  const { isConnected, syncAds } = useShopeeToken();
  const [selectedDetail, setSelectedDetailRaw] = useState<EnrichedAdsData | null>(null);
  const setSelectedDetail = (ad: EnrichedAdsData | null) => {
    setSelectedDetailRaw(ad);
    onDetailOpen?.(!!ad);
  };
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [quickRegTarget, setQuickRegTarget] = useState<EnrichedAdsData | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);
  const [positionJustImported, setPositionJustImported] = useState(false);
  const [showShopeeModal, setShowShopeeModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleShopeeSync = async () => {
    if (!isConnected) {
      setShowShopeeModal(true);
      return;
    }
    setSyncing(true);
    try {
      const result = await syncAds();
      const adsPerfData = result?.results?.ads_performance;
      if (adsPerfData?.ads_rate_limited && (adsPerfData?.ads_by_product?.length || 0) === 0) {
        toast.warning('API de Ads temporariamente limitada pela Shopee. Tente novamente em 2-3 minutos.');
      } else if (adsPerfData?.ads_by_product?.length > 0) {
        if (adsPerfData.ads_rate_limited) {
          toast.warning('Alguns dados podem estar incompletos (limite temporário da API). Dados parciais foram importados.');
        }
        await importFromApi(adsPerfData);
      } else {
        toast.info('Sincronização concluída, mas sem dados de Ads disponíveis.');
      }
    } catch {
      // Error already shown by syncAds
    } finally {
      setSyncing(false);
    }
  };

  const products = currentStore?.products || [];

  // Extract unique periods
  const periods = useMemo(() => {
    const map = new Map<string, { inicio: string; fim: string; label: string }>();
    data.forEach(d => {
      if (d.periodo_inicio && d.periodo_fim) {
        const key = `${d.periodo_inicio}|${d.periodo_fim}`;
        if (!map.has(key)) {
          map.set(key, {
            inicio: d.periodo_inicio,
            fim: d.periodo_fim,
            label: formatPeriodLabel(d.periodo_inicio, d.periodo_fim),
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.inicio.localeCompare(a.inicio));
  }, [data]);

  // Current period label
  const periodLabel = useMemo(() => {
    if (periods.length === 0) return '';
    if (selectedPeriod === 'all' && periods.length === 1) return periods[0].label;
    if (selectedPeriod !== 'all') {
      const found = periods.find(p => `${p.inicio}|${p.fim}` === selectedPeriod);
      return found?.label || '';
    }
    return '';
  }, [periods, selectedPeriod]);

  // Filter by period first, then by classification
  const periodFiltered = useMemo(() => {
    if (selectedPeriod === 'all') return data;
    const [inicio, fim] = selectedPeriod.split('|');
    return data.filter(d => d.periodo_inicio === inicio && d.periodo_fim === fim);
  }, [data, selectedPeriod]);

  const filtered = useMemo(() => {
    let result = periodFiltered;
    if (filter === 'unlinked') result = periodFiltered.filter(d => !d.product_id);
    else if (filter === 'ABAIXO_EMPATE') result = periodFiltered.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    else if (filter !== 'all') result = periodFiltered.filter(d => d.classificacao === filter);

    return [...result].sort((a, b) => {
      const aLinked = a.product_id ? 1 : 0;
      const bLinked = b.product_id ? 1 : 0;
      if (aLinked !== bLinked) return bLinked - aLinked;
      if (aLinked && bLinked) {
        const aOrder = classOrder[a.classificacao || ''] ?? 5;
        const bOrder = classOrder[b.classificacao || ''] ?? 5;
        return aOrder - bOrder;
      }
      return 0;
    });
  }, [periodFiltered, filter]);

  const hasData = data.length > 0;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const validation = validateCSVSecurity(file, text);
    if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); if (fileRef.current) fileRef.current.value = ''; return; }
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
    const targetId = positionTarget;
    await importProductCSV(text, targetId);
    setPositionTarget(undefined);
    if (positionFileRef.current) positionFileRef.current.value = '';
    if (selectedDetail && targetId) {
      await reload();
    }
  };


  if (loading && data.length === 0) {
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
          onUnlink={() => { unlinkProduct(selectedDetail.id); setSelectedDetail(null); }}
          onChangeLink={() => { setLinkTarget(selectedDetail.id); }}
        />
      ) : (
        <>
           {/* ═══ Empty State ═══ */}
           {!hasData && (
             <AdsEmptyState
               onImport={() => fileRef.current?.click()}
               onShopeeIntegration={() => setShowShopeeModal(true)}
             />
           )}

          {/* ═══ Header com botão discreto ═══ */}
          {hasData && (
             <AdsHeader
               periodLabel={periodLabel}
               onImportCSV={() => fileRef.current?.click()}
               onShopeeSync={handleShopeeSync}
               syncing={syncing}
             />
          )}

          {hasData && (
            <>
              {/* ═══ Period chips ═══ */}
              {periods.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <Calendar className="w-4 h-4 text-text-3 flex-shrink-0" />
                  <span className="text-xs font-medium text-text-3 flex-shrink-0">Período</span>
                  {periods.length > 1 && (
                    <button
                      onClick={() => setSelectedPeriod('all')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                        selectedPeriod === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-surface-2 text-text-3 hover:text-foreground'
                      )}
                    >
                      Todos
                    </button>
                  )}
                  {periods.map(p => {
                    const key = `${p.inicio}|${p.fim}`;
                    const isActive = selectedPeriod === key || (periods.length === 1 && selectedPeriod === 'all');
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedPeriod(key)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-surface-2 text-text-3 hover:text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}

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

              {/* ═══ Summary ═══ */}
              <SummaryCards data={periodFiltered} />

              {/* ═══ Alerts (collapsible banner) ═══ */}
              <AlertsSection data={periodFiltered} />


              {/* ═══ Filters ═══ */}
              <FilterChips filter={filter} setFilter={setFilter} data={periodFiltered} />

              {/* ═══ Product list ═══ */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">Anúncios</h2>
                <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  <p className="text-center text-sm text-text-2 py-6">Nenhum produto neste filtro</p>
                )}
              </div>
            </>
          )}
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

      {/* Shopee Integration Modal */}
      <ShopeeIntegrationModal open={showShopeeModal} onClose={() => setShowShopeeModal(false)} />
    </div>
  );
}
