import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { fmt, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';

export function SummaryCards({ data }: { data: EnrichedAdsData[] }) {
  const s = useMemo(() => {
    const totalGmv = data.reduce((a, d) => a + d.gmv, 0);
    const totalSpend = data.reduce((a, d) => a + d.despesas, 0);
    const totalItems = data.reduce((a, d) => a + d.itens_vendidos, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgCostPerUnit = totalItems > 0 ? totalSpend / totalItems : 0;
    const linkedData = data.filter(d => !!d.product_id);
    const lucrativos = linkedData.filter(d => d.classificacao === 'LUCRATIVO').length;
    const atencao = linkedData.filter(d => d.classificacao === 'MARGEM_APERTADA' || d.classificacao === 'ABAIXO_EMPATE').length;
    const prejuizo = linkedData.filter(d => d.classificacao === 'PREJUIZO').length;

    const scores = linkedData.map(d => {
      const rd = d.roas_direto && d.roas_direto > 0 ? d.roas_direto : d.roas;
      return calcAdEfficiencyScore(rd, d.roas_empate, d.ctr, d.taxa_conversao, d.posicao_media);
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;

    const totalGmvDireto = data.reduce((a, d) => a + (d.gmv_direto || 0), 0);
    const haloTotal = totalGmv - totalGmvDireto;
    const haloPct = totalGmv > 0 ? (haloTotal / totalGmv) * 100 : 0;

    return { totalGmv, totalSpend, avgRoas, avgCostPerUnit, lucrativos, atencao, prejuizo, total: data.length, avgScore, haloTotal, haloPct };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'GMV Total', value: fmt(s.totalGmv), color: 'text-foreground' },
          { label: 'Gasto Total', value: fmt(s.totalSpend), color: 'text-foreground' },
          { label: 'ROAS Médio', value: s.avgRoas.toFixed(2), color: getRoasColor(s.avgRoas) },
          { label: 'Custo/Un', value: fmt(s.avgCostPerUnit), color: 'text-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3 md:p-3.5">
            <p className="section-label">{label}</p>
            <p className={cn('text-lg md:text-xl font-extrabold font-mono tabular-nums mt-1', color)}>{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap rounded-lg bg-surface-2 px-3 py-2">
        <span className="text-[11px] font-bold text-success">✅ {s.lucrativos} lucrativos</span>
        <span className="text-[11px] font-bold text-warning">🟠 {s.atencao} atenção</span>
        <span className="text-[11px] font-bold text-destructive">🔴 {s.prejuizo} prejuízo</span>
        {s.avgScore > 0 && (
          <>
            <span className="text-text-3">·</span>
            <span className={cn('text-[11px] font-bold font-mono tabular-nums', s.avgScore >= 60 ? 'text-primary' : 'text-warning')}>
              Score: {s.avgScore}/100
            </span>
          </>
        )}
        {s.haloTotal > 0 && s.haloPct < 90 && (
          <>
            <span className="text-text-3">·</span>
            <span className="text-[11px] font-bold text-text-2 font-mono tabular-nums">
              Halo: {fmt(s.haloTotal)} ({s.haloPct.toFixed(1)}%)
            </span>
          </>
        )}
      </div>
    </div>
  );
}
