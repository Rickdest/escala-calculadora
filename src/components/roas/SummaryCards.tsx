import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { fmt, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign, TrendingUp, BarChart3, Zap, MapPin, AlertTriangle } from 'lucide-react';

export function SummaryCards({ data }: { data: EnrichedAdsData[] }) {
  const s = useMemo(() => {
    const totalGmv = data.reduce((a, d) => a + d.gmv, 0);
    const totalSpend = data.reduce((a, d) => a + d.despesas, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const lucroEstimado = totalGmv - totalSpend;
    const linkedData = data.filter(d => !!d.product_id);
    const lucrativos = linkedData.filter(d => d.classificacao === 'LUCRATIVO').length;
    const atencao = linkedData.filter(d => d.classificacao === 'MARGEM_APERTADA' || d.classificacao === 'ABAIXO_EMPATE').length;
    const prejuizo = linkedData.filter(d => d.classificacao === 'PREJUIZO').length;
    const naoVinculados = data.filter(d => !d.product_id).length;

    const scores = linkedData.map(d => {
      const rd = d.roas_direto && d.roas_direto > 0 ? d.roas_direto : d.roas;
      return calcAdEfficiencyScore(rd, d.roas_empate, d.ctr, d.taxa_conversao, d.posicao_media);
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;

    // Calculate avg position from data that has position
    const withPosition = data.filter(d => d.posicao_media !== null && d.posicao_media > 0);
    const avgPosition = withPosition.length > 0
      ? withPosition.reduce((a, d) => a + (d.posicao_media || 0), 0) / withPosition.length
      : null;

    return { totalGmv, totalSpend, avgRoas, lucroEstimado, lucrativos, atencao, prejuizo, naoVinculados, total: data.length, avgScore, avgPosition };
  }, [data]);

  const allZeroClassification = s.lucrativos === 0 && s.atencao === 0 && s.prejuizo === 0;

  // ROAS thermometer bar
  const roasBarWidth = Math.min((s.avgRoas / 10) * 100, 100);

  // Position color/label
  const positionColor = s.avgPosition === null
    ? 'text-text-2'
    : s.avgPosition <= 3
    ? 'text-success'
    : s.avgPosition <= 8
    ? 'text-foreground'
    : 'text-warning';

  const positionLabel = s.avgPosition === null
    ? '—'
    : s.avgPosition <= 3
    ? 'Top 3'
    : s.avgPosition <= 8
    ? '1ª página'
    : '2ª+ página';

  const showPositionWarning = s.avgPosition !== null && s.avgPosition > 8;

  const kpis = [
    {
      label: 'GMV TOTAL',
      value: fmt(s.totalGmv),
      color: 'text-foreground',
      sub: `${s.total} anúncios ativos`,
      icon: DollarSign,
      iconColor: 'text-primary/30',
    },
    {
      label: 'GASTO TOTAL',
      value: fmt(s.totalSpend),
      color: 'text-foreground',
      sub: 'Investido em ads no período',
      icon: BarChart3,
      iconColor: 'text-warning/30',
    },
    {
      label: 'ROAS MÉDIO',
      value: s.avgRoas.toFixed(2),
      color: getRoasColor(s.avgRoas),
      sub: null,
      icon: TrendingUp,
      iconColor: s.avgRoas >= 3 ? 'text-success/30' : 'text-warning/30',
    },
    {
      label: 'LUCRO EST.',
      value: fmt(s.lucroEstimado),
      color: s.lucroEstimado >= 0 ? 'text-success' : 'text-destructive',
      sub: 'GMV − Gasto',
      icon: DollarSign,
      iconColor: s.lucroEstimado >= 0 ? 'text-success/30' : 'text-destructive/30',
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className={cn(
        'grid gap-2 md:gap-3',
        s.avgPosition !== null ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'
      )}>
        {kpis.map(({ label, value, color, sub, icon: Icon, iconColor }, idx) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-3 md:p-5 min-w-0 overflow-hidden relative">
            <Icon className={cn('absolute top-3 right-3 w-7 h-7 md:w-9 md:h-9', iconColor)} />
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn('text-xl md:text-3xl font-black font-mono tabular-nums mt-1 truncate', color)}>{value}</p>
            {/* ROAS card gets a thermometer bar instead of sub text */}
            {idx === 2 ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block shrink-0" />
                    <span className="truncate">Meta 3.0</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500')}
                    style={{
                      width: `${roasBarWidth}%`,
                      minWidth: s.avgRoas > 0 ? '4px' : '0px',
                      backgroundColor: s.avgRoas >= 5 ? 'hsl(var(--success))' : s.avgRoas >= 3 ? 'hsl(var(--primary))' : s.avgRoas >= 1 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                    }}
                  />
                </div>
              </div>
            ) : sub ? (
              <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
            ) : null}
          </div>
        ))}

        {/* Position Card */}
        {s.avgPosition !== null && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden relative">
            <div className="h-1 w-full bg-warning rounded-t-2xl" />
            <div className="p-3 md:p-5">
              <MapPin className={cn('absolute top-4 right-3 w-7 h-7 md:w-9 md:h-9', positionColor, 'opacity-30')} />
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">POSIÇÃO</p>
              <p className={cn('text-xl md:text-3xl font-black font-mono tabular-nums mt-1', positionColor)}>
                #{Math.round(s.avgPosition)}
              </p>
              <p className={cn('text-[10px] md:text-[11px] font-semibold mt-0.5', positionColor)}>{positionLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Position warning */}
      {showPositionWarning && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/25">
          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-warning leading-snug">
            Posição média #{Math.round(s.avgPosition!)} — você está na 2ª página ou além.
            Considere reduzir a meta de ROAS para ganhar posicionamento.
          </p>
        </div>
      )}
    </div>
  );
}
