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
        'rounded-xl border p-3 md:p-4 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.995]',
        isLinked ? 'border-border bg-card' : 'border-dashed border-warning/30 bg-warning/5'
      )}
      onClick={onClick}
    >
      {/* Row 1: Header */}
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-lg border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
            <Package className="w-4.5 h-4.5 text-text-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {isLinked ? (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold', cls.bg, cls.color)}>
                {cls.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-warning/30 bg-warning/10 text-[11px] font-bold text-warning">
                🔗 Não vinculado
              </span>
            )}
            <span className="text-[11px] text-text-3 font-mono">{periodLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {efficiency && isLinked && ad.classificacao && (
            <span className={cn('text-lg font-extrabold font-mono tabular-nums', efficiency.color)}>
              {efficiency.score}<span className="text-[10px] text-text-3 font-normal">/100</span>
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-text-3 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: KPIs — fixed-width grid columns */}
      <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-6 gap-x-1 gap-y-1.5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">ROAS</p>
          <p className={cn('text-sm font-extrabold font-mono tabular-nums', getRoasColor(roasDireto))}>{roasDireto.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">GMV</p>
          <p className="text-[13px] font-extrabold font-mono tabular-nums text-foreground truncate">{fmt(ad.gmv)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Gasto</p>
          <p className="text-[13px] font-extrabold font-mono tabular-nums text-foreground truncate">{fmt(ad.despesas)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Vendas</p>
          <p className="text-sm font-extrabold font-mono tabular-nums text-foreground">{ad.itens_vendidos} un</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Posição</p>
          <p className={cn('text-sm font-extrabold font-mono tabular-nums', hasPosition ? getPositionColor(ad.posicao_media!) : 'text-text-3')}>
            {hasPosition ? `#${ad.posicao_media}` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Custo/Un</p>
          <p className="text-[13px] font-extrabold font-mono tabular-nums text-foreground truncate">{custoUn > 0 ? fmt(custoUn) : '—'}</p>
        </div>
      </div>

      {/* Row 3: ROAS bar or action buttons */}
      {isLinked && ad.roas_empate && ad.roas_empate > 0 && roasDireto > 0 ? (
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                roasDireto >= ad.roas_empate ? 'bg-success' : 'bg-destructive'
              )}
              style={{ width: `${Math.min((roasDireto / (ad.roas_empate * 2)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-text-3 font-mono tabular-nums flex-shrink-0">
            vs {ad.roas_empate.toFixed(2)} ({(roasDireto / ad.roas_empate).toFixed(1)}x)
          </span>
        </div>
      ) : !isLinked ? (
        <div className="mt-2.5 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-warning flex-1">⚠️ Vincule para ver lucratividade</p>
          <button
            onClick={onLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary/30 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> Vincular
          </button>
          <button
            onClick={onQuickRegister}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
