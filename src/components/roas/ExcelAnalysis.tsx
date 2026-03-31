import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ExcelPerformanceData, DailyMetric } from '@/lib/shopeeExcelParser';
import { OperationLogEntry } from '@/lib/shopeeAdsParser';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, Search, Users, BarChart3 } from 'lucide-react';

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

// ─── Traffic Sources ───
function FontesTrafego({ fontes }: { fontes: ExcelPerformanceData['fontes'] }) {
  if (fontes.length === 0) return null;
  const maxPct = Math.max(...fontes.map(f => f.pct));

  const TRAFFIC_SOURCE_COLORS: Record<string, string> = {
    'Pesquisar': 'bg-primary',
    'Recomendação': 'bg-blue-500',
    'Carrinho de Compras': 'bg-amber-500',
    'Outros': 'bg-purple-500',
    'Seguindo': 'bg-emerald-500',
    'Meus Cupons': 'bg-pink-500',
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5" /> Fontes de Tráfego
      </p>
      <div className="space-y-3">
        {fontes.map((f, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-2">{f.fonte}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-3">{fmt(f.vendasBrl)}</span>
                <span className="font-bold font-mono tabular-nums text-foreground w-16 text-right">{f.pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', TRAFFIC_SOURCE_COLORS[f.fonte] || 'bg-muted-foreground')}
                style={{ width: `${(f.pct / maxPct) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Correlations ───
function CorrelacaoSection({ correlations }: { correlations: Correlation[] }) {
  if (correlations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-3 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-warning" /> Impacto das Mudanças ({correlations.length})
      </p>
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {correlations.map((c, i) => {
          const isPositive = c.resultado === 'positivo';
          const isNegative = c.resultado === 'negativo';
          const borderStyle = isPositive
            ? 'border-emerald-500/50 bg-emerald-500/[0.06]'
            : isNegative
            ? 'border-destructive/50 bg-destructive/[0.06]'
            : 'border-border bg-surface-2/30';

          // Determine type from mudanca text
          const mudLower = c.mudanca.toLowerCase();
          const typeLabel = mudLower.includes('roas') || mudLower.includes('meta')
            ? { label: 'META', color: 'bg-emerald-500/20 text-emerald-400' }
            : mudLower.includes('orçamento') || mudLower.includes('budget')
            ? { label: 'BUDGET', color: 'bg-blue-500/20 text-blue-400' }
            : mudLower.includes('boost') || mudLower.includes('impulsão')
            ? { label: 'BOOST', color: 'bg-amber-500/20 text-amber-400' }
            : { label: 'OUTRO', color: 'bg-muted/50 text-text-3' };

          return (
            <div key={i} className={cn('rounded-xl border px-4 py-3.5 transition-colors', borderStyle)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wide', typeLabel.color)}>
                      {typeLabel.label}
                    </span>
                    <span className="text-[12px] text-text-3 font-mono">{c.dataLabel}</span>
                  </div>
                  <p className="text-lg text-foreground font-bold leading-snug">{c.mudanca}</p>
                  {c.impacto.observacao && (
                    <p className={cn('text-[12px] leading-snug', isPositive ? 'text-emerald-400' : isNegative ? 'text-destructive' : 'text-amber-400')}>
                      {c.impacto.observacao}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-1 text-right">
                  <div>
                    <span className={cn('text-sm font-bold font-mono tabular-nums', c.impacto.impressoesDelta >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                      {c.impacto.impressoesDelta >= 0 ? '+' : ''}{fmtN(c.impacto.impressoesDelta)}
                      {c.impacto.impressoesPct !== 0 && ` (${c.impacto.impressoesPct}%)`}
                    </span>
                    <p className="text-[9px] text-text-3 uppercase mt-0.5">impressões</p>
                  </div>
                  <div>
                    <span className={cn('text-sm font-bold font-mono tabular-nums', c.impacto.vendasDelta >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                      {c.impacto.vendasDelta >= 0 ? '+' : ''}{fmt(c.impacto.vendasDelta)}
                    </span>
                    <p className="text-[9px] text-text-3 uppercase mt-0.5">vendas</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
      <FontesTrafego fontes={data.fontes} />
      {correlations.length > 0 && <CorrelacaoSection correlations={correlations} />}
    </div>
  );
}
