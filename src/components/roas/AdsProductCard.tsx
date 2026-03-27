import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Package, Link2, Plus, Trash2 } from 'lucide-react';
import { fmt, getClassCor, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';

function getPositionColor(pos: number) {
  if (pos <= 3) return 'text-success';
  if (pos <= 8) return 'text-primary';
  if (pos <= 16) return 'text-warning';
  return 'text-destructive';
}

export function AdsProductCard({
  ad, onClick, onLink, onQuickRegister, onUpdatePosition, onDelete,
}: {
  ad: EnrichedAdsData;
  onClick: () => void;
  onLink: () => void;
  onQuickRegister: () => void;
  onUpdatePosition: () => void;
  onDelete: () => void;
}) {
  const periodLabel = (() => {
    const f = (d: string) => { const parts = d.split('-'); return `${parts[2]}/${parts[1]}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)}`;
  })();

  const roasDireto = ad.roas_direto && ad.roas_direto > 0 ? ad.roas_direto : ad.roas;
  const isLinked = !!ad.product_id;
  const hasPosition = ad.posicao_importada && ad.posicao_media !== null && ad.posicao_media > 0;
  const cls = getClassCor(isLinked ? ad.classificacao : null);

  const efficiency = useMemo(() =>
    isLinked ? calcAdEfficiencyScore(roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media) : null,
    [roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media, isLinked]
  );

  const custoUn = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 md:p-4 cursor-pointer transition-all active:scale-[0.995]',
        isLinked
          ? 'border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
          : 'border-dashed border-border/60 bg-card/50 hover:border-primary/30'
      )}
      onClick={onClick}
    >
      {/* Row 1: Header with ROAS highlight */}
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-border" />
        ) : (
          <div className="w-14 h-14 rounded-xl border border-border/60 bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-text-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {isLinked ? (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold', cls.bg, cls.color)}>
                {cls.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border/60 bg-surface-2 text-[11px] font-medium text-text-3">
                🔗 Não vinculado
              </span>
            )}
            <span className="text-[11px] text-text-3 font-mono">{periodLabel}</span>
          </div>
        </div>
        {/* ROAS prominente no canto direito */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="text-right">
            <p className={cn('text-xl font-black font-mono tabular-nums leading-none', getRoasColor(roasDireto))}>
              {roasDireto.toFixed(2)}
            </p>
            <p className="text-[9px] text-text-3 font-medium mt-0.5">ROAS</p>
          </div>
          {efficiency && isLinked && ad.classificacao && (
            <span className={cn('text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-surface-2', efficiency.color)}>
              {efficiency.score}/100
            </span>
          )}
        </div>
      </div>

      {/* Row 2: KPIs — 5 metrics in a cleaner layout */}
      <div className="mt-3 grid grid-cols-5 gap-1">
        {[
          { label: 'GMV', value: fmt(ad.gmv) },
          { label: 'Gasto', value: fmt(ad.despesas) },
          { label: 'Vendas', value: `${ad.itens_vendidos} un` },
          { label: 'Posição', value: hasPosition ? `#${ad.posicao_media}` : '—', color: hasPosition ? getPositionColor(ad.posicao_media!) : 'text-text-3' },
          { label: 'Custo/Un', value: custoUn > 0 ? fmt(custoUn) : '—' },
        ].map(kpi => (
          <div key={kpi.label} className="text-center min-w-0 overflow-hidden">
            <p className="text-[9px] uppercase tracking-wider text-text-3 font-bold">{kpi.label}</p>
            <p className={cn('text-[12px] font-bold font-mono tabular-nums truncate mt-0.5', kpi.color || 'text-text-2')}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Row 3: ROAS bar or action buttons */}
      {isLinked && ad.roas_empate && ad.roas_empate > 0 && roasDireto > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                roasDireto >= ad.roas_empate ? 'bg-success' : 'bg-destructive'
              )}
              style={{ width: `${Math.min((roasDireto / (ad.roas_empate * 2)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-text-3 font-mono tabular-nums flex-shrink-0">
            vs {ad.roas_empate.toFixed(2)} ({(roasDireto / ad.roas_empate).toFixed(1)}x)
          </span>
        </div>
      ) : !isLinked ? (
        <div className="mt-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          <p className="text-[11px] text-text-3">Vincule a um produto para ver lucratividade</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" /> Vincular
            </button>
            <button
              onClick={onQuickRegister}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar
            </button>
          </div>
        </div>
      ) : null}

      {/* Delete button - subtle in bottom right */}
      <div className="flex justify-end mt-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onDelete}
          className="p-1 rounded-lg text-text-3/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
