import { useState, useMemo, useRef, useEffect } from 'react';
import { ApiAdsDashboard } from './ApiAdsDashboard';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { useApiAdsData, buildApiAdsDataFromRows } from '@/hooks/useApiAdsData';
import { Upload, Trash2, MapPin, Calendar, ShoppingBag, CheckCircle2, Download } from 'lucide-react';
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
  const { isConnected, syncAdsOnly } = useShopeeToken();
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

  const [apiAdsData, setApiAdsData] = useState<any>(null);
  const [apiCampaignList, setApiCampaignList] = useState<any[]>([]);

  // Load persisted data from database as fallback
  const { data: persistedRows, invalidate: invalidatePersistedAds } = useApiAdsData();
  const persistedApiData = useMemo(() => buildApiAdsDataFromRows(persistedRows || []), [persistedRows]);

  // Use in-memory data if available, otherwise fall back to persisted DB data
  const effectiveApiData = apiAdsData || persistedApiData;

  // Convert API campaign to EnrichedAdsData for detail view
  const campaignToEnrichedAds = (campaign: any): EnrichedAdsData => {
    const now = new Date().toISOString();
    return {
      id: `api-campaign-${campaign.campaign_id}`,
      user_id: '',
      product_id: null,
      nome_produto_csv: campaign.item_name || `Campanha #${campaign.campaign_id}`,
      shopee_product_id: campaign.item_id ? String(campaign.item_id) : null,
      impressoes: campaign.impressions || 0,
      cliques: campaign.clicks || 0,
      ctr: campaign.ctr || 0,
      conversoes: campaign.orders || 0,
      taxa_conversao: campaign.clicks > 0 ? (campaign.orders / campaign.clicks) * 100 : 0,
      itens_vendidos: campaign.orders || 0,
      gmv: campaign.gmv || 0,
      despesas: campaign.expense || 0,
      roas: campaign.roas || 0,
      acos: campaign.acos || 0,
      roas_direto: campaign.direct_roas || 0,
      acos_direto: campaign.expense > 0 && campaign.direct_gmv > 0 ? (campaign.expense / campaign.direct_gmv) * 100 : 0,
      gmv_direto: campaign.direct_gmv || 0,
      custo_por_conversao: campaign.cost_per_order || 0,
      itens_vendidos_diretos: campaign.direct_orders || 0,
      conversoes_diretas: campaign.direct_orders || 0,
      metodo_lance: null,
      status_anuncio: campaign.status === 'active' ? 'Ativo' : campaign.status === 'paused' ? 'Pausado' : 'Encerrado',
      impressoes_produto: null,
      cliques_produto: null,
      posicao_media: campaign.avg_position,
      posicao_importada: false,
      roas_empate: null,
      margem_contribuicao: null,
      classificacao: null,
      periodo_inicio: effectiveApiData?.period_start || '',
      periodo_fim: effectiveApiData?.period_end || '',
      importado_em: now,
      created_at: now,
    };
  };

  const handleCampaignSelect = (campaign: any) => {
    const enriched = campaignToEnrichedAds(campaign);
    setSelectedDetail(enriched);
  };

  const handleRefreshProduct = async (itemId: number) => {
    try {
      toast.info('Atualizando dados do produto...');
      const result = await syncAdsOnly(itemId);
      const adsPerfData = result?.results?.ads_performance;
      if (adsPerfData && adsPerfData.ads_by_campaign?.length > 0) {
        // Only merge the specific campaigns — never overwrite summary/daily_entries
        setApiAdsData((prev: any) => {
          const base = prev || effectiveApiData;
          if (!base) return adsPerfData;
          const updatedCampaigns = [...(base.ads_by_campaign || [])];
          for (const newC of adsPerfData.ads_by_campaign) {
            const idx = updatedCampaigns.findIndex((c: any) => c.campaign_id === newC.campaign_id);
            if (idx >= 0) updatedCampaigns[idx] = newC;
            else updatedCampaigns.push(newC);
          }
          return { ...base, ads_by_campaign: updatedCampaigns };
        });
        // Update detail view with refreshed campaign data
        const updatedCampaign = adsPerfData.ads_by_campaign.find(
          (c: any) => String(c.item_id) === String(itemId)
        );
        if (updatedCampaign) {
          setSelectedDetail(campaignToEnrichedAds(updatedCampaign));
        }
        invalidatePersistedAds();
        toast.success('Produto atualizado!');
      } else {
        // Even if no new data from API, invalidate cache to reload persisted data
        invalidatePersistedAds();
        toast.info('Dados atualizados do banco. Nenhuma métrica nova da API.');
      }
    } catch {
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleImportAds = async () => {
    if (!isConnected) {
      setShowShopeeModal(true);
      return;
    }
    setSyncing(true);
    try {
      const result = await syncAdsOnly();
      const adsPerfData = result?.results?.ads_performance;
      if (adsPerfData?.ads_rate_limited && !adsPerfData?.summary?.total_impressions) {
        toast.warning('API de Ads temporariamente limitada pela Shopee. Tente novamente em 2-3 minutos.');
      } else if (adsPerfData?.perf_api_error) {
        toast.error(`Erro da API Shopee: ${adsPerfData.perf_api_message || adsPerfData.perf_api_error}`);
    } else if (adsPerfData?.summary?.total_impressions > 0 || (adsPerfData?.ads_by_campaign?.length || 0) > 0) {
        setApiAdsData(adsPerfData);
        invalidatePersistedAds();
        const campaignCount = adsPerfData.ads_by_campaign?.length || 0;
        toast.success(`Ads importados: ${campaignCount} campanha${campaignCount !== 1 ? 's' : ''} · ${adsPerfData.summary.days} dias · ROAS ${adsPerfData.summary.roas_geral.toFixed(2)}`);
      } else if ((adsPerfData?.campaign_count || 0) > 0) {
        toast.info(`${adsPerfData.campaign_count} campanhas encontradas, mas sem métricas no período.`);
      } else {
        toast.info('Nenhuma campanha de Ads encontrada na sua loja Shopee.');
      }
    } catch {
      // Error already shown by syncAdsOnly
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
  const hasAnyContent = hasData || !!effectiveApiData;

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
          allAds={selectedDetail.id.startsWith('api-campaign-') ? (effectiveApiData?.ads_by_campaign || []).map(campaignToEnrichedAds) : filtered}
          onClose={() => setSelectedDetail(null)}
          onNavigate={(ad) => setSelectedDetail(ad)}
          onImportPosition={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { setPositionTarget(selectedDetail.id); setSelectedDetail(null); positionFileRef.current?.click(); } }}
          onLink={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { setLinkTarget(selectedDetail.id); setSelectedDetail(null); } }}
          onQuickRegister={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { setQuickRegTarget(selectedDetail); setSelectedDetail(null); } }}
          onReimport={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { setPositionTarget(selectedDetail.id); positionFileRef.current?.click(); } }}
          onUnlink={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { unlinkProduct(selectedDetail.id); setSelectedDetail(null); } }}
          onChangeLink={() => { if (!selectedDetail.id.startsWith('api-campaign-')) { setLinkTarget(selectedDetail.id); } }}
          onRefreshProduct={selectedDetail.id.startsWith('api-campaign-') ? (itemId: number) => handleRefreshProduct(itemId) : undefined}
        />
      ) : (
        <>
           {/* ═══ Empty State ═══ */}
           {!hasAnyContent && (
              <AdsEmptyState
                onImport={() => fileRef.current?.click()}
                onShopeeIntegration={() => setShowShopeeModal(true)}
                onImportAds={handleImportAds}
                isConnected={isConnected}
                syncing={syncing}
              />
            )}

          {/* ═══ API Ads Dashboard ═══ */}
          {effectiveApiData && (
            <>
              <AdsHeader
                periodLabel={`${effectiveApiData.period_start} – ${effectiveApiData.period_end}`}
                onImportCSV={() => fileRef.current?.click()}
                onImportAds={handleImportAds}
                syncing={syncing}
              />
              <ApiAdsDashboard data={effectiveApiData} onRefreshProduct={handleRefreshProduct} onCampaignSelect={handleCampaignSelect} />
            </>
          )}

          {/* ═══ Header com botão discreto (CSV data) ═══ */}
          {hasData && !effectiveApiData && (
             <AdsHeader
               periodLabel={periodLabel}
               onImportCSV={() => fileRef.current?.click()}
               onImportAds={handleImportAds}
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
