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

  const kpis = [
    {
      label: 'GMV TOTAL',
      value: fmt(s.totalGmv),
      color: 'text-foreground',
      sub: `${s.total} anúncios`,
      icon: DollarSign,
      accentColor: 'border-t-primary',
      iconBg: 'text-primary/20',
    },
    {
      label: 'GASTO TOTAL',
      value: fmt(s.totalSpend),
      color: 'text-foreground',
      sub: 'Investido em ads',
      icon: BarChart3,
      accentColor: 'border-t-warning',
      iconBg: 'text-warning/20',
    },
    {
      label: 'ROAS MÉDIO',
      value: s.avgRoas.toFixed(2),
      color: getRoasColor(s.avgRoas),
      sub: s.avgRoas >= 3 ? '✅ Acima de 3.0' : s.avgRoas >= 1 ? '🟠 Abaixo de 3.0' : '🔴 Negativo',
      icon: TrendingUp,
      accentColor: s.avgRoas >= 3 ? 'border-t-success' : s.avgRoas >= 1 ? 'border-t-warning' : 'border-t-destructive',
      iconBg: s.avgRoas >= 3 ? 'text-success/20' : s.avgRoas >= 1 ? 'text-warning/20' : 'text-destructive/20',
    },
    {
      label: 'LUCRO EST.',
      value: fmt(s.lucroEstimado),
      color: s.lucroEstimado >= 0 ? 'text-success' : 'text-destructive',
      sub: 'GMV − Gasto',
      icon: Zap,
      accentColor: s.lucroEstimado >= 0 ? 'border-t-success' : 'border-t-destructive',
      iconBg: s.lucroEstimado >= 0 ? 'text-success/20' : 'text-destructive/20',
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {kpis.map(({ label, value, color, sub, icon: Icon, accentColor, iconBg }) => (
          <div key={label} className={cn('rounded-xl border border-border bg-card p-2.5 md:p-4 min-w-0 overflow-hidden relative border-t-2', accentColor)}>
            <Icon className={cn('absolute top-2.5 right-2.5 w-6 h-6 md:w-8 md:h-8', iconBg)} />
            <p className="section-label text-[9px] md:text-[10px]">{label}</p>
            <p className={cn('text-base md:text-2xl font-black font-mono tabular-nums mt-0.5 truncate', color)}>{value}</p>
            <p className="text-[10px] md:text-[11px] text-text-3 mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status mini cards */}
      {allZeroClassification && s.naoVinculados > 0 ? (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 flex items-center gap-2">
          <span className="text-xs font-bold text-warning whitespace-nowrap">⚠️ {s.naoVinculados} não vinculado{s.naoVinculados !== 1 ? 's' : ''}</span>
          <span className="text-[11px] text-text-3">· Vincule para ver lucratividade</span>
        </div>
      ) : (
        <div className="flex overflow-x-auto scrollbar-hide gap-2 md:grid md:grid-cols-4 pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="shrink-0 min-w-[5rem] rounded-xl border border-success/20 bg-success/5 p-2 md:p-3 text-center">
            <p className="text-base md:text-xl font-black text-success">{s.lucrativos}</p>
            <p className="text-[10px] md:text-[11px] font-bold text-success">✅ Lucrativos</p>
          </div>
          <div className="shrink-0 min-w-[5rem] rounded-xl border border-warning/20 bg-warning/5 p-2 md:p-3 text-center">
            <p className="text-base md:text-xl font-black text-warning">{s.atencao}</p>
            <p className="text-[10px] md:text-[11px] font-bold text-warning">🟠 Atenção</p>
          </div>
          <div className="shrink-0 min-w-[5rem] rounded-xl border border-destructive/20 bg-destructive/5 p-2 md:p-3 text-center">
            <p className="text-base md:text-xl font-black text-destructive">{s.prejuizo}</p>
            <p className="text-[10px] md:text-[11px] font-bold text-destructive">🔴 Prejuízo</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center cursor-help">
                  <p className={cn('text-xl font-black font-mono', s.avgScore >= 60 ? 'text-primary' : 'text-warning')}>
                    {s.avgScore > 0 ? `${s.avgScore}/100` : '—'}
                  </p>
                  <p className="text-[11px] font-bold text-primary flex items-center justify-center gap-1">
                    ⚡ Score Médio <Info className="w-3 h-3 text-text-3" />
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">Baseado em ROAS, CTR, Taxa de Conversão e Posição Média dos produtos vinculados.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
