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

function getRoasBg(roas: number) {
  if (roas >= 5) return 'bg-success/10 border-success/20';
  if (roas >= 2) return 'bg-warning/10 border-warning/20';
  return 'bg-destructive/10 border-destructive/20';
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
        'rounded-2xl border p-4 cursor-pointer transition-all active:scale-[0.995]',
        isLinked
          ? 'border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
          : 'border-dashed border-border/60 bg-card/50 hover:border-primary/30'
      )}
      onClick={onClick}
    >
      {/* ── HEADER: image + name + badge + actions ── */}
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</h3>
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
            <span className="text-[10px] text-muted-foreground font-mono">{periodLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {isLinked && (
            <button
              onClick={onLink}
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Trocar vínculo"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── PRIMARY METRICS: 3-column cards (like ProductCard) ── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* ROAS */}
        <div className={cn('rounded-xl p-2.5 flex flex-col items-start border', getRoasBg(roasDireto))}>
          <p className={cn('font-mono text-base font-extrabold leading-tight', getRoasColor(roasDireto))}>
            {roasDireto.toFixed(2)}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">ROAS</p>
          {efficiency && isLinked && ad.classificacao && (
            <p className={cn('text-[9px] font-bold font-mono mt-0.5', efficiency.color)}>
              Score {efficiency.score}/100
            </p>
          )}
        </div>

        {/* GMV */}
        <div className="rounded-xl p-2.5 flex flex-col items-start border border-border/60 bg-secondary/30">
          <p className="font-mono text-sm font-extrabold leading-tight text-foreground truncate w-full">
            {fmt(ad.gmv)}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">GMV</p>
        </div>

        {/* Gasto */}
        <div className="rounded-xl p-2.5 flex flex-col items-start border border-border/60 bg-secondary/30">
          <p className="font-mono text-sm font-extrabold leading-tight text-foreground truncate w-full">
            {fmt(ad.despesas)}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Gasto</p>
        </div>
      </div>

      {/* ── SECONDARY METRICS: 3-column smaller row ── */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {/* Posição */}
        <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">Posição</span>
          <span className={cn('text-xs font-bold font-mono', hasPosition ? getPositionColor(ad.posicao_media!) : 'text-muted-foreground')}>
            {hasPosition ? `#${ad.posicao_media}` : '—'}
          </span>
        </div>

        {/* Vendas */}
        <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">Vendas</span>
          <span className="text-xs font-bold font-mono text-foreground">{ad.itens_vendidos} un</span>
        </div>

        {/* Custo/Un */}
        <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">Custo/Un</span>
          <span className="text-xs font-bold font-mono text-foreground">
            {custoUn > 0 ? fmt(custoUn) : '—'}
          </span>
        </div>
      </div>

      {/* ── ACTION AREA: unlinked ── */}
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

      {/* ── WARNING: linked but no price ── */}
      {isLinked && (!ad.roas_empate || ad.roas_empate <= 0) && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-xs text-warning">⚠️ Produto sem custo/preço configurado.</p>
        </div>
      )}
    </div>
  );
}
