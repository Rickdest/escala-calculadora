import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Package, MapPin, Link2, Clock } from 'lucide-react';
import { fmt, getClassCor, getRoasColor, getDiasPeriodo } from './adsHelpers';
import { calcAdEfficiencyScore, calcHaloEffect, calcCostVsMarginAlert, classificarPosicao } from '@/lib/adsLogic';

function ScoreDots({ score }: { score: number }) {
  const filled = Math.round(score / 10);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i < filled
              ? score >= 80 ? 'bg-success' : score >= 60 ? 'bg-primary' : score >= 40 ? 'bg-warning' : 'bg-destructive'
              : 'bg-surface-2'
          )}
        />
      ))}
    </div>
  );
}

export function AdsProductCard({
  ad, onClick, onLink, onUpdatePosition,
}: {
  ad: EnrichedAdsData;
  onClick: () => void;
  onLink: () => void;
  onUpdatePosition: () => void;
}) {
  const cls = getClassCor(ad.classificacao);
  const ClsIcon = cls.icon;
  const periodLabel = (() => {
    const f = (d: string) => { const parts = d.split('-'); return `${parts[2]}/${parts[1]}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)}`;
  })();

  const roasDireto = ad.roas_direto || ad.roas;
  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;

  const efficiency = useMemo(() =>
    calcAdEfficiencyScore(roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media),
    [roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media]
  );

  const halo = useMemo(() =>
    calcHaloEffect(ad.gmv, ad.gmv_direto, ad.itens_vendidos, (ad as any).itens_vendidos_diretos || 0),
    [ad.gmv, ad.gmv_direto, ad.itens_vendidos, (ad as any).itens_vendidos_diretos]
  );

  const costAlert = useMemo(() => {
    const lucro = ad.roasEmpateResult?.lucroPorUnidade;
    if (!lucro || lucro <= 0) return null;
    return calcCostVsMarginAlert(ad.despesas, ad.itens_vendidos, lucro);
  }, [ad.despesas, ad.itens_vendidos, ad.roasEmpateResult]);

  const posInfo = ad.posicao_media !== null ? classificarPosicao(ad.posicao_media) : null;

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Row 1: Product info + Score */}
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-text-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
              <ClsIcon className="w-3 h-3" /> {cls.label}
            </span>
            {emAprendizado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                <Clock className="w-3 h-3" /> Aprendizado
              </span>
            )}
            <span className="text-[10px] text-text-3 font-mono tabular-nums">{periodLabel}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          <p className={cn('text-lg font-extrabold font-mono tabular-nums', efficiency.color)}>
            {efficiency.score}<span className="text-[10px] text-text-3 font-normal">/100</span>
          </p>
          <ScoreDots score={efficiency.score} />
        </div>
      </div>

      {/* Row 2: 3 KPI boxes */}
      <div className="grid grid-cols-3 gap-2">
        {/* ROAS */}
        <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
          <p className="section-label">ROAS</p>
          <p className={cn('text-lg font-extrabold font-mono tabular-nums mt-0.5', getRoasColor(roasDireto))}>
            {roasDireto.toFixed(2)}
          </p>
          {ad.roas_empate ? (
            <p className="text-[9px] text-text-3 font-mono">vs {ad.roas_empate.toFixed(2)}</p>
          ) : (
            <p className="text-[9px] text-text-3">—</p>
          )}
        </div>
        {/* Posição */}
        <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
          <p className="section-label">Posição</p>
          {ad.posicao_media !== null ? (
            <>
              <p className="text-lg font-extrabold font-mono tabular-nums mt-0.5 text-foreground">#{ad.posicao_media}</p>
              <p className="text-[9px] text-text-3">{posInfo?.label.split('—')[0].trim()}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-extrabold font-mono tabular-nums mt-0.5 text-text-3">—</p>
              <p className="text-[9px] text-text-3">Importe CSV</p>
            </>
          )}
        </div>
        {/* Custo/Unidade */}
        <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
          <p className="section-label">Custo/Un</p>
          {costAlert ? (
            <>
              <p className={cn('text-lg font-extrabold font-mono tabular-nums mt-0.5',
                costAlert.level === 'safe' ? 'text-success' : costAlert.level === 'warning' ? 'text-warning' : 'text-destructive'
              )}>
                {fmt(costAlert.custoPorUnidade)}
              </p>
              <p className="text-[9px] text-text-3">{costAlert.pctConsumo.toFixed(0)}% do lucro</p>
            </>
          ) : (
            <>
              <p className="text-lg font-extrabold font-mono tabular-nums mt-0.5 text-foreground">
                {ad.itens_vendidos > 0 ? fmt(ad.despesas / ad.itens_vendidos) : '—'}
              </p>
              <p className="text-[9px] text-text-3">—</p>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Key metrics line */}
      <div className="text-[11px] text-text-2 font-mono tabular-nums space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{ad.itens_vendidos} un vendidas</span>
          <span className="text-text-3">·</span>
          <span>{ad.conversoes || ad.itens_vendidos} pedidos</span>
          <span className="text-text-3">·</span>
          <span>Gasto {fmt(ad.despesas)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span>GMV {fmt(ad.gmv)}</span>
          {ad.gmv_direto > 0 && ad.gmv_direto !== ad.gmv && (
            <>
              <span className="text-text-3">·</span>
              <span>Direta {fmt(ad.gmv_direto)}</span>
            </>
          )}
        </div>
      </div>

      {/* Row 4: Halo effect */}
      {halo && (
        <p className={cn('text-[11px] font-mono tabular-nums', halo.isSignificant ? 'text-primary font-bold' : 'text-text-3')}>
          {halo.isSignificant ? '🔗 ' : ''}+{fmt(halo.haloGmv)} em vendas indiretas ({halo.haloPct.toFixed(1)}%)
        </p>
      )}

      {/* Row 5: ROAS bar */}
      {ad.roas_empate && roasDireto > 0 && (
        <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all',
              roasDireto >= ad.roas_empate ? 'bg-success' : 'bg-destructive'
            )}
            style={{ width: `${Math.min((roasDireto / (ad.roas_empate * 2)) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Link button */}
      {!ad.product_id && (
        <button
          onClick={(e) => { e.stopPropagation(); onLink(); }}
          className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <Link2 className="w-3 h-3" /> Vincular ao cadastro
        </button>
      )}

      {ad.posicao_media !== null && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono tabular-nums text-text-2">
          <MapPin className="w-3 h-3 text-primary" /> Pos. #{ad.posicao_media}
        </span>
      )}
    </div>
  );
}
