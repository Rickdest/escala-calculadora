import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Package, Link2, Plus, Trash2, ArrowLeftRight, MapPin, ShoppingCart, DollarSign } from 'lucide-react';
import { fmt, fmtShort, getClassCor, getRoasColor } from './adsHelpers';
import { calcAdEfficiencyScore } from '@/lib/adsLogic';
import { Button } from '@/components/ui/button';

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

  // Status color for top accent bar
  const accentColor = isLinked
    ? ad.classificacao === 'LUCRATIVO' ? 'bg-success'
    : ad.classificacao === 'PREJUIZO' ? 'bg-destructive'
    : ad.classificacao === 'MARGEM_APERTADA' || ad.classificacao === 'ABAIXO_EMPATE' ? 'bg-warning'
    : 'bg-muted-foreground'
    : 'bg-warning';

  return (
    <div
      className="rounded-card border border-border bg-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.995] overflow-hidden"
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div className={cn('h-1 w-full', accentColor)} />

      <div className="p-4 space-y-3">
        {/* ── HEADER: image + name + badge ── */}
        <div className="flex items-start gap-3">
          {ad.product?.imageUrl ? (
            <img src={ad.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-subtitle text-foreground line-clamp-2 leading-tight">{ad.nome_produto_csv || 'Produto sem nome'}</h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {isLinked ? (
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-badge border text-micro', cls.bg, cls.color)}>
                  {cls.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-badge border border-warning/30 bg-warning/15 text-micro text-warning">
                  ⚠️ Não vinculado
                </span>
              )}
              <span className="text-micro text-muted-foreground font-mono">{periodLabel}</span>
              {source === 'csv' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-badge border border-border bg-secondary text-micro text-muted-foreground font-bold">CSV</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Draft product warning */}
        {isLinked && ad.product?.draft && (
          <div className="flex items-center gap-1.5 text-[11px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1">
            ⚠ Produto sem custo · 
            <button 
              onClick={(e) => { e.stopPropagation(); window.location.href = `/products/${ad.product_id}`; }}
              className="underline underline-offset-2 hover:text-warning/80"
            >
              preencher →
            </button>
          </div>
        )}

        {/* ── PRIMARY METRICS: ROAS + GMV + Gasto ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className={cn('font-mono text-2xl font-extrabold leading-tight', getRoasColor(roasDireto))}>
              {roasDireto.toFixed(2)}
            </p>
            <p className="label-metric">ROAS</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {fmtShort(ad.gmv)}
            </p>
            <p className="label-metric">GMV</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {fmtShort(ad.despesas)}
            </p>
            <p className="label-metric">GASTO</p>
          </div>
        </div>

        {/* ── SECONDARY METRICS ── */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-2.5">
          <div className="text-center">
            <p className={cn('font-mono text-lg font-extrabold leading-tight', hasPosition ? getPositionColor(ad.posicao_media!) : 'text-muted-foreground')}>
              {hasPosition ? `#${ad.posicao_media}` : '—'}
            </p>
            <p className="label-metric">POSIÇÃO</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {ad.itens_vendidos}
            </p>
            <p className="label-metric">VENDAS</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {custoUn > 0 ? fmtShort(custoUn) : '—'}
            </p>
            <p className="label-metric">CUSTO/UN</p>
          </div>
        </div>

        {/* ── ACTION: linked — "Ver Detalhes" or "Trocar" ── */}
        {isLinked && (
          <div className="pt-1" onClick={e => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold gap-1.5 h-9"
              onClick={onClick}
            >
              Ver Detalhes
            </Button>
          </div>
        )}

        {/* ── ACTION: unlinked — ghost buttons ── */}
        {!isLinked && (
          <div className="pt-1" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={onLink} className="text-xs font-bold gap-1 h-9">
                <Link2 className="w-3.5 h-3.5" /> Vincular
              </Button>
              <Button variant="ghost" size="sm" onClick={onQuickRegister} className="text-xs font-bold gap-1 h-9">
                <Plus className="w-3.5 h-3.5" /> Cadastrar
              </Button>
            </div>
          </div>
        )}

        {/* ── WARNING: linked but no price ── */}
        {isLinked && (!ad.roas_empate || ad.roas_empate <= 0) && (
          <p className="text-micro text-warning">⚠️ Produto sem custo/preço configurado.</p>
        )}
      </div>
    </div>
  );
}
