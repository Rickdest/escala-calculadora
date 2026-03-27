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
  History, Settings, Sparkles, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { OperationLogEntry, detectAndParseCSV, validateCSVSecurity } from '@/lib/shopeeAdsParser';
import { parseShopeeExcel, validateExcelFile, ExcelPerformanceData } from '@/lib/shopeeExcelParser';
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
    case 'quick_boost': return `Impulsão Rápida: ${entry.details.replace(/^.*?:/, '').trim()}`;
    case 'campaign_created': return `Campanha criada${entry.toValue ? ` · ROAS inicial ${entry.toValue}` : ''}`;
    default: return entry.details.slice(0, 60);
  }
}

function formatLogDate(ts: string): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function OperationLogTimeline({ adProductId, adShopeeProductId, roasEmpate, onLogLoaded }: { adProductId: string | null; adShopeeProductId: string | null; roasEmpate: number | null; onLogLoaded?: (log: OperationLogEntry[]) => void }) {
  const { user } = useAuth();
  const [operationLog, setOperationLog] = useState<OperationLogEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportLog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const validation = validateCSVSecurity(file, text);
      if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }
      const detected = detectAndParseCSV(text);
      if (detected.type !== 'operation_log' || !detected.operationLog?.length) {
        toast.error('Este CSV não é um log de operações válido');
        return;
      }
      let updateFilter = supabase.from('product_ads_metrics').update({ operation_log: detected.operationLog as any }).eq('user_id', user.id);
      if (adProductId) {
        updateFilter = updateFilter.eq('product_id', adProductId);
      } else if (adShopeeProductId) {
        updateFilter = updateFilter.eq('shopee_product_id', adShopeeProductId);
      } else {
        toast.error('Produto não vinculado'); return;
      }
      const { error } = await updateFilter;
      if (error) { toast.error('Erro ao salvar log'); return; }
      toast.success('Log de operações importado');
      loadLog();
    } catch { toast.error('Erro ao importar'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (!operationLog || operationLog.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-lg">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportLog} className="hidden" />
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
          <LineChart className="w-4 h-4 text-primary dark:text-blue-400" /> Histórico de Performance
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LineChart className="w-10 h-10 text-text-3 mb-3" />
          <p className="text-base font-bold text-foreground">Importe o log de operações</p>
          <p className="text-sm text-text-2 mt-1">para ver o histórico de ajustes de ROAS e orçamento.</p>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="mt-3 gap-1.5 border-border text-text-2 hover:bg-surface-2">
            <Upload className="w-3.5 h-3.5" /> Importar CSV de Operações
          </Button>
        </div>
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
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportLog} className="hidden" />
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-success" /> Histórico de Performance
        </p>
        <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-border text-text-2 hover:bg-surface-2">
          <Upload className="w-3 h-3" /> Atualizar CSV
        </Button>
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
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {displayEvents.map((entry, i) => {
          const fi = FIELD_ICONS[entry.field] || FIELD_ICONS.other;
          const Icon = fi.icon;
          return (
            <div key={i} className="flex items-start gap-2.5 py-1.5">
              <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', fi.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground font-medium truncate">{formatLogLabel(entry)}</p>
                <p className="text-[10px] text-text-3 font-mono">{formatLogDate(entry.timestamp)}</p>
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
      <div className={cn('p-2 md:p-3 text-center rounded-xl border', colorClass.bg, colorClass.border)}>
        <p className={cn('text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1', colorClass.text)}>
          <Icon className="w-3 h-3" />
          {label}
        </p>
        <p className={cn('text-2xl font-black mt-0.5 font-mono tabular-nums', colorClass.text)}>{value}</p>
        {sub && <p className={cn('text-[11px] font-medium mt-0.5 truncate', subColor || colorClass.text)}>{sub}</p>}
      </div>
    );
  }
  if (highlight) {
    return (
      <div className="p-2 md:p-3 text-center rounded-xl bg-success/10 dark:bg-success/20 border-2 border-success/50">
        <p className="text-[9px] font-bold text-success uppercase tracking-wider flex items-center justify-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </p>
        <p className="text-2xl font-black mt-0.5 font-mono tabular-nums text-success">{value}</p>
        {sub && <p className={cn('text-[11px] font-medium mt-0.5 truncate', subColor || 'text-text-2')}>{sub}</p>}
      </div>
    );
  }
  return (
    <div className="p-2 md:p-3 text-center rounded-xl bg-surface-2 border border-border">
      <p className="text-[9px] font-bold text-text-3 uppercase tracking-wider flex items-center justify-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-lg font-bold mt-0.5 font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className={cn('text-[11px] font-medium mt-0.5 truncate', subColor || 'text-text-2')}>{sub}</p>}
    </div>
  );
}

// ═══ Main Component ═══

export function AdsDetailFullView({ ad, allAds, onClose, onNavigate, onImportPosition, onLink, onQuickRegister, onReimport, onUnlink, onChangeLink }: Props) {
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const config = currentStore?.config;
  const [excelData, setExcelData] = useState<ExcelPerformanceData | null>(null);
  const [opLog, setOpLog] = useState<OperationLogEntry[]>([]);
  const excelInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="animate-fade-in px-1 md:px-0 bg-background min-h-screen -mx-1 md:-mx-0 pb-10">
      {/* Breadcrumb / Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap px-1 pt-2">
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
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg mb-5 relative overflow-hidden">
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

      {/* KPIs grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-5 overflow-hidden">
        {ad.posicao_media !== null && (() => {
          const pos = ad.posicao_media!;
          const isTop = pos <= 8;
          const isMid = pos > 8 && pos <= 20;
          const pageLabel = pos <= 3 ? 'Top 3' : pos <= 8 ? '1ª Página' : pos <= 20 ? '2ª Página' : '3ª Página+';
          const posColorClass = {
            text: isTop ? 'text-success' : isMid ? 'text-warning' : 'text-destructive',
            bg: isTop ? 'bg-success/5' : isMid ? 'bg-warning/5' : 'bg-destructive/5',
            border: isTop ? 'border-success/25' : isMid ? 'border-warning/25' : 'border-destructive/25',
          };
          return <KpiCard icon={MapPin} label="Posição" value={`#${pos}`} sub={pageLabel} colorClass={posColorClass} />;
        })()}
        <KpiCard icon={Eye} label="Impressões" value={ad.impressoes >= 1000 ? `${(ad.impressoes / 1000).toFixed(1)}k` : String(ad.impressoes)} />
        <KpiCard icon={MousePointerClick} label="Cliques" value={ad.cliques >= 1000 ? `${(ad.cliques / 1000).toFixed(1)}k` : String(ad.cliques)} />
        <KpiCard icon={Percent} label="CTR" value={`${ad.ctr.toFixed(2)}%`} sub={ad.ctr >= 2.5 ? 'Bom' : ad.ctr >= 1.5 ? 'Ok' : 'Baixo'} subColor={ad.ctr >= 2.5 ? 'text-success' : ad.ctr >= 1.5 ? 'text-warning' : 'text-destructive'} />
        <KpiCard icon={ShoppingCart} label="Vendas" value={ad.itens_vendidos >= 1000 ? `${(ad.itens_vendidos / 1000).toFixed(1)}k` : String(ad.itens_vendidos)} />
        <KpiCard icon={DollarSign} label="GMV" value={fmtShort(ad.gmv)} />
        <KpiCard icon={Target} label="ROAS" value={roasDireto.toFixed(2)} sub={roasEmpate ? `Emp: ${roasEmpate.toFixed(2)}` : undefined} subColor={roasEmpate ? (roasDireto >= roasEmpate ? 'text-success' : 'text-destructive') : undefined} highlight />
      </div>

      {/* Unlinked product warning */}
      {!product && (
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
        <TabsList className="w-full h-11 bg-secondary border border-border rounded-xl p-1 mb-5">
          <TabsTrigger
            value="diagnostico"
            className="flex-1 h-9 rounded-lg text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            <Target className="w-3.5 h-3.5" />
            Diagnóstico & Ação
          </TabsTrigger>
          <TabsTrigger
            value="metricas"
            className="flex-1 h-9 rounded-lg text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Métricas & Histórico
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

              {/* Economia por Venda */}
              {empateResult && ad.itens_vendidos > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">
                    Economia por Venda <span className="text-text-3">(Ticket: {fmt(ad.gmv / (ad.itens_vendidos || 1))})</span>
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2/50">
                      <span className="text-sm text-text-2">Custo Produto + Taxas</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-foreground">{fmt(empateResult.lucroPorUnidade > 0 ? (ad.gmv / (ad.itens_vendidos || 1)) - empateResult.lucroPorUnidade : 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-warning/10 border border-warning/20">
                      <span className="text-sm text-warning">Custo Anúncio (CPA)</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-warning">{fmt(custoPorUnidade)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-success/10 dark:bg-success/20 border border-success/20">
                      <span className="text-sm text-success font-bold">Lucro Limpo</span>
                      <span className={cn('text-lg font-extrabold font-mono tabular-nums', sobraPorVenda !== null && sobraPorVenda >= 0 ? 'text-success' : 'text-destructive')}>
                        {sobraPorVenda !== null ? fmt(sobraPorVenda) : '—'}
                      </span>
                    </div>
                  </div>
                  {lucroTotalPeriodo !== null && (
                    <div className="pt-2 border-t border-border flex justify-between text-sm">
                      <span className="text-text-2">{lucroTotalPeriodo >= 0 ? 'Lucro total período:' : 'Prejuízo total:'}</span>
                      <span className={cn('font-bold font-mono tabular-nums', lucroTotalPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{fmt(Math.abs(lucroTotalPeriodo))}</span>
                    </div>
                  )}
                  {pctConsumo !== null && (
                    <p className="text-[11px] text-text-3">O ads consome {pctConsumo.toFixed(1)}% do lucro por unidade.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 mb-3">Economia por Venda</p>
                  <p className="text-sm text-text-2">Vincule um produto para análise.</p>
                </div>
              )}
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
            {/* Histórico de Performance */}
            <OperationLogTimeline adProductId={ad.product_id} adShopeeProductId={ad.shopee_product_id} roasEmpate={roasEmpate} />

            {/* Linha 2: Posicionamento + Geral vs Direto */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Posicionamento */}
              {ad.posicao_media !== null && posInfo ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary dark:text-blue-400" /> Posicionamento
                    </p>
                    <span className="text-3xl font-black font-mono tabular-nums text-foreground">#{ad.posicao_media}</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Top 3', range: [1, 3], color: 'bg-primary dark:bg-blue-500', pct: ad.posicao_media <= 3 ? 100 : 0 },
                      { label: 'Página 1 (4-8)', range: [4, 8], color: 'bg-primary/80 dark:bg-blue-400', pct: ad.posicao_media > 3 && ad.posicao_media <= 8 ? 100 : 0 },
                      { label: 'Página 2+ (9+)', range: [9, 99], color: 'bg-muted-foreground', pct: ad.posicao_media > 8 ? 100 : 0 },
                    ].map(tier => {
                      const isActive = ad.posicao_media! >= tier.range[0] && ad.posicao_media! <= tier.range[1];
                      return (
                        <div key={tier.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn(isActive ? 'text-foreground font-bold' : 'text-text-3')}>{tier.label}</span>
                            {isActive && <span className="text-primary dark:text-blue-400 font-bold text-xs">← VOCÊ</span>}
                          </div>
                          <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', isActive ? tier.color : 'bg-surface-2')} style={{ width: isActive ? '100%' : '0%' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className={cn('text-sm font-bold', ad.posicao_media <= 3 ? 'text-primary dark:text-blue-400' : ad.posicao_media <= 8 ? 'text-primary/80 dark:text-blue-300' : ad.posicao_media <= 16 ? 'text-warning' : 'text-destructive')}>
                    {posInfo.label}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 shadow-lg space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-3" /> Posicionamento
                  </p>
                  <p className="text-sm text-text-2">Importe o CSV individual para ver a posição nos resultados de busca.</p>
                  <Button onClick={onImportPosition} size="sm" variant="outline" className="gap-1.5 text-sm border-border text-text-2 hover:bg-surface-2">
                    <Upload className="w-4 h-4" /> Importar CSV do Produto
                  </Button>
                </div>
              )}

              {/* Geral vs Direto */}
              {ad.roas_direto > 0 && ad.gmv_direto > 0 && ad.gmv_direto !== ad.gmv ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">Geral vs Direto</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono tabular-nums">
                      <thead>
                        <tr className="bg-surface-2">
                          <th className="text-left py-2.5 px-3 font-normal text-[10px] uppercase tracking-wider text-text-2">Métrica</th>
                          <th className="text-right py-2.5 px-3 font-normal text-[10px] uppercase tracking-wider text-text-2">Geral</th>
                          <th className="text-right py-2.5 px-3 font-normal text-[10px] uppercase tracking-wider text-text-2">Direto</th>
                          <th className="text-right py-2.5 px-3 font-normal text-[10px] uppercase tracking-wider text-text-2">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="py-2.5 px-3 text-text-2 font-bold">ROAS</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">{ad.roas.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-success">{ad.roas_direto.toFixed(2)}</td>
                          <td className={cn('py-2.5 px-3 text-right font-bold', ad.roas - ad.roas_direto > 0 ? 'text-success' : 'text-destructive')}>
                            {(ad.roas - ad.roas_direto) > 0 ? '+' : ''}{(ad.roas - ad.roas_direto).toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="py-2.5 px-3 text-text-2 font-bold">ACOS</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">{ad.acos.toFixed(1)}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">{acosDireto.toFixed(1)}%</td>
                          <td className={cn('py-2.5 px-3 text-right font-bold', ad.acos - acosDireto < 0 ? 'text-success' : 'text-destructive')}>
                            {(ad.acos - acosDireto).toFixed(1)}%
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="py-2.5 px-3 text-text-2 font-bold">GMV</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">{fmt(ad.gmv)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">{fmt(ad.gmv_direto)}</td>
                          <td className={cn('py-2.5 px-3 text-right font-bold', ad.gmv - ad.gmv_direto > 0 ? 'text-success' : 'text-text-2')}>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
