import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, AlertTriangle, Target, Zap, MapPin,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Percent, Upload,
  Link2, BarChart3, Info, Clock, Wallet, Package, Plus, LineChart,
  History, Settings, Sparkles, ArrowRight, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { OperationLogEntry, detectAndParseCSV, validateCSVSecurity } from '@/lib/shopeeAdsParser';
import { parseShopeeExcel, validateExcelFile, ExcelPerformanceData } from '@/lib/shopeeExcelParser';
import { parseProductPerformanceExcel } from '@/lib/parsers/parseProductPerformanceExcel';
import { ExcelAnalysis } from './ExcelAnalysis';
import { toast } from 'sonner';
import {
  AreaChart, Area, LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip as ReTooltip,
  ReferenceLine, Customized, ResponsiveContainer,
} from 'recharts';
import {
  calcularRoasEmpate, classificarAnuncio, sugerirMetaRoas,
  classificarPosicao, getDiagnostico, detectarCrossSell,
  calcAdEfficiencyScore, calcHaloEffect, calcCostVsMarginAlert,
  type Classificacao,
} from '@/lib/adsLogic';
import { calcFullRoas } from '@/lib/roasUtils';
import { fmt, fmtShort, getClassCor, getRoasColor, getDiasPeriodo } from './adsHelpers';

interface Props {
  ad: EnrichedAdsData;
  allAds: EnrichedAdsData[];
  onClose: () => void;
  onNavigate: (ad: EnrichedAdsData) => void;
  onImportPosition: () => void;
  onLink: () => void;
  onQuickRegister: () => void;
  onReimport?: () => void;
  onUnlink?: () => void;
  onChangeLink?: () => void;
  onRefreshProduct?: (itemId: number) => void;
  onMetricsImported?: (updates: { posicao_media?: number | null }) => void;
}

// ═══ Operation Log Timeline ═══

const FIELD_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  roas_target: { icon: Target, color: 'text-success' },
  budget: { icon: DollarSign, color: 'text-primary dark:text-blue-400' },
  quick_boost: { icon: Zap, color: 'text-warning' },
  campaign_created: { icon: Plus, color: 'text-success' },
  other: { icon: Settings, color: 'text-text-3' },
};

function formatLogLabel(entry: OperationLogEntry): string {
  switch (entry.field) {
    case 'roas_target': return `ROAS meta: ${entry.fromValue ?? '?'} → ${entry.toValue ?? '?'}`;
    case 'budget': return `Orçamento: ${entry.fromValue ?? '?'} → ${entry.toValue ?? '?'}`;
    case 'quick_boost': return `Impulsão Rápida: ${entry.details.replace(/^.*?:/, '').trim().slice(0, 40)}`;
    case 'campaign_created': return `Campanha criada${entry.toValue ? ` · ROAS ${entry.toValue}` : ''}`;
    default: return entry.details.slice(0, 50);
  }
}

function parseCampaignDetails(details: string): string[] {
  const pills: string[] = [];
  const budgetMatch = details.match(/Orçamento diário[:\s]*([^\s,;|]+)/i) || details.match(/R\$\s*[\d.,]+\/dia/i);
  if (budgetMatch) pills.push(budgetMatch[0].includes('R$') ? budgetMatch[0] : `R$ ${budgetMatch[1]}/dia`);
  const roasMatch = details.match(/ROAS[:\s]*([\d.,]+)/i);
  if (roasMatch) pills.push(`ROAS ${roasMatch[1]}`);
  const boostMatch = details.match(/Impulsão[^:]*[:\s]*(ON|OFF|Ligad|Desligad|Ativad|Desativad)/i);
  if (boostMatch) pills.push(`Impulsão: ${/^(O|L|A)/i.test(boostMatch[1]) && !boostMatch[1].startsWith('OF') ? 'ON' : 'OFF'}`);
  const criativoMatch = details.match(/Criativo[^:]*[:\s]*(ON|OFF|Ligad|Desligad|Ativad|Desativad)/i);
  if (criativoMatch) pills.push(`Criativo: ${/^(O|L|A)/i.test(criativoMatch[1]) && !criativoMatch[1].startsWith('OF') ? 'ON' : 'OFF'}`);
  const lanceMatch = details.match(/lance otimizado[^:]*[:\s]*(ON|OFF|Ligad|Desligad|Ativad|Desativad)/i);
  if (lanceMatch) pills.push(`Lance: ${/^(O|L|A)/i.test(lanceMatch[1]) && !lanceMatch[1].startsWith('OF') ? 'ON' : 'OFF'}`);
  const focoMatch = details.match(/Tipo de Venda[:\s]*([^,;|]+)/i);
  if (focoMatch) pills.push(`Foco: ${focoMatch[1].trim()}`);
  return pills;
}

function getObservation(entry: OperationLogEntry): string | null {
  if (entry.field === 'roas_target') {
    const from = parseFloat(entry.fromValue ?? '0');
    const to = parseFloat(entry.toValue ?? '0');
    if (to > from) return `⚠ Meta aumentada ${from}→${to}: algoritmo tende a reduzir volume de impressões`;
    if (to < from) return `📈 Meta reduzida ${from}→${to}: espere aumento de impressões e volume`;
  }
  if (entry.field === 'budget') {
    const from = parseFloat(entry.fromValue ?? '0');
    const to = parseFloat(entry.toValue ?? '0');
    if (to > from) return `💰 Orçamento aumentado: mais espaço para capturar vendas`;
    if (to < from) return `⚠ Orçamento reduzido: pode limitar volume de impressões`;
  }
  if (entry.field === 'quick_boost') return `⚡ Impulsão ativa: pico temporário de impressões esperado`;
  if (entry.field === 'campaign_created') return `🆕 Nova campanha: aguarde 3-5 dias para estabilizar`;
  return null;
}

function formatLogDate(ts: string): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function OperationLogTimeline({ adProductId, adShopeeProductId, roasEmpate, onLogLoaded, onMetricsImported, importTriggerRef }: { adProductId: string | null; adShopeeProductId: string | null; roasEmpate: number | null; onLogLoaded?: (log: OperationLogEntry[]) => void; onMetricsImported?: (updates: { posicao_media?: number | null }) => void; importTriggerRef?: React.MutableRefObject<(() => void) | null> }) {
  const { user } = useAuth();
  const [operationLog, setOperationLog] = useState<OperationLogEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importTriggerRef) {
      importTriggerRef.current = () => fileInputRef.current?.click();
    }
    return () => { if (importTriggerRef) importTriggerRef.current = null; };
  }, [importTriggerRef]);
  const loadLog = useCallback(async () => {
    if (!user) return;
    if (adProductId) {
      const { data } = await supabase
        .from('product_ads_metrics')
        .select('operation_log')
        .eq('user_id', user.id)
        .eq('product_id', adProductId)
        .order('imported_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0 && data[0].operation_log) {
        const log = data[0].operation_log as unknown as OperationLogEntry[];
        setOperationLog(log);
        onLogLoaded?.(log);
        return;
      }
    }
    if (adShopeeProductId) {
      const { data } = await supabase
        .from('product_ads_metrics')
        .select('operation_log')
        .eq('user_id', user.id)
        .eq('shopee_product_id', adShopeeProductId)
        .order('imported_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0 && data[0].operation_log) {
        const log = data[0].operation_log as unknown as OperationLogEntry[];
        setOperationLog(log);
        onLogLoaded?.(log);
      }
    }
  }, [user, adProductId, adShopeeProductId]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const upsertMetrics = async (payload: Record<string, any>) => {
    if (!user || (!adProductId && !adShopeeProductId)) return;

    // Try update by shopee_product_id first (more reliable for API campaigns)
    let updated = false;
    if (adShopeeProductId) {
      const { data } = await supabase.from('product_ads_metrics')
        .update(payload).eq('user_id', user.id)
        .eq('shopee_product_id', adShopeeProductId)
        .select('id');
      if (data && data.length > 0) updated = true;
    }
    // Fallback: try by product_id
    if (!updated && adProductId) {
      const { data } = await supabase.from('product_ads_metrics')
        .update(payload).eq('user_id', user.id)
        .eq('product_id', adProductId)
        .select('id');
      if (data && data.length > 0) updated = true;
    }
    // If no row was updated, insert new
    if (!updated) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('product_ads_metrics').insert({
        user_id: user.id,
        product_id: adProductId || null,
        shopee_product_id: adShopeeProductId || null,
        period_start: payload.period_start || today,
        period_end: payload.period_end || today,
        ...payload,
      } as any);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const validation = validateCSVSecurity(file, text);
      if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }
      if (!adProductId && !adShopeeProductId) {
        toast.error('Produto não vinculado'); return;
      }
      const detected = detectAndParseCSV(text);

      if (detected.type === 'operation_log' && detected.operationLog?.length) {
        await upsertMetrics({ operation_log: detected.operationLog as any });
        toast.success('Log de operações importado');
        loadLog();
      } else if (detected.type === 'performance' && detected.performanceData?.metrics?.length) {
        const m = detected.performanceData.metrics[0];
        await upsertMetrics({
          impressions: m.impressions,
          clicks: m.clicks,
          items_sold: m.itemsSold,
          gmv: m.gmv,
          spend: m.spend,
          roas: m.roas,
          acos: m.acos,
          ctr: m.ctr,
          conv_rate: m.convRate,
          avg_position: m.avgPosition,
          direct_roas: m.directRoas,
          direct_acos: m.directAcos,
          cost_per_conv: m.costPerConv,
          shopee_product_name: m.shopeeProductName || null,
          shopee_product_id: m.shopeeProductId || adShopeeProductId || null,
          period_start: m.periodStart || new Date().toISOString().slice(0, 10),
          period_end: m.periodEnd || new Date().toISOString().slice(0, 10),
        } as any);
        toast.success('Dados de performance do produto importados');
        // Notify parent about position update so UI refreshes
        if (m.avgPosition !== null && m.avgPosition !== undefined) {
          onMetricsImported?.({ posicao_media: m.avgPosition });
        }
      } else {
        toast.error('CSV não reconhecido. Use o relatório "Por Produto" ou "Registro de Operações" da Shopee.');
      }
    } catch { toast.error('Erro ao importar CSV'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (!operationLog || operationLog.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-lg">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
          <LineChart className="w-4 h-4 text-primary dark:text-blue-400" /> Histórico de Performance
        </p>
        <p className="text-sm text-text-2 text-center py-6">gráfico disponível após importar o CSV de Ads</p>
      </div>
    );
  }

  const sortedEvents = [...operationLog].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const chartData: { date: string; roas: number | null; fullDate: string }[] = [];
  let lastRoas: number | null = null;
  for (const ev of sortedEvents) {
    const dateLabel = ev.timestamp.slice(5, 10).replace('-', '/');
    if (ev.field === 'roas_target' || ev.field === 'campaign_created') {
      lastRoas = parseFloat(ev.toValue ?? '0');
      chartData.push({ date: dateLabel, roas: lastRoas, fullDate: ev.timestamp });
    } else {
      chartData.push({ date: dateLabel, roas: lastRoas, fullDate: ev.timestamp });
    }
  }

  const roasPoints = chartData.filter(d => d.roas !== null);
  const showChart = roasPoints.length >= 2;
  const displayEvents = [...operationLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const EVENT_COLORS: Record<string, string> = {
    roas_target: '#10b981',
    budget: '#3b82f6',
    quick_boost: '#f59e0b',
    campaign_created: '#10b981',
    other: '#64748b',
  };

  const eventsByDate: Record<string, OperationLogEntry[]> = {};
  for (const ev of sortedEvents) {
    const dateKey = ev.timestamp.slice(0, 10);
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(ev);
  }

  const dateMarkers = Object.entries(eventsByDate).map(([dateKey, evts]) => {
    const color = evts.length === 1
      ? (EVENT_COLORS[evts[0].field] || EVENT_COLORS.other)
      : '#10b981';
    const fullDate = evts[0].timestamp;
    const fields = evts.map(e => e.field);
    return { dateKey, fullDate, color, fields, events: evts };
  });

  const presentTypes = new Set(sortedEvents.map(e => e.field));
  const LEGEND_MAP: Record<string, { label: string; dotColor: string }> = {
    roas_target: { label: 'ROAS', dotColor: 'bg-success' },
    budget: { label: 'Orçamento', dotColor: 'bg-primary dark:bg-blue-500' },
    quick_boost: { label: 'Boost', dotColor: 'bg-warning' },
    campaign_created: { label: 'Campanha', dotColor: 'bg-success' },
    other: { label: 'Outro', dotColor: 'bg-muted-foreground' },
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg">
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-success" /> Histórico de Performance
        </p>
      </div>

      {showChart && (
        <>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorRoas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="fullDate"
                  tick={{ fontSize: 10, fill: 'hsl(var(--text-3))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(ts: string) => {
                    const d = new Date(ts);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-3))' }} tickLine={false} axisLine={false} width={30} domain={['auto', 'auto']} />
                <ReTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  labelFormatter={(ts: string) => {
                    const d = new Date(ts);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  }}
                  formatter={(v: number | null) => [v !== null ? `${v}` : '–', 'ROAS meta']}
                />
                {roasEmpate && roasEmpate > 0 && roasEmpate !== Infinity && (
                  <ReferenceLine y={roasEmpate} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Empate', fontSize: 9, fill: '#f59e0b' }} />
                )}
                {dateMarkers.map((m, i) => (
                  <ReferenceLine
                    key={`evt-${i}`}
                    x={m.fullDate}
                    stroke={m.color}
                    strokeWidth={0.5}
                    strokeOpacity={0.3}
                  />
                ))}
                <Area type="monotone" dataKey="roas" stroke="#10b981" strokeWidth={2} fill="url(#colorRoas)" fillOpacity={1} dot={{ r: 3, fill: '#10b981' }} connectNulls />
                <Customized component={(props: any) => {
                  const { xAxisMap } = props;
                  const xAxis = xAxisMap && Object.values(xAxisMap)[0] as any;
                  if (!xAxis || !xAxis.scale) return null;
                  const yTop = 4;
                  return (
                    <g>
                      {dateMarkers.map((m, i) => {
                        const xPx = xAxis.scale(m.fullDate);
                        if (xPx === undefined || isNaN(xPx)) return null;
                        const priorityOrder: string[] = ['roas_target', 'budget', 'quick_boost', 'campaign_created', 'other'];
                        const sortedFields = [...m.fields].sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
                        const iconsToShow = sortedFields.slice(0, 2);
                        return (
                          <g key={`icon-${i}`}>
                            {iconsToShow.map((field, fi) => {
                              const fillColor = EVENT_COLORS[field] || EVENT_COLORS.other;
                              const yPos = yTop + fi * 14;
                              return (
                                <g key={`ic-${i}-${fi}`} transform={`translate(${xPx - 6}, ${yPos})`}>
                                  <rect x={-1} y={-1} width={14} height={14} rx={3} fill="hsl(var(--card))" opacity={0.9} />
                                  {field === 'roas_target' && (
                                    <g stroke={fillColor} strokeWidth={1.5} fill="none">
                                      <circle cx={6} cy={6} r={5} />
                                      <circle cx={6} cy={6} r={2.5} />
                                      <circle cx={6} cy={6} r={0.5} fill={fillColor} />
                                    </g>
                                  )}
                                  {field === 'budget' && (
                                    <g><text x={6} y={10} textAnchor="middle" fontSize={10} fontWeight={700} fill={fillColor} stroke="none">$</text></g>
                                  )}
                                  {field === 'quick_boost' && (
                                    <g fill={fillColor}><polygon points="7,0 4,6 6.5,6 5,12 9,5 6.5,5 7,0" /></g>
                                  )}
                                  {field === 'campaign_created' && (
                                    <g stroke={fillColor} strokeWidth={1.8} fill="none">
                                      <line x1={6} y1={2} x2={6} y2={10} />
                                      <line x1={2} y1={6} x2={10} y2={6} />
                                    </g>
                                  )}
                                  {field === 'other' && (
                                    <g stroke={fillColor} strokeWidth={1.5} fill="none"><circle cx={6} cy={6} r={4} /></g>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}
                    </g>
                  );
                }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from(presentTypes).map(t => {
              const fi = FIELD_ICONS[t] || FIELD_ICONS.other;
              const IconComp = fi.icon;
              const leg = LEGEND_MAP[t] || LEGEND_MAP.other;
              return (
                <div key={t} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', leg.dotColor)} />
                  <span className="text-[10px] text-text-3">{leg.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-warning" /> Impacto das Mudanças ({displayEvents.length})
      </p>
      <div className="space-y-1.5 md:space-y-2.5 max-h-[250px] md:max-h-[420px] overflow-y-auto pr-1">
        {displayEvents.map((entry, i) => {
          const typeStyles: Record<string, string> = {
            roas_target: 'border-emerald-500/50 bg-emerald-500/[0.06]',
            budget: 'border-blue-500/50 bg-blue-500/[0.06]',
            quick_boost: 'border-amber-500/50 bg-amber-500/[0.06]',
            campaign_created: 'border-emerald-500/50 bg-emerald-500/[0.06]',
            other: 'border-border bg-surface-2/30',
          };
          const typeStyle = typeStyles[entry.field] || typeStyles.other;
          const typeLabelMap: Record<string, { label: string; color: string }> = {
            roas_target: { label: 'META', color: 'bg-emerald-500/20 text-emerald-400' },
            budget: { label: 'BUDGET', color: 'bg-blue-500/20 text-blue-400' },
            quick_boost: { label: 'BOOST', color: 'bg-amber-500/20 text-amber-400' },
            campaign_created: { label: 'NOVO', color: 'bg-emerald-500/20 text-emerald-400' },
            other: { label: 'OUTRO', color: 'bg-muted/50 text-text-3' },
          };
          const typeLabel = typeLabelMap[entry.field] || typeLabelMap.other;
          const impDelta = (entry as any).impressionsDelta as string | undefined;
          const salesDelta = (entry as any).salesValue as string | undefined;
          const observation = getObservation(entry);

          const obsIsPositive = observation ? (observation.startsWith('📈') || observation.startsWith('💰') || observation.startsWith('🆕')) : false;
          const obsColor = obsIsPositive ? 'text-emerald-400' : 'text-amber-400';

          return (
            <div key={i} className={cn('rounded-lg md:rounded-xl border px-2.5 py-2 md:px-4 md:py-3.5 transition-colors', typeStyle)}>
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 min-w-0 space-y-1 md:space-y-1.5">
                  <div className="flex items-center gap-2 md:gap-2.5">
                    <span className={cn('text-[9px] md:text-[10px] font-extrabold uppercase px-2 py-0.5 md:px-2.5 md:py-1 rounded-md tracking-wide', typeLabel.color)}>
                      {typeLabel.label}
                    </span>
                    <span className="text-[11px] md:text-[12px] text-text-3 font-mono">{formatLogDate(entry.timestamp)}</span>
                  </div>
                  <p className="text-sm md:text-lg text-foreground font-bold leading-snug">{formatLogLabel(entry)}</p>
                  {entry.field === 'campaign_created' && entry.details && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {parseCampaignDetails(entry.details).map((pill, pi) => (
                        <span key={pi} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-2 text-text-2">{pill}</span>
                      ))}
                    </div>
                  )}
                  {observation && (
                    <p className={cn('text-[11px] md:text-[12px] leading-snug', obsColor)}>{observation}</p>
                  )}
                </div>
                {(impDelta !== undefined || salesDelta !== undefined) && (
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-1 text-right">
                    {impDelta !== undefined && (
                      <div>
                        <span className={cn('text-sm font-bold font-mono tabular-nums', String(impDelta).startsWith('-') ? 'text-destructive' : 'text-emerald-400')}>
                          {impDelta}
                        </span>
                        <p className="text-[9px] text-text-3 uppercase mt-0.5">impressões</p>
                      </div>
                    )}
                    {salesDelta !== undefined && (
                      <div>
                        <span className={cn('text-sm font-bold font-mono tabular-nums', String(salesDelta).startsWith('-') ? 'text-destructive' : 'text-emerald-400')}>
                          {salesDelta}
                        </span>
                        <p className="text-[9px] text-text-3 uppercase mt-0.5">vendas</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ Small helper components ═══

function KpiCard({ label, value, sub, subColor, icon: Icon, highlight, colorClass }: { label: string; value: string; sub?: string; subColor?: string; icon: React.ElementType; highlight?: boolean; colorClass?: { text: string; bg: string; border: string } }) {
  if (colorClass) {
    return (
      <div className={cn('p-1.5 md:p-3 text-center rounded-xl border', colorClass.bg, colorClass.border)}>
        <p className={cn('text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-0.5', colorClass.text)}>
          <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
          {label}
        </p>
        <p className={cn('text-base md:text-2xl font-black mt-0.5 font-mono tabular-nums', colorClass.text)}>{value}</p>
        {sub && <p className={cn('text-[10px] md:text-[11px] font-medium mt-0.5 truncate', subColor || colorClass.text)}>{sub}</p>}
      </div>
    );
  }
  if (highlight) {
    return (
      <div className="p-1.5 md:p-3 text-center rounded-xl bg-success/10 dark:bg-success/20 border-2 border-success/50">
        <p className="text-[8px] md:text-[9px] font-bold text-success uppercase tracking-wider flex items-center justify-center gap-0.5">
          <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
          {label}
        </p>
        <p className="text-base md:text-2xl font-black mt-0.5 font-mono tabular-nums text-success">{value}</p>
        {sub && <p className={cn('text-[10px] md:text-[11px] font-medium mt-0.5 truncate', subColor || 'text-text-2')}>{sub}</p>}
      </div>
    );
  }
  return (
    <div className="p-1.5 md:p-3 text-center rounded-xl bg-surface-2 border border-border">
      <p className="text-[8px] md:text-[9px] font-bold text-text-3 uppercase tracking-wider flex items-center justify-center gap-0.5">
        <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
        {label}
      </p>
      <p className="text-sm md:text-lg font-bold mt-0.5 font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className={cn('text-[10px] md:text-[11px] font-medium mt-0.5 truncate', subColor || 'text-text-2')}>{sub}</p>}
    </div>
  );
}

// ═══ Import File Column (Como obter?) ═══

function ImportFileColumn({ title, subtitle, imported, onImport, steps }: {
  title: string; subtitle: string; imported: boolean;
  onImport: () => void; steps: React.ReactNode[];
}) {
  const [open, setOpen] = useState(!imported);
  return (
    <div className={cn(
      'rounded-lg border p-2 flex flex-col gap-1',
      imported ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
    )}>
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-xs font-bold text-foreground leading-tight">{title}</p>
          <p className="text-[11px] text-text-3">{subtitle}</p>
        </div>
        {imported ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/20 text-success whitespace-nowrap">Importado</span>
        ) : (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning whitespace-nowrap">Pendente</span>
        )}
      </div>

      {/* Como obter? toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5 w-fit"
      >
        <Info className="w-3 h-3" />
        <span>Como obter</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="rounded-md border border-border/50 bg-background/50 p-2 mt-0.5">
          <p className="text-[9px] uppercase tracking-wider text-text-3 font-bold mb-1">Onde baixar na Shopee</p>
          <ol className="space-y-0.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground mt-px">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!imported && (
        <Button onClick={onImport} size="sm" variant="outline" className="mt-auto h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 w-full">
          <Plus className="w-3 h-3" /> Importar arquivo
        </Button>
      )}
    </div>
  );
}

// ═══ Main Component ═══

export function AdsDetailFullView({ ad, allAds, onClose, onNavigate, onImportPosition, onLink, onQuickRegister, onReimport, onUnlink, onChangeLink, onRefreshProduct, onMetricsImported }: Props) {
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const config = currentStore?.config;
  const [excelData, setExcelData] = useState<ExcelPerformanceData | null>(null);
  const [opLog, setOpLog] = useState<OperationLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const opLogImportTriggerRef = useRef<(() => void) | null>(null);

  const [editingCosts, setEditingCosts] = useState(false);
  const [costFormCost, setCostFormCost] = useState(0);
  const [savingCosts, setSavingCosts] = useState(false);
  const { updateProduct } = useStore();

  // Reset internal state when navigating between products
  useEffect(() => {
    setExcelData(null);
    setOpLog([]);
    setEditingCosts(false);
    if (ad.product) {
      setCostFormCost(ad.product.costPrice || 0);
    }
  }, [ad.id]);

  const isApiCampaign = ad.id.startsWith('api-campaign-');
  const itemId = ad.shopee_product_id ? Number(ad.shopee_product_id) : null;

  const handleRefreshProduct = async () => {
    if (!onRefreshProduct || !itemId) return;
    setRefreshing(true);
    try { await onRefreshProduct(itemId); } finally { setRefreshing(false); }
  };

  const roasDireto = ad.roas_direto && ad.roas_direto > 0 ? ad.roas_direto : ad.roas;
  const product = ad.product;

  // ═══ Calculations ═══
  const empateResult = useMemo(() => {
    if (!product || !config) return null;
    return calcularRoasEmpate(product, config);
  }, [product, config]);

  const roasEmpate = empateResult?.roasEmpate ?? (ad.roas_empate || null);
  const margemContrib = empateResult?.margemContribuicao ?? (ad.margem_contribuicao || null);

  const classification = useMemo(() => {
    if (roasEmpate && roasEmpate !== Infinity) {
      return classificarAnuncio(roasDireto, roasEmpate);
    }
    if (ad.classificacao) {
      const fallbackMap: Record<string, { cor: string; mensagem: string; acao: string }> = {
        'LUCRATIVO': { cor: 'emerald-500', mensagem: 'Anúncio lucrativo com base na classificação importada.', acao: 'Manter' },
        'MARGEM_APERTADA': { cor: 'amber-500', mensagem: 'Margem apertada — monitore de perto.', acao: 'Otimizar' },
        'ABAIXO_EMPATE': { cor: 'orange-500', mensagem: 'ROAS abaixo do empate — considere ajustes.', acao: 'Ajustar' },
        'PREJUIZO': { cor: 'red-500', mensagem: 'Anúncio em prejuízo — avalie pausar.', acao: 'Pausar' },
      };
      const info = fallbackMap[ad.classificacao];
      if (info) return { classificacao: ad.classificacao as Classificacao, ...info };
    }
    return null;
  }, [roasDireto, roasEmpate, ad.classificacao]);

  const metaRoas = useMemo(() => {
    if (!roasEmpate || roasEmpate === Infinity) return null;
    return sugerirMetaRoas(roasEmpate);
  }, [roasEmpate]);

  const posInfo = useMemo(() => {
    if (ad.posicao_media === null) return null;
    return classificarPosicao(ad.posicao_media);
  }, [ad.posicao_media]);

  const diagnostico = useMemo(() => {
    if (ad.posicao_media === null || !roasEmpate || roasEmpate === Infinity) return null;
    return getDiagnostico(ad.posicao_media, roasDireto, roasEmpate);
  }, [ad.posicao_media, roasDireto, roasEmpate]);

  const crossSell = useMemo(() => detectarCrossSell(ad.roas, ad.roas_direto), [ad.roas, ad.roas_direto]);

  const efficiency = useMemo(() =>
    calcAdEfficiencyScore(roasDireto, roasEmpate, ad.ctr, ad.taxa_conversao, ad.posicao_media),
    [roasDireto, roasEmpate, ad.ctr, ad.taxa_conversao, ad.posicao_media]
  );

  const halo = useMemo(() =>
    calcHaloEffect(ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos || 0),
    [ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos]
  );

  const costMarginAlert = useMemo(() => {
    const lucro = empateResult?.lucroPorUnidade;
    if (!lucro || lucro <= 0) return null;
    return calcCostVsMarginAlert(ad.despesas, ad.itens_vendidos, lucro);
  }, [ad.despesas, ad.itens_vendidos, empateResult]);

  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;

  const custoPorPedido = ad.conversoes > 0 ? ad.despesas / ad.conversoes : 0;
  const custoPorUnidade = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;
  const sobraPorVenda = empateResult ? empateResult.lucroPorUnidade - custoPorUnidade : null;
  const lucroTotalPeriodo = sobraPorVenda !== null ? sobraPorVenda * ad.itens_vendidos : null;
  const pctConsumo = empateResult && empateResult.lucroPorUnidade > 0 ? (custoPorUnidade / empateResult.lucroPorUnidade) * 100 : null;

  const acosDireto = ad.acos_direto || ad.acos;
  const folgaAcosMargem = margemContrib !== null ? margemContrib - acosDireto : null;

  const custoConversao = ad.custo_por_conversao || custoPorPedido;
  const orcamentoProtecao = custoConversao * 5;
  const orcamentoMinimo = custoConversao * 3;
  const convPorDia = dias > 0 ? (ad.conversoes || 0) / dias : 0;
  const qualificaProtecao = convPorDia >= 5;

  const isMetaRoas = ad.metodo_lance?.toLowerCase().includes('meta de roas') || ad.metodo_lance?.toLowerCase().includes('target roas');
  const isAutomatic = ad.metodo_lance?.toLowerCase().includes('automático') || ad.metodo_lance?.toLowerCase().includes('automatic');

  const periodLabel = (() => {
    const f = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)} (${dias} dias)`;
  })();

  const { user } = useAuth();

  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const validation = validateExcelFile(file);
      if (!validation.valid) { toast.error(validation.error!); return; }
      const buffer = await file.arrayBuffer();

      let parsed: ExcelPerformanceData | null = null;
      let isSkuFormat = false;

      // Try primary parser (daily performance format)
      try {
        parsed = parseShopeeExcel(buffer);
      } catch {
        // Fallback: try parentskudetail format
        try {
          const { products, period_start, period_end } = await parseProductPerformanceExcel(file);
          if (products.length > 0) {
            isSkuFormat = true;
            // Convert to ExcelPerformanceData with per-product daily entries
            const startISO = `${period_start.slice(0,4)}-${period_start.slice(4,6)}-${period_start.slice(6,8)}`;
            const endISO = `${period_end.slice(0,4)}-${period_end.slice(4,6)}-${period_end.slice(6,8)}`;

            const dadosDiarios = products.map(p => ({
              data: startISO,
              dataLabel: p.nome || p.item_id,
              impressoes: p.impressoes,
              cliques: p.cliques,
              ctr: p.ctr,
              compradores: p.compradores_pagos,
              unidades: p.unidades_pagas,
              vendasBrl: p.vendas_pago,
            }));

            const totals = products.reduce((acc, p) => ({
              impressoes: acc.impressoes + p.impressoes,
              vendasBrl: acc.vendasBrl + p.vendas_pago,
              compradores: acc.compradores + p.compradores_pagos,
            }), { impressoes: 0, vendasBrl: 0, compradores: 0 });

            parsed = {
              dataRange: { inicio: startISO, fim: endISO },
              dadosDiarios,
              totalDias: products.length,
              dataPrimeiraVenda: startISO,
              totais: totals,
              fontes: [],
              produtoNome: products[0]?.nome || '',
              shopeeProductId: products[0]?.item_id || '',
            };
          }
        } catch (fallbackErr) {
          console.error('Fallback Excel parser failed:', fallbackErr);
        }
      }

      if (!parsed) {
        toast.error('Formato de Excel não reconhecido. Use "Performance do Produto" ou "parentskudetail".');
        return;
      }

      setExcelData(parsed);
      if (isSkuFormat) {
        toast.success('Produtos importados (formato SKU — sem breakdown diário)');
      } else {
        toast.success(`${parsed.totalDias} dias importados`);
      }

      // Persist Excel data to database
      const productIdForSave = ad.product_id || null;
      const shopeeIdForSave = ad.shopee_product_id || null;
      if (user && (productIdForSave || shopeeIdForSave)) {
        const savePayload = {
          excel_daily_data: parsed.dadosDiarios as any,
          excel_summary: {
            totalDias: parsed.totalDias,
            totalImpressions: parsed.totais.impressoes,
            totalOrders: parsed.totais.compradores,
            totalGmv: parsed.totais.vendasBrl,
            dataPrimeiraVenda: parsed.dataPrimeiraVenda,
            fontes: parsed.fontes,
            importedAt: new Date().toISOString(),
          } as any,
        };
        let updateQuery = supabase
          .from('product_ads_metrics')
          .update(savePayload)
          .eq('user_id', user.id);
        if (productIdForSave) {
          updateQuery = updateQuery.eq('product_id', productIdForSave);
        } else if (shopeeIdForSave) {
          updateQuery = updateQuery.eq('shopee_product_id', shopeeIdForSave);
        }
        const { error: saveError } = await updateQuery;
        if (saveError) {
          console.error('Erro ao salvar Excel (update):', saveError.message);
        }
        const checkQuery = supabase.from('product_ads_metrics').select('id').eq('user_id', user.id);
        const checkResult = productIdForSave
          ? await checkQuery.eq('product_id', productIdForSave).limit(1)
          : await checkQuery.eq('shopee_product_id', shopeeIdForSave!).limit(1);
        if (!checkResult.data || checkResult.data.length === 0) {
          const today = new Date().toISOString().slice(0, 10);
          const { error: insertError } = await supabase.from('product_ads_metrics').insert({
            user_id: user.id,
            product_id: productIdForSave,
            shopee_product_id: shopeeIdForSave,
            period_start: today,
            period_end: today,
            ...savePayload,
          } as any);
          if (insertError) {
            console.error('Erro ao salvar Excel (insert):', insertError.message);
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao processar arquivo');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  }, [user, ad.product_id, ad.shopee_product_id]);

  const effBarColor = efficiency.score >= 80 ? 'bg-success' : efficiency.score >= 60 ? 'bg-success/80' : efficiency.score >= 40 ? 'bg-warning' : 'bg-destructive';

  const currentIndex = allAds.findIndex(a => a.id === ad.id);
  const prevAd = currentIndex > 0 ? allAds[currentIndex - 1] : null;
  const nextAd = currentIndex < allAds.length - 1 ? allAds[currentIndex + 1] : null;

  const statusColorClass = classification
    ? classification.classificacao === 'LUCRATIVO' ? 'text-success'
    : classification.classificacao === 'MARGEM_APERTADA' ? 'text-warning'
    : classification.classificacao === 'ABAIXO_EMPATE' ? 'text-warning'
    : 'text-destructive'
    : 'text-text-3';

  const statusBgClass = classification
    ? classification.classificacao === 'LUCRATIVO' ? 'bg-success'
    : classification.classificacao === 'MARGEM_APERTADA' ? 'bg-warning'
    : classification.classificacao === 'ABAIXO_EMPATE' ? 'bg-warning'
    : 'bg-destructive'
    : 'bg-muted-foreground';

  // Selected meta state
  const [selectedMeta, setSelectedMeta] = useState<'agressivo' | 'equilibrado' | 'conservador'>('equilibrado');

  // ═══ Render ═══

  // Load saved Excel data from database
  useEffect(() => {
    if (!user || excelData) return;
    const loadExcel = async () => {
      let query = supabase
        .from('product_ads_metrics')
        .select('excel_daily_data, excel_summary')
        .eq('user_id', user.id);
      if (ad.product_id) {
        query = query.eq('product_id', ad.product_id);
      } else if (ad.shopee_product_id) {
        query = query.eq('shopee_product_id', ad.shopee_product_id);
      } else {
        return;
      }
      const { data } = await query.order('imported_at', { ascending: false }).limit(1) as any;
      if (data && data.length > 0 && data[0].excel_daily_data) {
        const saved = data[0];
        const summary = saved.excel_summary || {};
        setExcelData({
          dataRange: { inicio: '', fim: '' },
          dadosDiarios: saved.excel_daily_data,
          totalDias: summary.totalDias || 0,
          dataPrimeiraVenda: summary.dataPrimeiraVenda || null,
          totais: {
            impressoes: summary.totalImpressions || 0,
            vendasBrl: summary.totalGmv || 0,
            compradores: summary.totalOrders || 0,
          },
          fontes: summary.fontes || [],
          produtoNome: ad.nome_produto_csv,
          shopeeProductId: ad.shopee_product_id || '',
        });
      }
    };
    loadExcel();
  }, [user, ad.product_id, ad.shopee_product_id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [ad]);

  return (
    <div className="animate-fade-in px-1 md:px-0 bg-background min-h-screen -mx-1 md:-mx-0 pb-10 -mt-2 md:mt-0">
      {/* Breadcrumb / Header */}
      <div className="flex items-center gap-3 mb-1 flex-wrap px-1">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-sm font-bold text-text-2 hover:text-foreground hover:bg-surface-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <div className="flex items-center gap-1.5 ml-auto md:ml-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-text-3 hover:bg-surface-2" disabled={!prevAd} onClick={() => prevAd && onNavigate(prevAd)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-text-3 font-mono tabular-nums">{currentIndex + 1}/{allAds.length}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-text-3 hover:bg-surface-2" disabled={!nextAd} onClick={() => nextAd && onNavigate(nextAd)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Product Header Card with glow */}
      <div className="rounded-2xl border border-border bg-card p-3 md:p-4 shadow-lg mb-1.5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-success/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative flex items-center gap-3">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-border" />
          ) : (
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 bg-surface-2">
              <Package className="w-6 h-6 text-text-3" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-foreground leading-tight line-clamp-2">{ad.nome_produto_csv}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {ad.status_anuncio && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success/10 dark:bg-success/30 border border-success/50 text-success">
                  {ad.status_anuncio}
                </span>
              )}
              {ad.shopee_product_id && (
                <span className="text-[10px] text-text-3 font-mono">ID: {ad.shopee_product_id}</span>
              )}
              {emAprendizado && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/10 dark:bg-warning/30 border border-warning/30 text-warning flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Aprendizado
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-success font-mono tabular-nums hidden md:block">{periodLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3 relative">
          {isApiCampaign && onRefreshProduct && itemId && (
            <Button onClick={handleRefreshProduct} disabled={refreshing} variant="outline" size="sm" className="gap-1 text-xs font-bold h-8 border-primary/30 text-primary hover:bg-primary/10">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </Button>
          )}
          {onReimport && (
            <Button onClick={onReimport} variant="outline" size="sm" className="gap-1 text-xs font-bold h-8 border-border text-text-2 hover:bg-surface-2">
              <Upload className="w-3.5 h-3.5" /> CSV
            </Button>
          )}
          {product && onChangeLink && (
            <Button onClick={onChangeLink} variant="outline" size="sm" className="gap-1 text-xs font-bold h-8 border-border text-text-2 hover:bg-surface-2">
              <Link2 className="w-3.5 h-3.5" /> Trocar
            </Button>
          )}
          {product && onUnlink && (
            <Button onClick={onUnlink} variant="ghost" size="sm" className="gap-1 text-xs font-bold h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
              Desvincular
            </Button>
          )}
          {ad.metodo_lance && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-surface-2 border border-border text-text-2 ml-auto">
              {ad.metodo_lance}
            </span>
          )}
        </div>
        {/* mobile period */}
        <span className="text-[11px] text-success font-mono tabular-nums md:hidden block mt-2">{periodLabel}</span>
      </div>

      {/* API campaign info banner */}
      {ad.id.startsWith('api-campaign-') && ad.despesas === 0 && ad.impressoes === 0 && (
        <div className="rounded-xl border border-border bg-muted/50 p-4 mb-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Dados individuais indisponíveis</p>
            <p className="text-xs text-muted-foreground mt-1">
              A API da Shopee não retornou métricas detalhadas para esta campanha no período.
              Os dados agregados da loja (gasto total, ROAS geral) estão disponíveis no painel principal.
            </p>
          </div>
        </div>
      )}

      {/* KPIs grid — Row 1: Posição, ROAS, Custo/Un */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-1.5 overflow-hidden">
        {(() => {
          const pos = ad.posicao_media;
          if (pos !== null) {
            const isTop = pos <= 8;
            const isMid = pos > 8 && pos <= 20;
            const pageLabel = pos <= 3 ? 'Top 3' : pos <= 8 ? '1ª Página' : pos <= 20 ? '2ª Página' : '3ª Página+';
            const posColorClass = {
              text: isTop ? 'text-success' : isMid ? 'text-warning' : 'text-destructive',
              bg: isTop ? 'bg-success/5' : isMid ? 'bg-warning/5' : 'bg-destructive/5',
              border: isTop ? 'border-success/25' : isMid ? 'border-warning/25' : 'border-destructive/25',
            };
            return <KpiCard icon={MapPin} label="Posição" value={`#${pos}`} sub={pageLabel} colorClass={posColorClass} />;
          }
          return <KpiCard icon={MapPin} label="Posição" value="—" />;
        })()}
        <KpiCard icon={Target} label="ROAS" value={roasDireto.toFixed(2)} sub={roasEmpate ? `Emp: ${roasEmpate.toFixed(2)}` : undefined} subColor={roasEmpate ? (roasDireto >= roasEmpate ? 'text-success' : 'text-destructive') : undefined} highlight />
        <KpiCard icon={Wallet} label="Custo/Un" value={custoPorUnidade > 0 ? fmtShort(custoPorUnidade) : '—'} sub={sobraPorVenda !== null ? `Sobra: ${fmtShort(sobraPorVenda)}` : undefined} subColor={sobraPorVenda !== null ? (sobraPorVenda > 0 ? 'text-success' : 'text-destructive') : undefined} />
      </div>

      {/* KPIs grid — Row 2: CTR, Vendas, GMV */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-3 overflow-hidden">
        <KpiCard icon={Percent} label="CTR" value={`${ad.ctr.toFixed(2)}%`} sub={ad.ctr >= 2.5 ? 'Bom' : ad.ctr >= 1.5 ? 'Ok' : 'Baixo'} subColor={ad.ctr >= 2.5 ? 'text-success' : ad.ctr >= 1.5 ? 'text-warning' : 'text-destructive'} />
        <KpiCard icon={ShoppingCart} label="Vendas" value={ad.itens_vendidos >= 1000 ? `${(ad.itens_vendidos / 1000).toFixed(1)}k` : String(ad.itens_vendidos)} />
        <KpiCard icon={DollarSign} label="GMV" value={fmtShort(ad.gmv)} />
      </div>

      {/* Unlinked product warning — hide for API campaigns */}
      {!product && !ad.id.startsWith('api-campaign-') && (
        <div className="rounded-2xl border-2 border-dashed border-warning/30 bg-warning/10 p-6 space-y-4 mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-base font-extrabold text-warning">PRODUTO NÃO VINCULADO</span>
          </div>
          <p className="text-sm text-text-2">Vincule a um produto cadastrado para:</p>
          <ul className="text-sm text-text-2 space-y-1.5 ml-1">
            <li>• Calcular ROAS Empate</li>
            <li>• Ver se é lucrativo</li>
            <li>• Receber meta ROAS ideal</li>
            <li>• Score de eficiência completo</li>
          </ul>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onLink} variant="outline" className="gap-1.5 text-sm font-bold w-full border-border text-text-2 hover:bg-surface-2">
              <Link2 className="w-4 h-4" /> Vincular Produto
            </Button>
            <Button onClick={onQuickRegister} className="gap-1.5 text-sm font-bold w-full bg-success hover:bg-success/90 text-success-foreground">
              <Plus className="w-4 h-4" /> Cadastro Rápido
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="diagnostico" className="w-full">
        <TabsList className="w-full h-11 bg-secondary/80 border border-border rounded-xl p-1 mb-4">
          <TabsTrigger
            value="diagnostico"
            className="flex-1 h-9 rounded-lg text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70"
          >
            <Target className="w-3.5 h-3.5" />
            IA &amp; Ação
          </TabsTrigger>
          <TabsTrigger
            value="metricas"
            className="flex-1 h-9 rounded-lg text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Performance Ads
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Diagnóstico & Ação ═══ */}
        <TabsContent value="diagnostico">
          <div className="space-y-4">

            {/* Linha 1: ROAS Status + Diagnóstico IA */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* ROAS Status (col-span-2) */}
              <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Status: ROAS Real vs Empate</p>

                {classification && roasEmpate ? (
                  <>
                    {/* Gradient bar */}
                    <div className="space-y-2">
                      <div className="relative w-full h-4 rounded-full bg-surface-2 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-warning via-success/80 to-success rounded-full" />
                        {/* Actual ROAS position indicator */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background border-2 border-success shadow-lg z-10"
                          style={{ left: `${Math.min(Math.max((roasDireto / (roasEmpate * 3)) * 100, 2), 98)}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                        />
                        {/* Empate marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-text-2 z-[5]"
                          style={{ left: `${Math.min((roasEmpate / (roasEmpate * 3)) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-text-3">
                        <span>Prejuízo</span>
                        <span>Lucro Excelente</span>
                      </div>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase font-bold">ROAS Atual</p>
                        <p className={cn('text-2xl font-black font-mono tabular-nums', statusColorClass)}>{roasDireto.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase font-bold">Empate</p>
                        <p className="text-2xl font-black font-mono tabular-nums text-text-2">{roasEmpate.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase font-bold">Margem Seg.</p>
                        <p className={cn('text-2xl font-black font-mono tabular-nums', roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                          {roasDireto >= roasEmpate ? '+' : ''}{(((roasDireto / roasEmpate) - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className={cn('rounded-xl p-3 text-sm', classification.classificacao === 'LUCRATIVO' ? 'bg-success/10 dark:bg-success/20 text-success' : classification.classificacao === 'PREJUIZO' ? 'bg-destructive/10 dark:bg-destructive/20 text-destructive' : 'bg-warning/10 dark:bg-warning/20 text-warning')}>
                      <p>{classification.mensagem}</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 py-4">
                    <p className="text-sm text-text-2">Dados insuficientes para classificação.</p>
                    {!product && (
                      <Button onClick={onLink} variant="outline" size="sm" className="gap-1.5 text-xs border-border text-text-2 hover:bg-surface-2">
                        <Link2 className="w-3.5 h-3.5" /> Vincular Produto
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Diagnóstico IA (col-span-1) */}
              <div className="md:col-span-1 rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 dark:from-success/20 to-card p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-success" />
                  <p className="text-[10px] uppercase tracking-wider font-bold text-success">Diagnóstico IA</p>
                </div>
                {diagnostico ? (
                  <>
                    <span className="text-3xl">{diagnostico.emoji}</span>
                    <p className="text-lg font-bold text-foreground">{diagnostico.titulo}</p>
                    <p className="text-sm text-text-2">{diagnostico.mensagem}</p>
                    <div className="pt-2 border-t border-success/20">
                      <p className="text-xs text-text-3">Ação recomendada</p>
                      <p className="text-success font-bold text-sm mt-0.5">{diagnostico.acaoRoas === 'pausar' ? '⏸ Pausar' : diagnostico.acaoRoas === 'agressivo' ? '🚀 Escalar' : diagnostico.acaoRoas === 'conservador' ? '🛡 Conservar' : '⚖️ Manter/Equilibrar'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-foreground">Score: {efficiency.score}/100</p>
                    <p className={cn('text-sm font-bold', efficiency.color === 'text-success' ? 'text-success' : efficiency.color === 'text-primary' ? 'text-primary dark:text-blue-400' : efficiency.color === 'text-warning' ? 'text-warning' : 'text-destructive')}>
                      {efficiency.label}
                    </p>
                    <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden mt-2">
                      <div className={cn('h-full rounded-full', effBarColor)} style={{ width: `${efficiency.score}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums mt-2">
                      <div className="flex justify-between text-text-3"><span>ROAS</span><span className="font-bold text-foreground">{efficiency.breakdown.roasScore}/40</span></div>
                      <div className="flex justify-between text-text-3"><span>CTR</span><span className="font-bold text-foreground">{efficiency.breakdown.ctrScore}/20</span></div>
                      <div className="flex justify-between text-text-3"><span>Conv</span><span className="font-bold text-foreground">{efficiency.breakdown.convScore}/20</span></div>
                      <div className="flex justify-between text-text-3"><span>Pos</span><span className="font-bold text-foreground">{efficiency.breakdown.posScore}/20</span></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Linha 2: Meta ROAS + Orçamento */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Meta de ROAS Sugerida */}
              {metaRoas ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Meta de ROAS Sugerida</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {([
                      { key: 'agressivo' as const, label: 'Agressivo', value: metaRoas.agressivo, sub: 'Máx. Volume' },
                      { key: 'equilibrado' as const, label: 'Equilibrado', value: metaRoas.equilibrado, sub: 'Recomendado' },
                      { key: 'conservador' as const, label: 'Conservador', value: metaRoas.conservador, sub: 'Máx. Margem' },
                    ]).map(m => (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMeta(m.key)}
                        className={cn(
                          'rounded-xl border p-4 text-center transition-all cursor-pointer',
                          selectedMeta === m.key
                            ? 'bg-success/10 dark:bg-success/20 border-success ring-1 ring-success'
                            : 'bg-surface-2 border-border hover:border-text-3'
                        )}
                      >
                        <p className={cn('text-[10px] font-bold uppercase', selectedMeta === m.key ? 'text-success' : 'text-text-3')}>{m.label}</p>
                        <p className="text-xl font-black font-mono tabular-nums text-foreground mt-1">{m.value}</p>
                        <p className="text-[10px] text-text-3 mt-0.5">{m.sub}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nunca abaixo de {roasEmpate?.toFixed(2)} (empate)
                  </p>
                  <p className="text-xs text-text-3 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Após alterar, aguarde 3-5 dias.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 mb-3">Meta de ROAS</p>
                  <p className="text-sm text-text-2">Vincule um produto para ver as metas sugeridas.</p>
                </div>
              )}

              {/* Orçamento Diário */}
              {custoConversao > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Orçamento Diário</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-text-3 uppercase font-bold">Atual</p>
                      <p className="text-2xl font-black font-mono tabular-nums text-foreground">{fmt(ad.despesas / (dias || 1))}</p>
                      <p className="text-[10px] text-text-3">/dia</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-3" />
                    <div className="text-center">
                      <p className="text-[10px] text-text-3 uppercase font-bold">Sugerido</p>
                      <p className="text-2xl font-black font-mono tabular-nums text-success">{fmt(orcamentoProtecao)}</p>
                      <p className="text-[10px] text-text-3">/dia</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-3 text-center">
                    Custo por conversão: <span className="text-foreground font-bold">{fmt(custoConversao)}</span>
                  </p>
                  <p className={cn('text-xs font-bold text-center', qualificaProtecao ? 'text-success' : 'text-warning')}>
                    {qualificaProtecao
                      ? `✅ Proteção ativa (${convPorDia.toFixed(1)} conv/dia)`
                      : `⚠️ Aumente para proteção (${convPorDia.toFixed(1)} conv/dia)`}
                  </p>
                  <Button className="w-full rounded-xl h-12 text-sm font-bold bg-success hover:bg-success/90 text-success-foreground">
                    Aplicar Sugestão na Shopee
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 mb-3">Orçamento Diário</p>
                  <p className="text-sm text-text-2">Dados insuficientes para sugestão de orçamento.</p>
                </div>
              )}
            </div>

            {/* Linha 3: ACOS vs Margem + Economia por Venda */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* ACOS vs Margem */}
              {margemContrib !== null ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">ACOS vs Margem de Contribuição</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-2">ACOS (Custo Ads)</span>
                        <span className="font-bold font-mono tabular-nums text-warning">{acosDireto.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${Math.min(acosDireto, 100)}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-2">Margem de Contribuição</span>
                        <span className="font-bold font-mono tabular-nums text-success">{margemContrib.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(margemContrib, 100)}%` }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-2">Lucro Líquido Final</span>
                        <span className={cn('font-extrabold font-mono tabular-nums text-lg', folgaAcosMargem !== null && folgaAcosMargem >= 0 ? 'text-success' : 'text-destructive')}>
                          {folgaAcosMargem !== null ? `${folgaAcosMargem >= 0 ? '+' : ''}${folgaAcosMargem.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 mb-3">ACOS vs Margem</p>
                  <p className="text-sm text-text-2">Vincule um produto para análise.</p>
                </div>
              )}

              {/* Economia por Venda — Two states */}
              {(() => {
                const hasCosts = product && product.costPrice > 0;
                const showEditMode = !hasCosts || editingCosts;
                const acosPerUnit = custoPorUnidade;

                // Use calcFullRoas to get Shopee fees from store config
                const activeCostPrice = showEditMode ? costFormCost : (product?.costPrice || 0);
                const salePrice = product?.salePrice && product.salePrice > 0
                  ? product.salePrice
                  : (ad.itens_vendidos > 0 ? ad.gmv / ad.itens_vendidos : ad.gmv);
                const salePriceEstimated = !(product?.salePrice && product.salePrice > 0);
                const roasCalc = config
                  ? calcFullRoas(salePrice, activeCostPrice, config, product?.packagingCost || 0)
                  : null;
                const taxaShopee = roasCalc?.costs.shopeeFee || 0;
                const lucroCalc = salePrice - activeCostPrice - taxaShopee - acosPerUnit;

                const handleSaveCosts = async () => {
                  if (!product) return;
                  setSavingCosts(true);
                  try {
                    await updateProduct(product.id, { costPrice: costFormCost });
                    setEditingCosts(false);
                    toast.success('Custo salvo no produto');
                  } catch {
                    toast.error('Erro ao salvar custo');
                  } finally {
                    setSavingCosts(false);
                  }
                };

                // Shared cost lines
                const costLines = (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-text-2">Preço de venda {salePriceEstimated && <span className="text-[11px] text-muted-foreground">(estimado)</span>}</span>
                      <span className="text-[13px] font-bold font-mono tabular-nums text-foreground">{fmt(salePrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-text-2">Custo do produto</span>
                      <span className="text-[13px] font-bold font-mono tabular-nums text-foreground">{fmt(activeCostPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-text-2">Taxas Shopee</span>
                      <span className="text-[13px] font-bold font-mono tabular-nums text-foreground">{fmt(taxaShopee)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px]" style={{ color: '#e85d00' }}>Gasto com ads (ACOS {ad.acos ? `${ad.acos.toFixed(1)}%` : ''})</span>
                      <span className="text-[13px] font-bold font-mono tabular-nums" style={{ color: '#e85d00' }}>− {fmt(acosPerUnit)}</span>
                    </div>
                  </div>
                );

                // Shared profit block
                const profitBlock = (label: string) => (
                  <div className="border-t border-border pt-3">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.06)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-text-2">{label}</span>
                        <span className={cn('text-base font-extrabold font-mono tabular-nums', lucroCalc >= 0 ? 'text-success' : 'text-destructive')}>
                          {lucroCalc >= 0 ? '+' : ''} {fmt(lucroCalc)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] mt-1.5 text-text-3">● Taxas calculadas pela Calculadora Shopee</p>
                  </div>
                );

                if (showEditMode) {
                  return (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Economia por Venda</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-text-3">Custo não informado</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] text-text-2">Custo do produto (R$)</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] text-text-3">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={costFormCost || ''}
                            onChange={e => setCostFormCost(parseFloat(e.target.value) || 0)}
                            className="w-[120px] text-right text-sm font-mono rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)' }}
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      {costLines}
                      {profitBlock('Lucro por venda estimado')}
                      <Button
                        onClick={handleSaveCosts}
                        disabled={savingCosts || !product || costFormCost <= 0}
                        className="w-full font-bold text-white"
                        style={{ background: '#e85d00' }}
                      >
                        {savingCosts ? 'Salvando...' : 'Salvar custo no produto'}
                      </Button>
                      <p className="text-[11px] text-center text-text-3">Esses dados serão salvos no cadastro do produto</p>
                    </div>
                  );
                }

                // Estado 1 — com custos cadastrados
                return (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Economia por Venda</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/20 text-success">Configurado</span>
                        <button onClick={() => { setCostFormCost(product!.costPrice); setEditingCosts(true); }} className="text-[11px] border border-border rounded px-2 py-0.5 text-text-2 hover:text-foreground">Editar</button>
                      </div>
                    </div>
                    {costLines}
                    {profitBlock('Lucro por venda')}
                    {lucroTotalPeriodo !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-2">{lucroTotalPeriodo >= 0 ? 'Lucro total período:' : 'Prejuízo total:'}</span>
                        <span className={cn('font-bold font-mono tabular-nums', lucroTotalPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{fmt(Math.abs(lucroTotalPeriodo))}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Halo Effect */}
            {halo && halo.isSignificant && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5 space-y-2 shadow-lg">
                <p className="text-[10px] uppercase tracking-wider font-bold text-success">💎 Efeito Halo — Vendas Indiretas</p>
                <p className="text-sm text-text-2">{halo.message}</p>
              </div>
            )}

            {/* Lance info */}
            {ad.metodo_lance && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Método de Lance</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-2">Tipo:</span>
                    <span className="font-bold text-foreground">{ad.metodo_lance}</span>
                  </div>
                  {ad.status_anuncio && (
                    <div className="flex justify-between">
                      <span className="text-text-2">Status:</span>
                      <span className="font-bold text-foreground">{ad.status_anuncio}</span>
                    </div>
                  )}
                  {isMetaRoas && (
                    <div className="flex justify-between">
                      <span className="text-text-2">Proteção:</span>
                      <span className={cn('font-bold', qualificaProtecao ? 'text-success' : 'text-warning')}>
                        {qualificaProtecao ? `✅ Ativa (${convPorDia.toFixed(1)} conv/dia)` : `⚠️ Inativa (${convPorDia.toFixed(1)} conv/dia)`}
                      </span>
                    </div>
                  )}
                  {isAutomatic && (
                    <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1.5">
                      <p className="text-xs text-text-2">• Sem meta de ROAS definida</p>
                      <p className="text-xs text-text-2">• Sem proteção</p>
                      {roasEmpate && (
                        <p className={cn('text-xs font-bold', roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                          {roasDireto >= roasEmpate
                            ? '💡 ROAS acima do empate. Migre para Meta de ROAS para ter controle.'
                            : '🔴 ROAS abaixo do empate e sem proteção. Pause ou migre para Meta de ROAS.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Métricas & Histórico ═══ */}
        <TabsContent value="metricas">
          <div className="space-y-4">
            {/* Dados Importados Card */}
            <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
              <p className="text-[9px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5 mb-2">
                <Upload className="w-3 h-3" /> Dados Importados
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* CSV de Ads */}
                <ImportFileColumn
                  title="CSV de Ads"
                  subtitle="Log de operações"
                  imported={opLog.length > 0}
                  onImport={() => opLogImportTriggerRef.current?.()}
                  steps={[
                    <>Central do Vendedor › <strong>Shopee Ads</strong></>,
                    <>Selecione o produto › defina o <strong>Período</strong></>,
                    <>Histórico da Operação › <strong>Exportar Dados</strong></>,
                  ]}
                />
                {/* CSV Individual */}
                <ImportFileColumn
                  title="CSV Individual"
                  subtitle="Posicionamento"
                  imported={ad.posicao_media !== null}
                  onImport={onImportPosition}
                  steps={[
                    <>Central do Vendedor › <strong>Shopee Ads</strong></>,
                    <>Selecione o produto › defina o <strong>Período</strong></>,
                    <>Clique em <strong>Exportar Dados</strong></>,
                  ]}
                />
                {/* Excel Analytics */}
                <ImportFileColumn
                  title="Excel Analytics"
                  subtitle="Performance diária"
                  imported={!!excelData}
                  onImport={() => excelInputRef.current?.click()}
                  steps={[
                    <>Informações Gerenciais › <strong>Produto</strong></>,
                    <>Performance do Produto › selecione o produto e o <strong>Período</strong></>,
                    <>Clique em <strong>Exportar Dados</strong></>,
                  ]}
                />
              </div>
              <p className="text-[9px] text-text-3 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3 text-primary" />
                Todos os arquivos são exportados diretamente da <strong className="mx-0.5">Central do Vendedor Shopee</strong>. Em breve: tutorial em vídeo mostrando o passo a passo.
              </p>
            </div>
            {/* Posicionamento + Geral vs Direto — TOPO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Posicionamento */}
              {ad.posicao_media !== null && posInfo ? (
                <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-lg relative overflow-hidden">
                  {/* Gradient top border accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
                  
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary dark:text-blue-400" /> Posicionamento
                    </p>
                    <span className="text-xl md:text-3xl font-black font-mono tabular-nums text-foreground">#{ad.posicao_media}</span>
                  </div>

                  {/* Content: 2 columns on md+, stacked on mobile */}
                  <div className="flex flex-col md:flex-row md:items-start gap-5">
                    {/* Left: Big number + tier label + bars */}
                    <div className="flex-1 min-w-0 space-y-4">
                      <div>
                        <span className="text-5xl md:text-7xl font-black font-mono tabular-nums leading-none text-foreground">
                          #{ad.posicao_media}
                        </span>
                        <p className={cn('text-lg md:text-2xl font-bold mt-1', ad.posicao_media <= 3 ? 'text-success' : ad.posicao_media <= 8 ? 'text-primary dark:text-blue-400' : ad.posicao_media <= 16 ? 'text-warning' : 'text-destructive')}>
                          {ad.posicao_media <= 3 ? 'Top 3' : ad.posicao_media <= 8 ? 'Primeira Página' : ad.posicao_media <= 16 ? 'Segunda Página' : 'Terceira Página+'}
                        </p>
                      </div>
                      {/* Horizontal tier bars */}
                      <div className="flex gap-1.5 items-end">
                        {[
                          { label: 'Top 3', range: [1, 3] },
                          { label: 'Página 1 (4-8)', range: [4, 8] },
                          { label: 'Página 2+ (9+)', range: [9, 99] },
                        ].map(tier => {
                          const isActive = ad.posicao_media! >= tier.range[0] && ad.posicao_media! <= tier.range[1];
                          return (
                            <div key={tier.label} className="flex-1 space-y-1 text-center">
                              <div className={cn('h-3 rounded-md transition-colors', isActive ? 'bg-primary dark:bg-blue-500' : 'bg-surface-2')} />
                              <p className={cn('text-[9px] leading-tight', isActive ? 'text-foreground font-bold' : 'text-text-3')}>
                                {tier.label}
                              </p>
                              {isActive && (
                                <span className="inline-block text-[9px] font-bold text-primary dark:text-blue-400 bg-primary/15 px-2 py-0.5 rounded-md whitespace-nowrap">← VOCÊ</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Right: Recommendation card */}
                    <div className="md:w-[200px] flex-shrink-0 space-y-2">
                      <div className="rounded-lg md:rounded-xl bg-surface-2/50 border border-border p-3 md:p-4 shadow-sm">
                        <p className="text-xs md:text-sm text-foreground leading-relaxed">
                          {ad.posicao_media > 8 ? (
                            <>
                              💡 <strong className="text-warning">Você está na 2ª página.</strong>{' '}
                              {ad.posicao_media > 16
                                ? 'Aumente o lance para subir para a 1ª página e melhorar o CTR significativamente.'
                                : 'Um aumento moderado no lance pode colocá-lo na 1ª página e melhorar o CTR significativamente.'}
                            </>
                          ) : ad.posicao_media <= 3 ? (
                            <>
                              🏆 <strong className="text-success">Excelente posição!</strong>{' '}
                              Monitore o custo — avalie se pode reduzir o lance sem perder a posição.
                            </>
                          ) : (
                            <>
                              💡 <strong className="text-primary dark:text-blue-400">Boa posição.</strong>{' '}
                              Monitore se o ROAS justifica o lance atual.
                            </>
                          )}
                        </p>
                      </div>
                      <p className="text-[9px] text-text-3 text-right">Posição importada via CSV individual</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 shadow-lg space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-3" /> Posicionamento
                  </p>
                  <p className="text-sm text-text-2">Posição disponível após importar o CSV Individual.</p>
                </div>
              )}

              {/* Geral vs Direto */}
              {ad.roas_direto > 0 && ad.gmv_direto > 0 && ad.gmv_direto !== ad.gmv ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Geral vs Direto</p>
                    <div className="group relative">
                      <Info className="w-3.5 h-3.5 text-text-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-card border border-border shadow-xl text-[11px] text-text-2 leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                        <strong className="text-foreground">Geral</strong> inclui vendas orgânicas atribuídas ao anúncio. <strong className="text-foreground">Direto</strong> são apenas vendas que vieram diretamente do clique no anúncio. O Δ mostra o impacto indireto (halo).
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm font-mono tabular-nums">
                      <thead>
                        <tr className="bg-surface-2">
                          <th className="text-left py-2 px-2 md:py-2.5 md:px-3 font-normal text-[9px] md:text-[10px] uppercase tracking-wider text-text-2">Métrica</th>
                          <th className="text-right py-2 px-2 md:py-2.5 md:px-3 font-normal text-[9px] md:text-[10px] uppercase tracking-wider text-text-2">Geral</th>
                          <th className="text-right py-2 px-2 md:py-2.5 md:px-3 font-normal text-[9px] md:text-[10px] uppercase tracking-wider text-text-2">Direto</th>
                          <th className="text-right py-2 px-2 md:py-2.5 md:px-3 font-normal text-[9px] md:text-[10px] uppercase tracking-wider text-text-2">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-text-2 font-bold">ROAS</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-foreground">{ad.roas.toFixed(2)}</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-success">{ad.roas_direto.toFixed(2)}</td>
                          <td className={cn('py-2 px-2 md:py-2.5 md:px-3 text-right font-bold', ad.roas - ad.roas_direto > 0 ? 'text-success' : 'text-destructive')}>
                            {(ad.roas - ad.roas_direto) > 0 ? '+' : ''}{(ad.roas - ad.roas_direto).toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-text-2 font-bold">ACOS</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-foreground">{ad.acos.toFixed(1)}%</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-foreground">{acosDireto.toFixed(1)}%</td>
                          <td className={cn('py-2 px-2 md:py-2.5 md:px-3 text-right font-bold', ad.acos - acosDireto < 0 ? 'text-success' : 'text-destructive')}>
                            {(ad.acos - acosDireto).toFixed(1)}%
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-text-2 font-bold">GMV</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-foreground">{fmt(ad.gmv)}</td>
                          <td className="py-2 px-2 md:py-2.5 md:px-3 text-right font-bold text-foreground">{fmt(ad.gmv_direto)}</td>
                          <td className={cn('py-2 px-2 md:py-2.5 md:px-3 text-right font-bold', ad.gmv - ad.gmv_direto > 0 ? 'text-success' : 'text-text-2')}>
                            +{fmt(ad.gmv - ad.gmv_direto)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {crossSell && (
                    <div className="flex items-start gap-2.5 pt-2 border-t border-border rounded-xl bg-primary/10 dark:bg-blue-900/10 p-3 mt-2">
                      <Info className="w-3.5 h-3.5 text-primary dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-2">{crossSell.mensagem}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 mb-3">Geral vs Direto</p>
                  <p className="text-sm text-text-2">Dados de ROAS direto não disponíveis para comparação.</p>
                </div>
              )}
            </div>

            {/* Histórico de Performance */}
            <OperationLogTimeline adProductId={ad.product_id} adShopeeProductId={ad.shopee_product_id} roasEmpate={roasEmpate} onLogLoaded={setOpLog} onMetricsImported={onMetricsImported} importTriggerRef={opLogImportTriggerRef} />

            {/* Excel Performance Analysis */}
            <input ref={excelInputRef} type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
            {!excelData ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-5 shadow-lg space-y-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Análise de Performance Diária
                </p>
                <p className="text-sm text-text-2">gráfico disponível após importar o Excel Analytics</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Análise de Performance ({excelData.totalDias} dias)</p>
                </div>
                <ExcelAnalysis data={excelData} operationLog={opLog.length > 0 ? opLog : undefined} />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
