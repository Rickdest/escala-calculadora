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
      className="rounded-2xl border border-border bg-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.995] overflow-hidden"
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
            <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">{ad.nome_produto_csv || 'Produto sem nome'}</h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {isLinked ? (
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
                  {cls.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-warning/30 bg-warning/15 text-[10px] font-bold text-warning">
                  ⚠️ Não vinculado
                </span>
              )}
              <span className="text-[10px] text-muted-foreground font-mono">{periodLabel}</span>
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

        {/* ── PRIMARY METRICS: ROAS + GMV + Gasto ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className={cn('font-mono text-2xl font-extrabold leading-tight', getRoasColor(roasDireto))}>
              {roasDireto.toFixed(2)}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">ROAS</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {fmtShort(ad.gmv)}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">GMV</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-extrabold leading-tight text-foreground">
              {fmtShort(ad.despesas)}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">GASTO</p>
          </div>
        </div>

        {/* ── SECONDARY METRICS: subtle bottom row ── */}
        <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {hasPosition ? <span className={cn('font-bold text-sm', getPositionColor(ad.posicao_media!))}>#{ad.posicao_media}</span> : <span>—</span>}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-mono">
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold text-foreground">{ad.itens_vendidos}</span> un
          </div>
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground font-mono">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold text-foreground">{custoUn > 0 ? fmtShort(custoUn) : '—'}</span>
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
          <p className="text-[10px] text-warning">⚠️ Produto sem custo/preço configurado.</p>
        )}
      </div>
    </div>
  );
}
