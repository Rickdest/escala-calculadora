import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { fmt, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign, TrendingUp, BarChart3, Zap } from 'lucide-react';

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

    return { totalGmv, totalSpend, avgRoas, lucroEstimado, lucrativos, atencao, prejuizo, naoVinculados, total: data.length, avgScore };
  }, [data]);

  const allZeroClassification = s.lucrativos === 0 && s.atencao === 0 && s.prejuizo === 0;

  // ROAS thermometer bar
  const roasBarWidth = Math.min((s.avgRoas / 10) * 100, 100);
  const roasBarColor = s.avgRoas >= 5 ? 'bg-success' : s.avgRoas >= 3 ? 'bg-primary' : s.avgRoas >= 1 ? 'bg-warning' : 'bg-destructive';

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
      sub: null, // We'll use the thermometer instead
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
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
      </div>
    </div>
  );
}
