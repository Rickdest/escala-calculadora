import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Package, MapPin, Link2, Clock, Plus, HelpCircle, Trash2, Upload } from 'lucide-react';
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

function ProgressDots({ level }: { level: 1 | 2 | 3 }) {
  const dotColor = level === 1 ? 'bg-warning' : level === 2 ? 'bg-primary' : 'bg-success';
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            i <= level ? dotColor : 'bg-surface-2'
          )}
        />
      ))}
      <span className="text-[10px] font-bold text-text-3 ml-0.5">{level}/3</span>
      {level === 3 && <span className="text-[10px]">✓</span>}
    </div>
  );
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
  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;
  const isLinked = !!ad.product_id;
  const hasPosition = ad.posicao_importada && ad.posicao_media !== null && ad.posicao_media > 0;

  // product_id is the PRIMARY criterion for level
  const level: 1 | 2 | 3 = !isLinked ? 1 : hasPosition ? 3 : 2;

  const cls = getClassCor(isLinked ? ad.classificacao : null);
  const ClsIcon = cls.icon;

  // Only compute efficiency when linked
  const efficiency = useMemo(() =>
    isLinked ? calcAdEfficiencyScore(roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media) : null,
    [roasDireto, ad.roas_empate, ad.ctr, ad.taxa_conversao, ad.posicao_media, isLinked]
  );

  const halo = useMemo(() =>
    calcHaloEffect(ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos || 0),
    [ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos]
  );

  const costAlert = useMemo(() => {
    const lucro = ad.roasEmpateResult?.lucroPorUnidade;
    if (!lucro || lucro <= 0) return null;
    return calcCostVsMarginAlert(ad.despesas, ad.itens_vendidos, lucro);
  }, [ad.despesas, ad.itens_vendidos, ad.roasEmpateResult]);

  const posInfo = ad.posicao_media !== null ? classificarPosicao(ad.posicao_media) : null;

  const hasClassification = isLinked && ad.classificacao;

  // ═══ STATE 1: Unlinked (even if has position) ═══
  if (!isLinked) {
    return (
      <div
        className="rounded-xl border-2 border-dashed border-warning/30 bg-warning/5 p-4 space-y-3 cursor-pointer hover:border-warning/50 transition-colors active:scale-[0.99] relative"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-text-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</p>
            <p className="text-[11px] text-text-3 mt-0.5">Não vinculado · {periodLabel}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-text-3 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Basic metrics */}
        <div className="text-[11px] text-text-2 font-mono tabular-nums flex items-center gap-2 flex-wrap">
          <span className={cn('font-bold', getRoasColor(roasDireto))}>ROAS {roasDireto.toFixed(2)}</span>
          <span className="text-text-3">·</span>
          <span>{ad.itens_vendidos} un</span>
          <span className="text-text-3">·</span>
          <span>Gasto {fmt(ad.despesas)}</span>
          <span className="text-text-3">·</span>
          <span>GMV {fmt(ad.gmv)}</span>
        </div>

        {/* Show position as extra info if available but unlinked */}
        {hasPosition && (
          <div className="text-[11px] text-text-2 font-mono tabular-nums flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary" />
            <span>Posição #{ad.posicao_media}</span>
            <span className="text-text-3">·</span>
            <span className="text-[10px] text-text-3">{posInfo?.label}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onLink}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary/30 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> Vincular produto
          </button>
          <button
            onClick={onQuickRegister}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastro Rápido
          </button>
        </div>

        <p className="text-[10px] text-warning font-bold">
          ⚠️ Vincule um produto para desbloquear classificação e score
        </p>

        {/* Progress dots bottom-right */}
        <div className="absolute bottom-3 right-3">
          <ProgressDots level={1} />
        </div>
      </div>
    );
  }

  // ═══ STATE 2 & 3: Linked (with or without position) ═══
  const borderClass = level === 3
    ? (ad.classificacao === 'LUCRATIVO' ? 'border-success/20 bg-success/5' : ad.classificacao === 'PREJUIZO' ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-card')
    : 'border-border bg-card';

  return (
    <div
      className={cn('rounded-xl border p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99] relative', borderClass)}
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
          <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv || 'Produto sem nome'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {hasClassification ? (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
                <ClsIcon className="w-3 h-3" /> {cls.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-surface-2 text-[10px] font-bold text-text-3">
                <HelpCircle className="w-3 h-3" /> Pendente
              </span>
            )}
            {emAprendizado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                <Clock className="w-3 h-3" /> Aprendizado
              </span>
            )}
            <span className="text-[10px] text-text-3 font-mono tabular-nums">{periodLabel}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          {efficiency && hasClassification && (
            <>
              <p className={cn('text-lg font-extrabold font-mono tabular-nums', efficiency.color)}>
                {efficiency.score}<span className="text-[10px] text-text-3 font-normal">/100</span>
              </p>
              <ScoreDots score={efficiency.score} />
            </>
          )}
        </div>
      </div>

      {/* Row 2: 3 KPI boxes */}
      <div className="grid grid-cols-3 gap-2">
        {hasPosition ? (
          <>
            <div className={cn(
              'rounded-lg border-2 p-2.5 text-center relative overflow-hidden ring-2',
              posInfo?.classe === 'TOPO' ? 'border-success/40 bg-success/10 ring-success/20' :
              posInfo?.classe === 'PRIMEIRA_PAGINA' ? 'border-primary/40 bg-primary/10 ring-primary/20' :
              'border-warning/40 bg-warning/10 ring-warning/20'
            )}>
              <div className="absolute top-0 right-0">
                <span className={cn(
                  'text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl-lg',
                  posInfo?.classe === 'TOPO' ? 'bg-success text-success-foreground' :
                  posInfo?.classe === 'PRIMEIRA_PAGINA' ? 'bg-primary text-primary-foreground' :
                  'bg-warning text-warning-foreground'
                )}>
                  {posInfo?.classe === 'TOPO' ? '🏆 TOPO' : posInfo?.classe === 'PRIMEIRA_PAGINA' ? '📍 PÁG.1' : '📍 PÁG.2+'}
                </span>
              </div>
              <p className="section-label flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> POSIÇÃO
              </p>
              <p className={cn(
                'text-2xl font-black font-mono tabular-nums mt-0.5',
                posInfo?.classe === 'TOPO' ? 'text-success' :
                posInfo?.classe === 'PRIMEIRA_PAGINA' ? 'text-primary' : 'text-warning'
              )}>
                #{ad.posicao_media}
              </p>
              <p className={cn('text-[9px] font-bold',
                posInfo?.classe === 'TOPO' ? 'text-success' :
                posInfo?.classe === 'PRIMEIRA_PAGINA' ? 'text-primary' : 'text-warning'
              )}>
                {posInfo?.label.split('—')[0].trim()}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
              <p className="section-label">ROAS</p>
              <p className={cn('text-lg font-extrabold font-mono tabular-nums mt-0.5', getRoasColor(roasDireto))}>
                {roasDireto.toFixed(2)}
              </p>
              {ad.roas_empate && ad.roas_empate > 0 ? (
                <p className="text-[9px] text-text-3 font-mono">emp {ad.roas_empate.toFixed(2)}</p>
              ) : (
                <p className="text-[9px] text-text-3">—</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
              <p className="section-label">ROAS</p>
              <p className={cn('text-lg font-extrabold font-mono tabular-nums mt-0.5', getRoasColor(roasDireto))}>
                {roasDireto.toFixed(2)}
              </p>
              {ad.roas_empate && ad.roas_empate > 0 ? (
                <p className="text-[9px] text-text-3 font-mono">emp {ad.roas_empate.toFixed(2)}</p>
              ) : (
                <p className="text-[9px] text-text-3">—</p>
              )}
            </div>

            <div
              className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-2.5 text-center cursor-pointer hover:bg-primary/15 hover:border-primary/60 transition-all group"
              onClick={(e) => { e.stopPropagation(); onUpdatePosition(); }}
            >
              <p className="section-label flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> POSIÇÃO
              </p>
              <p className="text-2xl font-bold text-text-3 mt-0.5 group-hover:text-primary transition-colors">—</p>
              <p className="text-[9px] text-primary font-bold flex items-center justify-center gap-0.5 animate-pulse">
                <Upload className="w-3 h-3" /> Importar CSV
              </p>
            </div>
          </>
        )}

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

      {/* Row 3: Key metrics */}
      <div className="text-[11px] text-text-2 font-mono tabular-nums flex items-center gap-2 flex-wrap">
        <span>{ad.itens_vendidos} un</span>
        <span className="text-text-3">·</span>
        <span>Gasto {fmt(ad.despesas)}</span>
        <span className="text-text-3">·</span>
        <span>GMV {fmt(ad.gmv)}</span>
      </div>

      {/* Halo effect */}
      {halo && (
        <p className={cn('text-[11px] font-mono tabular-nums', halo.isSignificant ? 'text-primary font-bold' : 'text-text-3')}>
          {halo.isSignificant ? '🔗 ' : ''}+{fmt(halo.haloGmv)} em vendas indiretas ({halo.haloPct.toFixed(1)}%)
        </p>
      )}

      {/* Diagnostic for complete cards */}
      {level === 3 && hasClassification && (
        <p className={cn('text-[11px] font-bold', cls.color)}>
          {ad.classificacao === 'LUCRATIVO' ? '🚀' : '⚠️'} {cls.label}
          {ad.roas_empate ? ` · Meta: ${ad.roas_empate.toFixed(1)}` : ''}
        </p>
      )}

      {/* ROAS bar — only when linked with classification data */}
      {isLinked && ad.roas_empate && ad.roas_empate > 0 && roasDireto > 0 && (
        <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all',
              roasDireto >= ad.roas_empate ? 'bg-success' : 'bg-destructive'
            )}
            style={{ width: `${Math.min((roasDireto / (ad.roas_empate * 2)) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Delete + Progress dots */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-text-3 hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ProgressDots level={level} />
      </div>
    </div>
  );
}
