import { useState, useMemo, useRef, useEffect } from 'react';
import { ApiAdsDashboard } from './ApiAdsDashboard';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { useApiAdsData, buildApiAdsDataFromRows } from '@/hooks/useApiAdsData';
import { Upload, Trash2, MapPin, Calendar as CalendarIcon, ShoppingBag, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, subDays, subMonths, startOfDay, endOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
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

import { AdsProductCard } from './AdsProductCard';
import { AlertsSection } from './AlertsSection';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

type StatusFilter = 'all' | 'scheduled' | 'active' | 'paused' | 'ended' | 'deleted';

const STATUS_FILTER_OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Tudo' },
  { key: 'scheduled', label: 'Programado' },
  { key: 'active', label: 'Em andamento' },
  { key: 'paused', label: 'Pausado' },
  { key: 'ended', label: 'Encerrado' },
  { key: 'deleted', label: 'Excluído' },
];

function getStatusFilterKey(status: string | null | undefined): Exclude<StatusFilter, 'all'> {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'scheduled' || normalized === 'programado' || normalized === 'programada') return 'scheduled';
  if (normalized === 'active' || normalized === 'ativo' || normalized === 'ativa' || normalized === 'em andamento') return 'active';
  if (normalized === 'paused' || normalized === 'pausado' || normalized === 'pausada') return 'paused';
  if (normalized === 'deleted' || normalized === 'excluído' || normalized === 'excluido') return 'deleted';

  return 'ended';
}

function getStatusLabel(status: string | null | undefined) {
  const key = getStatusFilterKey(status);

  if (key === 'scheduled') return 'Programado';
  if (key === 'active') return 'Ativo';
  if (key === 'paused') return 'Pausado';
  if (key === 'deleted') return 'Excluído';
  return 'Encerrado';
}

function formatPeriodLabel(inicio: string, fim: string) {
  const fShort = (d: string) => { const p = d.split('-'); return `${p[2]}/${p[1]}`; };
  const fFull = (d: string) => { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
  return `${fShort(inicio)} – ${fFull(fim)}`;
}

// Date range presets
const DATE_PRESETS = [
  { label: 'Hoje', getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Ontem', getRange: () => { const d = subDays(new Date(), 1); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: 'Última semana', getRange: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: 'Último mês', getRange: () => ({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) }) },
  { label: 'Últimos 3 meses', getRange: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
];

function AdsDateRangePicker({ dateFrom, dateTo, onRangeChange }: {
  dateFrom: Date | undefined; dateTo: Date | undefined;
  onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = dateFrom && dateTo
    ? `${format(dateFrom, 'dd/MM/yyyy')} – ${format(dateTo, 'dd/MM/yyyy')}`
    : 'Selecionar período';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2 text-xs font-medium", !dateFrom && "text-muted-foreground")}>
          <CalendarIcon className="w-3.5 h-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="border-r border-border p-2 space-y-0.5 min-w-[130px]">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  const range = preset.getRange();
                  onRangeChange(range.from, range.to);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => { onRangeChange(undefined, undefined); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Limpar filtro
            </button>
          </div>
          {/* Calendar */}
          <Calendar
            mode="range"
            selected={dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined}
            onSelect={(range) => {
              onRangeChange(range?.from, range?.to);
              if (range?.from && range?.to) setTimeout(() => setOpen(false), 200);
            }}
            numberOfMonths={2}
            locale={ptBR}
            disabled={(date) => date > new Date()}
            className="p-3 pointer-events-auto"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AdsHeader({ periodLabel, onImportCSV, onImportAds, syncing, dateFrom, dateTo, onRangeChange }: {
  periodLabel: string; onImportCSV: () => void; onImportAds: () => void; syncing?: boolean;
  dateFrom: Date | undefined; dateTo: Date | undefined; onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
}) {
  const { isConnected, token } = useShopeeToken();

  const syncAgo = token?.updated_at
    ? formatDistanceToNow(new Date(token.updated_at), { addSuffix: false, locale: ptBR })
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-foreground">Análise de Ads</p>
            {periodLabel && (
              <p className="text-[11px] text-muted-foreground font-mono">{periodLabel}</p>
            )}
          </div>
          <AdsDateRangePicker dateFrom={dateFrom} dateTo={dateTo} onRangeChange={onRangeChange} />
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
    </div>
  );
}

/* ═══ Main AdsTab ═══ */
export function AdsTab({ onDetailOpen }: { onDetailOpen?: (open: boolean) => void }) {
  const { currentStore } = useStore();
  const { data, loading, operating, importGeneralCSV, importProductCSV, importFromApi, linkProduct, unlinkProduct, reload, deleteAdsData, deleteAll } = useAdsData();
  const { isConnected, syncAdsOnly, isExpired, needsReauth, startOAuth } = useShopeeToken();
  const [selectedDetail, setSelectedDetailRaw] = useState<EnrichedAdsData | null>(null);
  const setSelectedDetail = (ad: EnrichedAdsData | null) => {
    setSelectedDetailRaw(ad);
    onDetailOpen?.(!!ad);
  };
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [quickRegTarget, setQuickRegTarget] = useState<EnrichedAdsData | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);
  const [positionJustImported, setPositionJustImported] = useState(false);
  const [showShopeeModal, setShowShopeeModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Date range filter – default: last 28 days
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => subDays(new Date(), 28));
  const [dateTo, setDateTo] = useState<Date | undefined>(() => new Date());
  const handleRangeChange = (from: Date | undefined, to: Date | undefined) => { setDateFrom(from); setDateTo(to); };

  const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : '';
  const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : '';

  const [apiAdsData, setApiAdsData] = useState<any>(null);
  const [apiCampaignList, setApiCampaignList] = useState<any[]>([]);

  // Load persisted data from database as fallback, filtered by date range
  const { data: persistedRows, invalidate: invalidatePersistedAds } = useApiAdsData();
  const dateFilteredRows = useMemo(() => {
    if (!persistedRows) return [];
    if (!dateFromStr && !dateToStr) return persistedRows;
    return persistedRows.filter((r: any) => {
      if (dateFromStr && r.period_end < dateFromStr) return false;
      if (dateToStr && r.period_start > dateToStr) return false;
      return true;
    });
  }, [persistedRows, dateFromStr, dateToStr]);
  const persistedApiData = useMemo(() => buildApiAdsDataFromRows(dateFilteredRows), [dateFilteredRows]);

  // Use in-memory data if available, otherwise fall back to persisted DB data
  const effectiveApiData = apiAdsData || persistedApiData;

  // Convert API campaign to EnrichedAdsData for detail view
  const campaignToEnrichedAds = (campaign: any): EnrichedAdsData => {
    const now = new Date().toISOString();

    // Auto-link by shopee_item_id
    const matchedProduct = products.find(p =>
      (p as any).shopeeItemId && campaign.item_id &&
      String((p as any).shopeeItemId) === String(campaign.item_id)
    );

    // Calculate classification if linked
    let classificacao: string | null = null;
    let roasEmpate: number | null = null;
    let margemContribuicao: number | null = null;

    if (matchedProduct && campaign.expense > 0) {
      const salePrice = (matchedProduct as any).salePrice || 0;
      const costPrice = (matchedProduct as any).costPrice || 0;
      const margin = salePrice > 0 ? ((salePrice - costPrice) / salePrice) : 0;
      margemContribuicao = margin * 100;
      roasEmpate = margin > 0 ? (1 / margin) : null;
      const roas = campaign.roas || 0;
      if (roasEmpate !== null) {
        if (roas >= roasEmpate * 1.5) classificacao = 'LUCRATIVO';
        else if (roas >= roasEmpate) classificacao = 'MARGEM_APERTADA';
        else if (roas >= roasEmpate * 0.5) classificacao = 'ABAIXO_EMPATE';
        else classificacao = 'PREJUIZO';
      }
    }

    return {
      id: `api-campaign-${campaign.campaign_id}`,
      user_id: '',
      product_id: matchedProduct?.id || null,
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
      status_anuncio: getStatusLabel(campaign.status),
      impressoes_produto: null,
      cliques_produto: null,
      posicao_media: campaign.avg_position,
      posicao_importada: false,
      roas_empate: roasEmpate,
      margem_contribuicao: margemContribuicao,
      classificacao,
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
        // Merge only the specific campaigns by campaign_id
        setApiAdsData((prev: any) => {
          const base = prev || effectiveApiData;
          if (!base) return adsPerfData;
          const updatedCampaigns = [...(base.ads_by_campaign || [])];
          for (const newC of adsPerfData.ads_by_campaign) {
            const idx = updatedCampaigns.findIndex((c: any) => 
              c.campaign_id === newC.campaign_id || 
              (!c.campaign_id && String(c.item_id) === String(newC.item_id))
            );
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
        toast.success(`Produto atualizado! ${adsPerfData.ads_by_campaign.length} campanha(s)`);
      } else {
        // No new data from API — invalidate cache to reload persisted data
        invalidatePersistedAds();
        toast.info('Nenhuma métrica individual retornada pela API para este item. Os dados gerais da loja permanecem salvos.');
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

  // Filter by period + date range
  const periodFiltered = useMemo(() => {
    let result = data;
    if (selectedPeriod !== 'all') {
      const [inicio, fim] = selectedPeriod.split('|');
      result = result.filter(d => d.periodo_inicio === inicio && d.periodo_fim === fim);
    }
    if (dateFromStr || dateToStr) {
      result = result.filter(d => {
        if (dateFromStr && (d.periodo_fim || '') < dateFromStr) return false;
        if (dateToStr && (d.periodo_inicio || '') > dateToStr) return false;
        return true;
      });
    }
    return result;
  }, [data, selectedPeriod, dateFromStr, dateToStr]);

  const filtered = useMemo(() => {
    let result = periodFiltered;
    if (filter === 'unlinked') result = periodFiltered.filter(d => !d.product_id);
    else if (filter === 'ABAIXO_EMPATE') result = periodFiltered.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    else if (filter !== 'all') result = periodFiltered.filter(d => d.classificacao === filter);

    return [...result].sort((a, b) => {
      // Ordenar por maior GMV como padrão
      return (b.gmv || 0) - (a.gmv || 0);
    });
  }, [periodFiltered, filter]);

  // Convert API campaigns to EnrichedAdsData
  const apiEnriched = useMemo(() => {
    if (!effectiveApiData?.ads_by_campaign) return [];
    return effectiveApiData.ads_by_campaign.map((c: any) => campaignToEnrichedAds(c));
  }, [effectiveApiData, products]);

  // Merge: API + CSV, dedup by shopee_product_id
  const mergedAds = useMemo(() => {
    if (!apiEnriched.length) return filtered.map(ad => ({ ad, source: 'csv' as const }));
    if (!filtered.length) return apiEnriched.map((ad: EnrichedAdsData) => ({ ad, source: 'api' as const }));
    
    // API takes priority; CSV items not in API get tagged "CSV"
    const apiItemIds = new Set(apiEnriched.map((a: EnrichedAdsData) => a.shopee_product_id).filter(Boolean));
    const csvOnly = filtered.filter(d => !d.shopee_product_id || !apiItemIds.has(d.shopee_product_id));
    
    return [
      ...apiEnriched.map((ad: EnrichedAdsData) => ({ ad, source: 'api' as const })),
      ...csvOnly.map(ad => ({ ad, source: 'csv' as const })),
    ];
  }, [apiEnriched, filtered]);

  // Apply classification + status filter to merged list
  const filteredMerged = useMemo(() => {
    let result = mergedAds;

    if (statusFilter !== 'all') {
      result = result.filter(({ ad }) => getStatusFilterKey(ad.status_anuncio) === statusFilter);
    }

    if (filter === 'unlinked') result = result.filter(({ ad }) => !ad.product_id);
    else if (filter === 'ABAIXO_EMPATE') result = result.filter(({ ad }) => ad.classificacao === 'ABAIXO_EMPATE' || ad.classificacao === 'MARGEM_APERTADA');
    else if (filter !== 'all') result = result.filter(({ ad }) => ad.classificacao === filter);

    return result;
  }, [mergedAds, filter, statusFilter]);

  // For FilterChips, use all merged ads
  const allAdsForChips = useMemo(() => mergedAds.map(m => m.ad), [mergedAds]);

  const hasData = data.length > 0;
  const hasApiCampaigns = apiEnriched.length > 0;
  // Check unfiltered data existence so date filter doesn't show empty/reconnect state
  const hasPersistedApiData = (persistedRows && persistedRows.length > 0) || !!apiAdsData;
  const hasAnyContent = hasData || hasPersistedApiData;

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
           {/* ═══ Reauth Alert ═══ */}
           {isConnected && (isExpired || needsReauth) && (
             <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
               <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-foreground">Token da Shopee expirado</p>
                 <p className="text-xs text-muted-foreground">Reconecte para continuar importando dados de Ads.</p>
               </div>
               <Button size="sm" onClick={() => startOAuth('ads')} className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
                 Reconectar
               </Button>
             </div>
           )}

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

          {/* ═══ API Ads Summary (KPIs + charts only) ═══ */}
          {effectiveApiData && (
            <>
              <AdsHeader
                periodLabel={`${effectiveApiData.period_start} – ${effectiveApiData.period_end}`}
                onImportCSV={() => fileRef.current?.click()}
                onImportAds={handleImportAds}
                syncing={syncing}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onRangeChange={handleRangeChange}
              />
              <ApiAdsDashboard data={effectiveApiData} products={products} />
            </>
          )}

          {/* ═══ Header com botão discreto (CSV data) ═══ */}
          {hasData && !effectiveApiData && (
             <AdsHeader
               periodLabel={periodLabel}
               onImportCSV={() => fileRef.current?.click()}
               onImportAds={handleImportAds}
               syncing={syncing}
               dateFrom={dateFrom}
               dateTo={dateTo}
               onRangeChange={handleRangeChange}
             />
          )}

          {(hasData || hasApiCampaigns) && (
            <>
              {/* ═══ Period chips (CSV only) ═══ */}
              {periods.length > 0 && !hasApiCampaigns && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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

              {/* ═══ Summary (CSV only, when no API) ═══ */}
              {!hasApiCampaigns && <SummaryCards data={periodFiltered} />}

              {/* ═══ Alerts ═══ */}
              <AlertsSection data={allAdsForChips} />

              {/* ═══ Unified filter bar ═══ */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                {/* Status chips (only when API campaigns exist) */}
                {hasApiCampaigns && STATUS_FILTER_OPTIONS.map(option => (
                  <button
                    key={`status-${option.key}`}
                    onClick={() => setStatusFilter(option.key)}
                    className={cn(
                      'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
                      statusFilter === option.key
                        ? 'border-primary text-primary bg-primary/5'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}

                {/* Separator */}
                {hasApiCampaigns && <div className="w-px h-5 bg-border shrink-0 mx-1" />}

                {/* Classification chips (inline) */}
                {(() => {
                  const linked = allAdsForChips.filter(d => !!d.product_id);
                  const unlinkedCount = allAdsForChips.filter(d => !d.product_id).length;
                  const classFilters: Array<{ key: FilterType; label: string; dot: string | null; count: number }> = [
                    { key: 'all', label: 'Todos', dot: null, count: allAdsForChips.length },
                    { key: 'LUCRATIVO', label: 'Lucrativos', dot: 'bg-success', count: linked.filter(d => d.classificacao === 'LUCRATIVO').length },
                    { key: 'ABAIXO_EMPATE', label: 'Atenção', dot: 'bg-warning', count: linked.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA').length },
                    { key: 'PREJUIZO', label: 'Prejuízo', dot: 'bg-destructive', count: linked.filter(d => d.classificacao === 'PREJUIZO').length },
                    { key: 'unlinked', label: 'Pendentes', dot: null, count: unlinkedCount },
                  ];
                  const visible = classFilters.filter(f => f.key === 'all' || f.count > 0);
                  return visible.map(f => {
                    const isActive = filter === f.key;
                    const activeStyles: Record<string, string> = {
                      all: 'bg-primary text-primary-foreground',
                      LUCRATIVO: 'bg-success/15 text-success border-success/30',
                      ABAIXO_EMPATE: 'bg-warning/15 text-warning border-warning/30',
                      PREJUIZO: 'bg-destructive/15 text-destructive border-destructive/30',
                      unlinked: 'bg-surface-2 text-foreground border-border',
                    };
                    return (
                      <button
                        key={`class-${f.key}`}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                          'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5',
                          isActive
                            ? activeStyles[f.key] || 'bg-primary text-primary-foreground'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {f.dot && <span className={cn('w-2 h-2 rounded-full inline-block', f.dot)} />}
                        {f.label}
                        <span className="opacity-50">({f.count})</span>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* ═══ Product list (unified) ═══ */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">Anúncios ({filteredMerged.length})</h2>
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
                {filteredMerged.map(({ ad, source }) => (
                  <AdsProductCard
                    key={ad.id}
                    ad={ad}
                    source={source}
                    onClick={() => setSelectedDetail(ad)}
                    onLink={() => { if (!ad.id.startsWith('api-campaign-')) setLinkTarget(ad.id); }}
                    onQuickRegister={() => { if (!ad.id.startsWith('api-campaign-')) setQuickRegTarget(ad); }}
                    onUpdatePosition={() => { if (!ad.id.startsWith('api-campaign-')) { setPositionTarget(ad.id); positionFileRef.current?.click(); } }}
                    onDelete={() => { if (!ad.id.startsWith('api-campaign-')) deleteAdsData(ad.id); }}
                  />
                ))}
                {filteredMerged.length === 0 && (
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
