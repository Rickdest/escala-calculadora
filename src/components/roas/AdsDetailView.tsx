import { useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import {
  X, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, MapPin,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Percent, Upload,
  Link2, BarChart3, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import {
  calcularRoasEmpate, classificarAnuncio, sugerirMetaRoas,
  classificarPosicao, getDiagnostico, detectarCrossSell,
} from '@/lib/adsLogic';

interface Props {
  ad: EnrichedAdsData;
  onClose: () => void;
  onImportPosition: () => void;
  onLink: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 space-y-0.5">
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      </div>
      <p className="text-base font-extrabold font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AdsDetailView({ ad, onClose, onImportPosition, onLink }: Props) {
  const { currentStore } = useStore();
  const config = currentStore?.config;

  const roasDireto = ad.roas_direto || ad.roas;
  const product = ad.product;

  const empateResult = useMemo(() => {
    if (!product || !config) return null;
    return calcularRoasEmpate(product, config);
  }, [product, config]);

  const roasEmpate = empateResult?.roasEmpate ?? (ad.roas_empate || null);
  const margemContrib = empateResult?.margemContribuicao ?? (ad.margem_contribuicao || null);

  const classification = useMemo(() => {
    if (!roasEmpate || roasEmpate === Infinity) return null;
    return classificarAnuncio(roasDireto, roasEmpate);
  }, [roasDireto, roasEmpate]);

  const metaRoas = useMemo(() => {
    if (!roasEmpate || roasEmpate === Infinity) return null;
    return sugerirMetaRoas(roasEmpate);
  }, [roasEmpate]);

  const posInfo = useMemo(() => {
    if (ad.posicao_media === null) return null;
    return classificarPosicao(ad.posicao_media);
  }, [ad.posicao_media]);

  const diagnostico = useMemo(() => {
    if (ad.posicao_media === null || !roasEmpate || roasEmpate === Infinity) return null;
    return getDiagnostico(ad.posicao_media, roasDireto, roasEmpate);
  }, [ad.posicao_media, roasDireto, roasEmpate]);

  const crossSell = useMemo(() => detectarCrossSell(ad.roas, ad.roas_direto), [ad.roas, ad.roas_direto]);

  const cpc = ad.cliques > 0 ? ad.despesas / ad.cliques : 0;
  const custoVenda = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;
  const lucroPorVenda = empateResult ? empateResult.lucroPorUnidade - custoVenda : null;

  const periodLabel = (() => {
    const f = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)}`;
  })();

  const StatusIcon = classification
    ? (classification.classificacao === 'LUCRATIVO' ? TrendingUp : classification.classificacao === 'PREJUIZO' ? TrendingDown : AlertTriangle)
    : Info;

  const statusColor = classification?.cor || 'muted-foreground';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm truncate">{ad.nome_produto_csv}</h3>
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Section 1: Status */}
          {classification ? (
            <div className={cn('rounded-xl border p-4 space-y-2', `bg-${statusColor}/10 border-${statusColor}/30`)}>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('w-5 h-5', `text-${statusColor}`)} />
                <span className={cn('text-sm font-extrabold uppercase', `text-${statusColor}`)}>{classification.classificacao.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{classification.mensagem}</p>
              {roasEmpate && (
                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <span>ROAS Real: <strong className={`text-${statusColor}`}>{roasDireto.toFixed(2)}</strong></span>
                  <span>Empate: <strong className="text-warning">{roasEmpate.toFixed(2)}</strong></span>
                  <span>Segurança: <strong>{(roasDireto / roasEmpate).toFixed(1)}x</strong></span>
                </div>
              )}
              {roasEmpate && (
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden relative mt-2">
                  <div
                    className={cn('h-full rounded-full', `bg-${statusColor}`)}
                    style={{ width: `${Math.min((roasDireto / (roasEmpate * 2.5)) * 100, 100)}%` }}
                  />
                  <div className="absolute top-0 h-full w-0.5 bg-warning" style={{ left: `${Math.min((roasEmpate / (roasEmpate * 2.5)) * 100, 100)}%` }} />
                </div>
              )}
            </div>
          ) : !product ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-sm font-bold text-warning">Vincule este anúncio a um produto</span>
              </div>
              <p className="text-xs text-muted-foreground">Para calcular o ROAS Empate e ver se é lucrativo.</p>
              <Button onClick={onLink} size="sm" variant="outline" className="h-8 text-xs gap-1.5 mt-1">
                <Link2 className="w-3 h-3" /> Vincular produto
              </Button>
            </div>
          ) : null}

          {/* Section 2: Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Eye} label="Impressões" value={ad.impressoes.toLocaleString('pt-BR')} />
            <Stat icon={MousePointerClick} label="Cliques" value={ad.cliques.toLocaleString('pt-BR')} />
            <Stat icon={Percent} label="CTR" value={`${ad.ctr.toFixed(2)}%`} sub={ad.ctr >= 2 ? 'Bom' : ad.ctr >= 1 ? 'Ok' : 'Baixo'} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={ShoppingCart} label="Conversões" value={String(ad.conversoes || ad.itens_vendidos)} />
            <Stat icon={Percent} label="Taxa Conv." value={`${ad.taxa_conversao.toFixed(2)}%`} sub={ad.taxa_conversao >= 3 ? 'Bom' : 'Baixo'} />
            <Stat icon={DollarSign} label="Custo/Venda" value={custoVenda > 0 ? fmt(custoVenda) : '—'} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={DollarSign} label="GMV" value={fmt(ad.gmv)} />
            <Stat icon={DollarSign} label="Gasto" value={fmt(ad.despesas)} />
            <Stat icon={Percent} label="ACOS" value={`${ad.acos.toFixed(1)}%`} sub={margemContrib ? `Margem: ${margemContrib.toFixed(1)}%` : undefined} />
          </div>

          {/* Section 3: Geral vs Direto */}
          {ad.roas_direto > 0 && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Geral vs Direto</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                <div><p className="text-[9px] text-muted-foreground">ROAS</p><p className="font-bold">G: {ad.roas.toFixed(2)} / D: {ad.roas_direto.toFixed(2)}</p></div>
                <div><p className="text-[9px] text-muted-foreground">ACOS</p><p className="font-bold">G: {ad.acos.toFixed(1)}% / D: {ad.acos_direto.toFixed(1)}%</p></div>
                <div><p className="text-[9px] text-muted-foreground">GMV</p><p className="font-bold">{fmt(ad.gmv)} / {fmt(ad.gmv_direto)}</p></div>
              </div>
              {crossSell && (
                <div className="flex items-start gap-2 pt-1 border-t border-dashed border-border mt-2">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">{crossSell.mensagem}</p>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Config + Meta ROAS */}
          {(ad.metodo_lance || metaRoas) && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              {ad.metodo_lance && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-bold text-foreground">{ad.metodo_lance}</span>
                </div>
              )}
              {ad.status_anuncio && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold text-foreground">{ad.status_anuncio}</span>
                </div>
              )}
              {metaRoas && (
                <div className="space-y-1.5 pt-2 border-t border-dashed border-border">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Meta de ROAS sugerida</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Agressivo', value: metaRoas.agressivo, sub: 'mais GMV' },
                      { label: 'Equilibrado', value: metaRoas.equilibrado, sub: 'ideal' },
                      { label: 'Conservador', value: metaRoas.conservador, sub: 'mais lucro' },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg border border-border bg-secondary/50 p-2 text-center">
                        <p className="text-[9px] text-muted-foreground font-bold">{m.label}</p>
                        <p className="text-base font-extrabold font-mono tabular-nums text-foreground">{m.value}</p>
                        <p className="text-[9px] text-muted-foreground">{m.sub}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Nunca abaixo de {roasEmpate?.toFixed(2)} (seu empate)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Posicionamento */}
          {ad.posicao_media !== null && posInfo ? (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Posicionamento</span>
                <span className="text-base font-extrabold font-mono tabular-nums text-foreground ml-auto">#{ad.posicao_media}</span>
              </div>
              {/* Position ruler */}
              <div className="relative w-full h-8 bg-secondary rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  {[1, 3, 8, 16].map(p => (
                    <div key={p} className="absolute h-full w-px bg-border" style={{ left: `${Math.min((p / 25) * 100, 100)}%` }} />
                  ))}
                </div>
                <div
                  className="absolute top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[9px] font-extrabold text-primary-foreground"
                  style={{ left: `${Math.min((ad.posicao_media / 25) * 100, 96)}%`, transform: 'translateX(-50%)' }}
                >
                  {ad.posicao_media}
                </div>
              </div>
              <p className={cn('text-xs font-bold', posInfo.classe === 'TOPO' ? 'text-success' : posInfo.classe === 'PRIMEIRA_PAGINA' ? 'text-primary' : posInfo.classe === 'SEGUNDA_PAGINA' ? 'text-warning' : 'text-destructive')}>
                {posInfo.label}
              </p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>• Posição 1-3: Topo da busca {ad.posicao_media <= 3 ? '← VOCÊ' : ''}</p>
                <p>• Posição 4-8: Primeira página {ad.posicao_media > 3 && ad.posicao_media <= 8 ? '← VOCÊ' : ''}</p>
                <p>• Posição 9-16: Segunda página {ad.posicao_media > 8 && ad.posicao_media <= 16 ? '← VOCÊ' : ''}</p>
                <p>• Posição 17+: Baixa visibilidade {ad.posicao_media > 16 ? '← VOCÊ' : ''}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Posicionamento</span>
              </div>
              <p className="text-xs text-muted-foreground">Dados de posição não disponíveis.</p>
              <p className="text-[11px] text-muted-foreground">Importe o relatório individual deste produto para análise completa.</p>
              <Button onClick={onImportPosition} size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Importar CSV do Produto
              </Button>
            </div>
          )}

          {/* Section 6: Diagnóstico */}
          {diagnostico ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Diagnóstico Completo
              </p>
              <div className="flex items-start gap-2">
                <span className="text-2xl">{diagnostico.emoji}</span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{diagnostico.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{diagnostico.mensagem}</p>
                  {metaRoas && diagnostico.acaoRoas !== 'pausar' && diagnostico.acaoRoas !== 'manter' && (
                    <p className="text-xs text-primary font-bold mt-1.5">
                      Meta sugerida: {diagnostico.acaoRoas === 'agressivo' ? metaRoas.agressivo : diagnostico.acaoRoas === 'equilibrado' ? metaRoas.equilibrado : metaRoas.conservador}
                    </p>
                  )}
                  {roasEmpate && (
                    <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Nunca abaixo de {roasEmpate.toFixed(2)} (empate)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : roasEmpate && classification ? (
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Diagnóstico
              </p>
              <div className="space-y-1 text-xs">
                <p className={cn('flex items-center gap-1.5', roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                  {roasDireto >= roasEmpate ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  ROAS {(roasDireto / roasEmpate).toFixed(1)}x {roasDireto >= roasEmpate ? 'acima' : 'abaixo'} do empate
                </p>
                <p className={cn('flex items-center gap-1.5', margemContrib && ad.acos < margemContrib ? 'text-success' : 'text-warning')}>
                  {margemContrib && ad.acos < margemContrib ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  ACOS {ad.acos.toFixed(1)}% {margemContrib ? `vs Margem ${margemContrib.toFixed(1)}%` : ''}
                </p>
                <p className={cn('flex items-center gap-1.5', ad.taxa_conversao >= 3 ? 'text-success' : 'text-muted-foreground')}>
                  <Info className="w-3 h-3" /> Taxa conv. {ad.taxa_conversao.toFixed(2)}%
                </p>
                {ad.posicao_media === null && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-3 h-3" /> Importe CSV individual para diagnóstico de posição
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Profit per sale */}
          {lucroPorVenda !== null && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-card p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Lucro/und</p>
                <p className="text-base font-extrabold font-mono tabular-nums text-foreground">{fmt(empateResult!.lucroPorUnidade)}</p>
                <p className="text-[9px] text-muted-foreground">antes de Ads</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Lucro c/ Ads</p>
                <p className={cn('text-base font-extrabold font-mono tabular-nums', lucroPorVenda >= 0 ? 'text-success' : 'text-destructive')}>
                  {fmt(lucroPorVenda)}
                </p>
                <p className="text-[9px] text-muted-foreground">por venda</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
