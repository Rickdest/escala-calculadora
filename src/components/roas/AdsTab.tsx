import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Upload, Trash2, Megaphone, MapPin, Calendar } from 'lucide-react';
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

// Sort priority map: lower = appears first
const classOrder: Record<string, number> = {
  'PREJUIZO': 0,
  'ABAIXO_EMPATE': 1,
  'MARGEM_APERTADA': 2,
  'LUCRATIVO': 3,
};

function formatPeriodLabel(inicio: string, fim: string) {
  const f = (d: string) => { const p = d.split('-'); return `${p[2]}/${p[1]}`; };
  return `${f(inicio)} – ${f(fim)}`;
}

export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, importGeneralCSV, importProductCSV, linkProduct, reload, deleteAdsData, deleteAll } = useAdsData();
  const [selectedDetail, setSelectedDetail] = useState<EnrichedAdsData | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [quickRegTarget, setQuickRegTarget] = useState<EnrichedAdsData | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);
  const [positionJustImported, setPositionJustImported] = useState(false);

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
    const targetId = positionTarget;
    await importProductCSV(text, targetId);
    setPositionTarget(undefined);
    if (positionFileRef.current) positionFileRef.current.value = '';
    if (selectedDetail && targetId) {
      await reload();
    }
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
              <span className="text-sm font-bold text-foreground">{periodFiltered.length} anúncio{periodFiltered.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-text-3 hidden md:inline">· {filtered.length} visíveis</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Period selector */}
              {periods.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2">
                  <Calendar className="w-3.5 h-3.5 text-text-3 flex-shrink-0" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="bg-transparent text-xs font-medium border-none outline-none text-foreground cursor-pointer"
                  >
                    {periods.length > 1 && <option value="all">Todos os períodos</option>}
                    {periods.map(p => (
                      <option key={`${p.inicio}|${p.fim}`} value={`${p.inicio}|${p.fim}`}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 text-xs font-bold"
              >
                <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Importar CSV</span>
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

          {/* ═══ Summary ═══ */}
          <SummaryCards data={periodFiltered} />

          {/* ═══ Alerts (collapsible banner) ═══ */}
          <AlertsSection data={periodFiltered} />

          {/* ═══ Filters ═══ */}
          <FilterChips filter={filter} setFilter={setFilter} data={periodFiltered} />

          {/* ═══ Product list (single column) ═══ */}
          <div className="space-y-3">
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
