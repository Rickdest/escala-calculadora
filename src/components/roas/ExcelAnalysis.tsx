import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ExcelPerformanceData, DailyMetric } from '@/lib/shopeeExcelParser';
import { OperationLogEntry } from '@/lib/shopeeAdsParser';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, Search, GitCompareArrows, BarChart3, ChevronDown } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtN = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

interface ExcelAnalysisProps {
  data: ExcelPerformanceData;
  operationLog?: OperationLogEntry[];
}

interface Correlation {
  data: string;
  dataLabel: string;
  mudanca: string;
  diaAnterior: DailyMetric | null;
  diaMudanca: DailyMetric;
  impacto: {
    impressoesDelta: number;
    impressoesPct: number;
    vendasDelta: number;
    vendasPct: number;
    observacao: string;
  };
  resultado: 'positivo' | 'negativo' | 'neutro';
}

function entryToDate(entry: OperationLogEntry): string {
  // timestamp format: "YYYY-MM-DD HH:mm" or similar
  return entry.timestamp.split(' ')[0].split('T')[0];
}

function computeCorrelations(data: ExcelPerformanceData, log: OperationLogEntry[]): Correlation[] {
  const byDate: Record<string, DailyMetric> = {};
  data.dadosDiarios.forEach(d => { byDate[d.data] = d; });

  return log.map(entry => {
    const entryDate = entryToDate(entry);
    const dia = byDate[entryDate];
    if (!dia) return null;

    const idx = data.dadosDiarios.findIndex(d => d.data === entryDate);
    const anterior = idx > 0 ? data.dadosDiarios[idx - 1] : null;

    const impDelta = anterior ? dia.impressoes - anterior.impressoes : dia.impressoes;
    const impPct = anterior && anterior.impressoes > 0 ? Math.round((impDelta / anterior.impressoes) * 100) : 0;
    const venDelta = anterior ? dia.vendasBrl - anterior.vendasBrl : dia.vendasBrl;
    const venPct = anterior && anterior.vendasBrl > 0 ? Math.round((venDelta / anterior.vendasBrl) * 100) : 0;

    let obs = '';
    let resultado: 'positivo' | 'negativo' | 'neutro' = 'neutro';

    const from = parseFloat(entry.fromValue?.replace(/[^\d.,]/g, '').replace(',', '.') ?? '0') || 0;
    const to = parseFloat(entry.toValue?.replace(/[^\d.,]/g, '').replace(',', '.') ?? '0') || 0;

    if (entry.field === 'roas_target') {
      if (to > from) {
        obs = `⚠️ Meta aumentada ${entry.fromValue}→${entry.toValue}: algoritmo tende a reduzir volume`;
        resultado = impDelta < 0 ? 'negativo' : 'neutro';
      } else {
        obs = `✓ Meta reduzida ${entry.fromValue}→${entry.toValue}: menos restritivo, libera volume`;
        resultado = impDelta > 0 ? 'positivo' : 'neutro';
      }
    } else if (entry.field === 'budget') {
      obs = `Orçamento: ${entry.fromValue}→${entry.toValue}`;
      resultado = impDelta > 0 ? 'positivo' : impDelta < 0 ? 'negativo' : 'neutro';
    } else {
      obs = `${entry.eventType}: ${entry.details}`;
    }

    const [, m, d] = entryDate.split('-');

    return {
      data: entryDate,
      dataLabel: `${d}/${m}`,
      mudanca: `${entry.field.replace('_', ' ').toUpperCase()} ${entry.fromValue ?? ''} → ${entry.toValue ?? ''}`,
      diaAnterior: anterior,
      diaMudanca: dia,
      impacto: { impressoesDelta: impDelta, impressoesPct: impPct, vendasDelta: venDelta, vendasPct: venPct, observacao: obs },
      resultado,
    } as Correlation;
  }).filter(Boolean) as Correlation[];
}

// ─── Before vs After ───
function AntesVsDepois({ data }: { data: ExcelPerformanceData }) {
  const firstSale = data.dataPrimeiraVenda;
  if (!firstSale) return null;

  const antes = data.dadosDiarios.filter(d => d.data < firstSale);
  const depois = data.dadosDiarios.filter(d => d.data >= firstSale);
  if (antes.length === 0 && depois.length === 0) return null;

  const totalAntes = antes.reduce((s, d) => s + d.vendasBrl, 0);
  const totalDepois = depois.reduce((s, d) => s + d.vendasBrl, 0);
  const compAntes = antes.reduce((s, d) => s + d.compradores, 0);
  const compDepois = depois.reduce((s, d) => s + d.compradores, 0);
  const mediaAntes = antes.length > 0 ? totalAntes / antes.length : 0;
  const mediaDepois = depois.length > 0 ? totalDepois / depois.length : 0;
  const mediaCompAntes = antes.length > 0 ? compAntes / antes.length : 0;
  const mediaCompDepois = depois.length > 0 ? compDepois / depois.length : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" /> Antes vs Depois dos Ads
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase font-bold text-text-3">Orgânico</p>
          <p className="text-xs text-text-2">{antes.length} dias</p>
          <p className="text-xl font-black font-mono tabular-nums text-text-2">{fmt(totalAntes)}</p>
          <p className="text-xs text-text-2">{mediaCompAntes.toFixed(1)} vendas/dia</p>
        </div>
        <ArrowRight className="w-5 h-5 text-text-3" />
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase font-bold text-success">Com Ads</p>
          <p className="text-xs text-text-2">{depois.length} dias</p>
          <p className="text-xl font-black font-mono tabular-nums text-success">{fmt(totalDepois)}</p>
          <p className="text-xs text-text-2">{mediaCompDepois.toFixed(1)} vendas/dia</p>
        </div>
      </div>
      <div className="pt-3 border-t border-border flex items-center justify-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-success" />
        <span className="text-text-2">Incremento:</span>
        <span className="font-bold text-success">+{(mediaCompDepois - mediaCompAntes).toFixed(1)} vendas/dia</span>
        <span className="text-text-3">({fmt(mediaDepois - mediaAntes)}/dia)</span>
      </div>
    </div>
  );
}

// ─── Traffic Sources Chart ───
const TRAFFIC_COLORS = ['hsl(var(--primary))', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ec4899'];

function FontesTrafegoChart({ fontes }: { fontes: ExcelPerformanceData['fontes'] }) {
  if (fontes.length === 0) return null;

  const chartData = fontes.map((f, i) => ({
    name: f.fonte,
    pct: Number(f.pct.toFixed(1)),
    vendas: f.vendasBrl,
    fill: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5" /> Fontes de Tráfego
      </p>
      <div className="flex items-center gap-6 flex-col md:flex-row">
        <div className="h-[200px] w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="pct"
                nameKey="name"
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                formatter={(value: number) => [`${value}%`, 'Participação']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: d.fill }} />
              <span className="text-text-3 truncate">{d.name}</span>
              <span className="ml-auto font-bold text-foreground tabular-nums">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Correlations ───
function ResultadoCard({ c, compute3DayDelta }: { c: Correlation; compute3DayDelta: (date: string) => { deltaImp: number; deltaSales: number } | null }) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = c.resultado === 'positivo';
  const isNegative = c.resultado === 'negativo';
  const borderStyle = isPositive
    ? 'border-emerald-500/50 bg-emerald-500/[0.06]'
    : isNegative
    ? 'border-destructive/50 bg-destructive/[0.06]'
    : 'border-border bg-surface-2/30';

  const mudLower = c.mudanca.toLowerCase();
  const typeLabel = mudLower.includes('roas') || mudLower.includes('meta')
    ? { label: 'META', color: 'bg-emerald-500/20 text-emerald-400' }
    : mudLower.includes('orçamento') || mudLower.includes('budget')
    ? { label: 'BUDGET', color: 'bg-blue-500/20 text-blue-400' }
    : mudLower.includes('boost') || mudLower.includes('impulsão')
    ? { label: 'BOOST', color: 'bg-amber-500/20 text-amber-400' }
    : { label: 'OUTRO', color: 'bg-muted/50 text-text-3' };

  const delta3d = compute3DayDelta(c.data);

  return (
    <div
      className={cn('rounded-lg md:rounded-xl border px-2.5 py-2 md:px-4 md:py-3.5 transition-colors', borderStyle)}
      onClick={() => setExpanded(prev => !prev)}
    >
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1.5">
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <span className={cn('text-[8px] md:text-[10px] font-extrabold uppercase px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md tracking-wide', typeLabel.color)}>
              {typeLabel.label}
            </span>
            <span className="text-[10px] md:text-[12px] text-text-3 font-mono">{c.dataLabel}</span>
            <ChevronDown className={cn('w-3 h-3 text-text-3 transition-transform md:hidden', expanded && 'rotate-180')} />
          </div>
          <p className={cn('text-xs md:text-lg text-foreground font-bold leading-snug md:line-clamp-none', !expanded && 'line-clamp-1')}>{c.mudanca}</p>
          {c.impacto.observacao && (
            <p className={cn('text-[10px] md:text-[12px] leading-snug md:line-clamp-none', !expanded && 'line-clamp-1', isPositive ? 'text-emerald-400' : isNegative ? 'text-destructive' : 'text-amber-400')}>
              {c.impacto.observacao}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5 text-right">
          <div>
            <span className={cn('text-xs md:text-sm font-bold font-mono tabular-nums', c.impacto.impressoesDelta >= 0 ? 'text-emerald-400' : 'text-destructive')}>
              {c.impacto.impressoesDelta >= 0 ? '+' : ''}{fmtN(c.impacto.impressoesDelta)}
              <span className="hidden md:inline">{c.impacto.impressoesPct !== 0 && ` (${c.impacto.impressoesPct}%)`}</span>
            </span>
            <p className="text-[8px] md:text-[9px] text-text-3 uppercase">imp</p>
          </div>
          <div>
            <span className={cn('text-xs md:text-sm font-bold font-mono tabular-nums', c.impacto.vendasDelta >= 0 ? 'text-emerald-400' : 'text-destructive')}>
              {c.impacto.vendasDelta >= 0 ? '+' : ''}{fmt(c.impacto.vendasDelta)}
            </span>
            <p className="text-[8px] md:text-[9px] text-text-3 uppercase">vendas</p>
          </div>
        </div>
      </div>
      {delta3d && (
        <div className="mt-1 md:mt-1.5 rounded-md bg-surface-2/40 px-2 py-1 md:px-3 md:py-2 text-[9px] md:text-[11px] text-text-2">
          <div className="flex gap-2 md:gap-4">
            <span className="font-semibold text-foreground">📊 3d:</span>
            <span>Imp: <span className={cn('font-bold font-mono', delta3d.deltaImp >= 0 ? 'text-success' : 'text-destructive')}>{delta3d.deltaImp >= 0 ? '+' : ''}{delta3d.deltaImp.toLocaleString()}</span></span>
            <span>Vnd: <span className={cn('font-bold font-mono', delta3d.deltaSales >= 0 ? 'text-success' : 'text-destructive')}>{delta3d.deltaSales >= 0 ? '+' : ''}{delta3d.deltaSales}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultadoAposMudancaSection({ correlations, dadosDiarios }: { correlations: Correlation[]; dadosDiarios: DailyMetric[] }) {
  if (correlations.length === 0) return null;

  function compute3DayDelta(eventDate: string) {
    const idx = dadosDiarios.findIndex(d => d.data === eventDate);
    if (idx < 0) return null;
    const before = dadosDiarios.slice(Math.max(0, idx - 3), idx);
    const after = dadosDiarios.slice(idx + 1, idx + 4);
    if (before.length < 2 || after.length < 2) return null;
    const avgImpBefore = before.reduce((s, d) => s + d.impressoes, 0) / before.length;
    const avgImpAfter = after.reduce((s, d) => s + d.impressoes, 0) / after.length;
    const avgSalesBefore = before.reduce((s, d) => s + d.compradores, 0) / before.length;
    const avgSalesAfter = after.reduce((s, d) => s + d.compradores, 0) / after.length;
    return {
      deltaImp: Math.round(avgImpAfter - avgImpBefore),
      deltaSales: Math.round((avgSalesAfter - avgSalesBefore) * 10) / 10,
    };
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3 md:p-5 shadow-lg space-y-3 md:space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <GitCompareArrows className="w-3.5 h-3.5 text-primary dark:text-blue-400" /> Resultado Após Cada Mudança ({correlations.length})
      </p>
      <div className="space-y-1.5 md:space-y-2.5 max-h-[300px] md:max-h-[420px] overflow-y-auto pr-1">
        {correlations.map((c, i) => (
          <ResultadoCard key={i} c={c} compute3DayDelta={compute3DayDelta} />
        ))}
      </div>
    </div>
  );
}

// ─── Trend Chart ───
function GraficoTendencia({ data, operationLog }: { data: ExcelPerformanceData; operationLog?: OperationLogEntry[] }) {
  const chartData = data.dadosDiarios.map(d => ({
    name: d.dataLabel,
    impressoes: d.impressoes,
    vendas: d.compradores,
    vendasBrl: d.vendasBrl,
  }));

  const logDates = (operationLog ?? []).map(e => {
    const date = entryToDate(e);
    const [, m, d] = date.split('-');
    return { label: `${d}/${m}`, mudanca: `${e.field.replace('_', ' ')} ${e.fromValue ?? ''}→${e.toValue ?? ''}`, data: date };
  }).filter(e => data.dadosDiarios.some(d => d.data === e.data));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" /> Histórico de Performance Diária
      </p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-text-3" interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-text-3" width={50} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-text-3" width={30} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))' }}
              formatter={(value: number, name: string) => {
                if (name === 'impressoes') return [fmtN(value), 'Impressões'];
                if (name === 'vendas') return [value, 'Compradores'];
                return [value, name];
              }}
            />
            {logDates.map((e, i) => (
              <ReferenceLine
                key={i}
                x={e.label}
                yAxisId="left"
                stroke="hsl(var(--warning))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            ))}
            <Area yAxisId="left" type="monotone" dataKey="impressoes" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2} name="impressoes" />
            <Line yAxisId="right" type="monotone" dataKey="vendas" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 2 }} name="vendas" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] text-text-3">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Impressões</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-success inline-block rounded" /> Compradores</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-warning inline-block rounded border-dashed" /> Ajuste</span>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function ExcelAnalysis({ data, operationLog }: ExcelAnalysisProps) {
  const correlations = useMemo(() => {
    if (!operationLog || operationLog.length === 0) return [];
    return computeCorrelations(data, operationLog);
  }, [data, operationLog]);

  return (
    <div className="space-y-4">
      <GraficoTendencia data={data} operationLog={operationLog} />
      <AntesVsDepois data={data} />
      <FontesTrafegoChart fontes={data.fontes} />
      {correlations.length > 0 && <ResultadoAposMudancaSection correlations={correlations} dadosDiarios={data.dadosDiarios} />}
    </div>
  );
}
