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

  const metrics = [
    { label: 'ROAS', value: roasDireto.toFixed(2), color: getRoasColor(roasDireto) },
    { label: 'GMV', value: fmt(ad.gmv) },
    { label: 'Gasto', value: fmt(ad.despesas) },
    { label: 'Vendas', value: `${ad.itens_vendidos} un` },
    { label: 'Posição', value: hasPosition ? `#${ad.posicao_media}` : '—', color: hasPosition ? getPositionColor(ad.posicao_media!) : 'text-text-3' },
    { label: 'Custo/Un', value: custoUn > 0 ? fmt(custoUn) : '—' },
  ];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 cursor-pointer transition-all active:scale-[0.995]',
        isLinked
          ? 'border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
          : 'border-dashed border-border/60 bg-card/50 hover:border-primary/30'
      )}
      onClick={onClick}
    >
      {/* Header: image + name + badge + period + delete */}
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-border" />
        ) : (
          <div className="w-10 h-10 rounded-lg border border-border/60 bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-text-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {isLinked ? (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
                {cls.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/15 text-[10px] font-bold text-primary">
                🔗 Não vinculado
              </span>
            )}
            <span className="text-[10px] text-text-3 font-mono">{periodLabel}</span>
            {efficiency && isLinked && ad.classificacao && (
              <span className={cn('text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-surface-2', efficiency.color)}>
                {efficiency.score}/100
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isLinked && (
            <button
              onClick={onLink}
              className="p-1.5 rounded-lg text-text-3/40 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Trocar vínculo"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-text-3/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics: 6 columns */}
      <div className="mt-3 grid grid-cols-6 gap-1 py-3 border-t border-border/40">
        {metrics.map(m => (
          <div key={m.label} className="text-center min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-text-3 font-bold">{m.label}</p>
            <p className={cn('text-xs font-bold font-mono tabular-nums truncate mt-0.5', m.color || 'text-text-2')}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Action area — only for unlinked */}
      {!isLinked && (
        <div className="mt-3 pt-3 border-t border-border/40" onClick={e => e.stopPropagation()}>
          <p className="text-[11px] text-warning mb-2 flex items-center gap-1">⚠️ Vincule para ver lucratividade</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary/30 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" /> Vincular
            </button>
            <button
              onClick={onQuickRegister}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary bg-transparent text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar
            </button>
          </div>
        </div>
      )}
      {isLinked && (!ad.roas_empate || ad.roas_empate <= 0) && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-xs text-warning">⚠️ Produto sem custo/preço configurado.</p>
        </div>
      )}
    </div>
  );
}
