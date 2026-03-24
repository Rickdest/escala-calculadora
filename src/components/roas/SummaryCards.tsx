import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { fmt, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

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

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'GMV TOTAL', value: fmt(s.totalGmv), color: 'text-foreground', sub: `${s.total} anúncios` },
          { label: 'GASTO TOTAL', value: fmt(s.totalSpend), color: 'text-foreground', sub: 'Investido em ads' },
          { label: 'ROAS MÉDIO', value: s.avgRoas.toFixed(2), color: getRoasColor(s.avgRoas), sub: s.avgRoas >= 3 ? '✅ Acima de 3.0' : s.avgRoas >= 1 ? '🟠 Abaixo de 3.0' : '🔴 Negativo' },
          { label: 'LUCRO EST.', value: fmt(s.lucroEstimado), color: s.lucroEstimado >= 0 ? 'text-success' : 'text-destructive', sub: 'GMV − Gasto' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 md:p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-3">{label}</p>
            <p className={cn('text-lg md:text-xl font-extrabold font-mono tabular-nums mt-1', color)}>{value}</p>
            <p className="text-[11px] text-text-3 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status mini cards */}
      {allZeroClassification && s.naoVinculados > 0 ? (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-center">
          <p className="text-sm font-medium text-warning">
            ⚠️ {s.naoVinculados} produto{s.naoVinculados !== 1 ? 's' : ''} não vinculado{s.naoVinculados !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Vincule aos produtos cadastrados para ver classificação de lucratividade
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-center">
            <p className="text-lg font-extrabold text-success">{s.lucrativos}</p>
            <p className="text-[11px] font-bold text-success">✅ Lucrativos</p>
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-center">
            <p className="text-lg font-extrabold text-warning">{s.atencao}</p>
            <p className="text-[11px] font-bold text-warning">🟠 Atenção</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
            <p className="text-lg font-extrabold text-destructive">{s.prejuizo}</p>
            <p className="text-[11px] font-bold text-destructive">🔴 Prejuízo</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center cursor-help">
                  <p className={cn('text-lg font-extrabold font-mono', s.avgScore >= 60 ? 'text-primary' : 'text-warning')}>
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
