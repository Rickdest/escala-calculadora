import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Package, MapPin, Link2, Clock } from 'lucide-react';
import { fmt, getClassCor, getRoasColor, getDiasPeriodo } from './adsHelpers';

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

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-text-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
              <ClsIcon className="w-3 h-3" /> {cls.label}
            </span>
            {emAprendizado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                <Clock className="w-3 h-3" /> Aprendizado
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-foreground truncate mt-1.5">{ad.nome_produto_csv}</p>
          <p className="text-[11px] text-text-3 font-mono tabular-nums">{periodLabel}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('text-xl font-extrabold font-mono tabular-nums', getRoasColor(roasDireto))}>
            {roasDireto.toFixed(2)}
          </p>
          <p className="text-[10px] text-text-3">ROAS</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-text-2 font-mono tabular-nums">
        <span>GMV {fmt(ad.gmv)}</span>
        <span className="text-text-3">·</span>
        <span>Gasto {fmt(ad.despesas)}</span>
        {ad.roas_empate && (
          <>
            <span className="text-text-3">·</span>
            <span>vs Empate {ad.roas_empate.toFixed(2)}</span>
          </>
        )}
      </div>

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
