import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { Upload, Trash2, MapPin, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { parseShopeeAdsCSV, validateCSVSecurity } from '@/lib/shopeeAdsParser';
import { AdsDetailFullView } from './AdsDetailFullView';
import { AdsLinkModal } from './AdsLinkModal';
import { QuickRegisterModal } from './QuickRegisterModal';
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

/* ═══ Import Panel Component ═══ */
function ImportPanel({
  hasData,
  periodLabel,
  operating,
  onImportCSV,
  onImportOperationLog,
  hasOperationLog,
  operationEventsCount,
}: {
  hasData: boolean;
  periodLabel: string;
  operating: boolean;
  onImportCSV: () => void;
  onImportOperationLog: () => void;
  hasOperationLog: boolean;
  operationEventsCount: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Importar dados da campanha</p>
        {periodLabel && (
          <span className="text-[11px] text-text-2 bg-surface-2 border border-border rounded-lg px-2.5 py-1">
            {periodLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* CSV 1: Relatório de performance */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            <p className="text-[11px] font-semibold text-foreground">Relatório de Ads</p>
            <span className="ml-auto text-[9px] font-medium bg-surface-2 border border-border text-text-3 rounded px-1.5 py-0.5">Obrigatório</span>
          </div>
          <button
            onClick={onImportCSV}
            disabled={operating}
            className="w-full border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-3 flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold text-foreground">
              {operating ? 'Importando...' : hasData ? 'Atualizar CSV' : 'Importar CSV'}
            </p>
            <p className="text-[9px] text-text-3 text-center leading-snug">
              ROAS · GMV · Cliques · ACOS · Posição
            </p>
          </button>
          {hasData && (
            <p className="text-[10px] text-success text-center">✓ Importado · {periodLabel}</p>
          )}
          <p className="text-[9px] text-text-3 text-center leading-snug">
            Shopee Ads → Relatório → Exportar dados
          </p>
        </div>
        {/* CSV 2: Log de operações */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-foreground">Histórico de ajustes</p>
            <span className="ml-auto text-[9px] font-medium bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded px-1.5 py-0.5">Opcional</span>
          </div>
          <button
            onClick={onImportOperationLog}
            className={cn(
              'w-full border border-dashed rounded-lg px-3 py-3 flex flex-col items-center gap-1.5 transition-colors',
              hasOperationLog
                ? 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10'
                : 'border-border hover:border-border/80 hover:bg-surface-2'
            )}
          >
            <Upload className={cn('w-4 h-4', hasOperationLog ? 'text-blue-500' : 'text-text-3')} />
            <p className="text-[11px] font-semibold text-foreground">
              {hasOperationLog ? 'Atualizar log' : 'Importar log'}
            </p>
            <p className="text-[9px] text-text-3 text-center leading-snug">
              Orçamento · ROAS meta · Boost
            </p>
          </button>
          {hasOperationLog ? (
            <p className="text-[10px] text-blue-500 text-center">✓ {operationEventsCount} eventos importados</p>
          ) : (
            <p className="text-[10px] text-text-3 text-center">Mostra eventos no gráfico de histórico</p>
          )}
          <p className="text-[9px] text-text-3 text-center leading-snug">
            Shopee Ads → Registro de operações → Exportar
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══ Operation Log Results Section ═══ */
function OperationLogResults({ operationEvents }: { operationEvents: Array<{ datetime: string; type: string; detail: string }> }) {
  if (operationEvents.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-2">
          Resultado dos ajustes
        </p>
      </div>
      <div className="space-y-3">
        {operationEvents.slice(0, 10).map((event, i) => {
          const eventDate = new Date(event.datetime);
          const daysSinceEvent = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          const hasResult = daysSinceEvent >= 5;

          const isRoasChange = event.type.toLowerCase().includes('roas');
          const isBudgetChange = event.type.toLowerCase().includes('orçamento') || event.detail.toLowerCase().includes('orçamento');
          const isBoostChange = event.detail.toLowerCase().includes('impulsão') || event.detail.toLowerCase().includes('boost');

          const eventTypeColor = isRoasChange ? 'text-success bg-success/10 border-success/25'
            : isBudgetChange ? 'text-blue-500 bg-blue-500/10 border-blue-500/25'
            : 'text-warning bg-warning/10 border-warning/25';

          const eventTypeLabel = isRoasChange ? 'ROAS meta'
            : isBudgetChange ? 'Orçamento'
            : isBoostChange ? 'Boost'
            : 'Configuração';

          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center gap-0 pt-1">
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  isRoasChange ? 'bg-success' : isBudgetChange ? 'bg-blue-500' : 'bg-warning'
                )} />
                {i < operationEvents.slice(0, 10).length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 min-h-[32px]" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', eventTypeColor)}>
                    {eventTypeLabel}
                  </span>
                  <span className="text-[11px] font-medium text-foreground truncate flex-1">
                    {event.detail || event.type}
                  </span>
                  <span className="text-[10px] text-text-3 flex-shrink-0">
                    {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
                {hasResult ? (
                  <div className="grid grid-cols-3 gap-2 bg-surface-2 border border-border rounded-lg p-2">
                    <div className="text-center">
                      <p className="text-[9px] text-text-3 mb-1">ROAS (7d após)</p>
                      <p className="text-[12px] font-bold text-success">ver dados</p>
                      <p className="text-[9px] text-text-3">vs período ant.</p>
                    </div>
                    <div className="text-center border-x border-border">
                      <p className="text-[9px] text-text-3 mb-1">Vendas/dia</p>
                      <p className="text-[12px] font-bold text-foreground">—</p>
                      <p className="text-[9px] text-text-3">vs período ant.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-text-3 mb-1">Posição</p>
                      <p className="text-[12px] font-bold text-foreground">—</p>
                      <p className="text-[9px] text-text-3">vs período ant.</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-surface-2 border border-border rounded-lg">
                    <p className="text-[10px] text-text-3">
                      Aguardando dados — resultado disponível {Math.max(0, 5 - daysSinceEvent)} dia(s) após o ajuste.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-text-3 text-center">
        Para ver o impacto real de cada ajuste, importe CSVs de períodos diferentes antes e após cada mudança.
      </p>
    </div>
  );
}

/* ═══ Main AdsTab ═══ */
export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, operating, importGeneralCSV, importProductCSV, linkProduct, unlinkProduct, reload, deleteAdsData, deleteAll } = useAdsData();
  const [selectedDetail, setSelectedDetail] = useState<EnrichedAdsData | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [quickRegTarget, setQuickRegTarget] = useState<EnrichedAdsData | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);
  const [positionJustImported, setPositionJustImported] = useState(false);

  // Operation log state
  const operationLogInputRef = useRef<HTMLInputElement>(null);
  const [operationEvents, setOperationEvents] = useState<Array<{
    datetime: string;
    type: string;
    detail: string;
  }>>([]);
  const [hasOperationLog, setHasOperationLog] = useState(false);

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

  const handleOperationLogSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const headerIdx = lines.findIndex(l =>
        l.includes('Atualizar horário') || (l.includes('Data') && l.includes('Operador'))
      );
      if (headerIdx === -1) { toast.error('Arquivo de operações inválido'); return; }
      const events: typeof operationEvents = [];
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 4) continue;
        const datetime = cols[0]?.trim() || '';
        const eventType = cols[3]?.trim() || '';
        const detail = cols[4]?.trim() || '';
        if (datetime && (eventType || detail)) {
          events.push({ datetime, type: eventType, detail });
        }
      }
      if (events.length === 0) { toast.error('Nenhum evento encontrado no arquivo'); return; }
      setOperationEvents(events);
      setHasOperationLog(true);
      toast.success(`${events.length} eventos de campanha importados`);
    } catch {
      toast.error('Erro ao ler o arquivo de operações');
    } finally {
      if (e.target) e.target.value = '';
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
      <input ref={operationLogInputRef} type="file" accept=".csv" onChange={handleOperationLogSelect} className="hidden" />

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
          {/* ═══ Import Panel (always visible) ═══ */}
          <ImportPanel
            hasData={hasData}
            periodLabel={periodLabel}
            operating={operating}
            onImportCSV={() => fileRef.current?.click()}
            onImportOperationLog={() => operationLogInputRef.current?.click()}
            hasOperationLog={hasOperationLog}
            operationEventsCount={operationEvents.length}
          />

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

              {/* ═══ Operation Log Results ═══ */}
              <OperationLogResults operationEvents={operationEvents} />

              {/* ═══ Filters ═══ */}
              <FilterChips filter={filter} setFilter={setFilter} data={periodFiltered} />

              {/* ═══ Product list ═══ */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">Anúncios</h2>
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
    </div>
  );
}
