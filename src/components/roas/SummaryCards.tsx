import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { fmt, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore, calcHaloEffect } from '@/lib/adsLogic';

export function SummaryCards({ data }: { data: EnrichedAdsData[] }) {
  const s = useMemo(() => {
    const totalGmv = data.reduce((a, d) => a + d.gmv, 0);
    const totalSpend = data.reduce((a, d) => a + d.despesas, 0);
    const totalItems = data.reduce((a, d) => a + d.itens_vendidos, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgCostPerUnit = totalItems > 0 ? totalSpend / totalItems : 0;
    const lucrativos = data.filter(d => d.classificacao === 'LUCRATIVO').length;
    const atencao = data.filter(d => d.classificacao === 'MARGEM_APERTADA' || d.classificacao === 'ABAIXO_EMPATE').length;
    const prejuizo = data.filter(d => d.classificacao === 'PREJUIZO').length;

    // Avg efficiency score — only for linked products
    const linkedData = data.filter(d => !!d.product_id);
    const scores = linkedData.map(d => {
      const rd = d.roas_direto && d.roas_direto > 0 ? d.roas_direto : d.roas;
      return calcAdEfficiencyScore(rd, d.roas_empate, d.ctr, d.taxa_conversao, d.posicao_media);
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;

    // Total halo
    const totalGmvDireto = data.reduce((a, d) => a + (d.gmv_direto || 0), 0);
    const haloTotal = totalGmv - totalGmvDireto;
    const haloPct = totalGmv > 0 ? (haloTotal / totalGmv) * 100 : 0;

    return { totalGmv, totalSpend, avgRoas, avgCostPerUnit, lucrativos, atencao, prejuizo, total: data.length, avgScore, haloTotal, haloPct };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="section-label">GMV Total</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-foreground mt-1.5">{fmt(s.totalGmv)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="section-label">Gasto Total</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-foreground mt-1.5">{fmt(s.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="section-label">ROAS Médio</p>
          <p className={cn('text-xl font-extrabold font-mono tabular-nums mt-1.5', getRoasColor(s.avgRoas))}>{s.avgRoas.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="section-label">Custo/Un Média</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-foreground mt-1.5">{fmt(s.avgCostPerUnit)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap rounded-lg bg-surface-2 p-2.5 px-3">
        <span className="text-xs font-bold text-success">✅ {s.lucrativos} lucrativos</span>
        <span className="text-xs font-bold text-warning">🟠 {s.atencao} atenção</span>
        <span className="text-xs font-bold text-destructive">🔴 {s.prejuizo} prejuízo</span>
        {s.avgScore > 0 && (
          <>
            <span className="text-text-3">·</span>
            <span className={cn('text-xs font-bold font-mono tabular-nums', s.avgScore >= 60 ? 'text-primary' : 'text-warning')}>
              Score Médio: {s.avgScore}/100
            </span>
          </>
        )}
        {s.haloTotal > 0 && s.haloPct < 90 && (
          <>
            <span className="text-text-3">·</span>
            <span className="text-xs font-bold text-text-2 font-mono tabular-nums">
              Halo: {fmt(s.haloTotal)} ({s.haloPct.toFixed(1)}%)
            </span>
          </>
        )}
      </div>
    </div>
  );
}
