import { useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import {
  X, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, MapPin,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Percent, Upload,
  Link2, BarChart3, Info, Clock, Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import {
  calcularRoasEmpate, classificarAnuncio, sugerirMetaRoas,
  classificarPosicao, getDiagnostico, detectarCrossSell,
  calcAdEfficiencyScore, calcHaloEffect, calcCostVsMarginAlert,
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
    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 text-text-3" />
        <span className="section-label">{label}</span>
      </div>
      <p className="text-lg font-extrabold font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-text-3">{sub}</p>}
    </div>
  );
}

function getDiasPeriodo(inicio: string, fim: string): number {
  return Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
}

export function AdsDetailView({ ad, onClose, onImportPosition, onLink }: Props) {
  const { currentStore } = useStore();
  const config = currentStore?.config;

  const roasDireto = ad.roas_direto && ad.roas_direto > 0 ? ad.roas_direto : ad.roas;
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

  const efficiency = useMemo(() =>
    calcAdEfficiencyScore(roasDireto, roasEmpate, ad.ctr, ad.taxa_conversao, ad.posicao_media),
    [roasDireto, roasEmpate, ad.ctr, ad.taxa_conversao, ad.posicao_media]
  );

  const halo = useMemo(() =>
    calcHaloEffect(ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos || 0),
    [ad.gmv, ad.gmv_direto, ad.itens_vendidos, ad.itens_vendidos_diretos]
  );

  const costMarginAlert = useMemo(() => {
    const lucro = empateResult?.lucroPorUnidade;
    if (!lucro || lucro <= 0) return null;
    return calcCostVsMarginAlert(ad.despesas, ad.itens_vendidos, lucro);
  }, [ad.despesas, ad.itens_vendidos, empateResult]);

  const cpc = ad.cliques > 0 ? ad.despesas / ad.cliques : 0;
  const custoVenda = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;

  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;

  // Custo vs Lucro calculations
  const custoPorPedido = ad.conversoes > 0 ? ad.despesas / ad.conversoes : 0;
  const custoPorUnidade = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;
  const sobraPorVenda = empateResult ? empateResult.lucroPorUnidade - custoPorUnidade : null;
  const lucroTotalPeriodo = sobraPorVenda !== null ? sobraPorVenda * ad.itens_vendidos : null;
  const pctConsumo = empateResult && empateResult.lucroPorUnidade > 0 ? (custoPorUnidade / empateResult.lucroPorUnidade) * 100 : null;

  // ACOS vs Margem
  const acosDireto = ad.acos_direto || ad.acos;
  const folgaAcosMargem = margemContrib !== null ? margemContrib - acosDireto : null;

  // Orçamento sugerido
  const custoConversao = ad.custo_por_conversao || custoPorPedido;
  const orcamentoProtecao = custoConversao * 5;
  const orcamentoMinimo = custoConversao * 3;
  const convPorDia = dias > 0 ? (ad.conversoes || 0) / dias : 0;
  const qualificaProtecao = convPorDia >= 5;

  // Bid type detection
  const isMetaRoas = ad.metodo_lance?.toLowerCase().includes('meta de roas') || ad.metodo_lance?.toLowerCase().includes('target roas');
  const isAutomatic = ad.metodo_lance?.toLowerCase().includes('automático') || ad.metodo_lance?.toLowerCase().includes('automatic');

  const periodLabel = (() => {
    const f = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)}`;
  })();

  const StatusIcon = classification
    ? (classification.classificacao === 'LUCRATIVO' ? TrendingUp : classification.classificacao === 'PREJUIZO' ? TrendingDown : AlertTriangle)
    : Info;

  const statusColor = classification?.cor || 'text-3';

  // Efficiency bar color
  const effBarColor = efficiency.score >= 80 ? 'bg-success' : efficiency.score >= 60 ? 'bg-primary' : efficiency.score >= 40 ? 'bg-warning' : 'bg-destructive';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4 border-b border-border">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-text-3" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm truncate">{ad.nome_produto_csv}</h3>
            <p className="text-[11px] text-text-3 font-mono tabular-nums">{periodLabel} ({dias} dias)</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-3" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Efficiency Score */}
          <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="section-label">Score de Eficiência</p>
              <span className={cn('text-xl font-extrabold font-mono tabular-nums', efficiency.color)}>
                {efficiency.score}<span className="text-[10px] text-text-3 font-normal">/100</span>
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-background overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', effBarColor)} style={{ width: `${efficiency.score}%` }} />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-text-3 font-mono tabular-nums flex-wrap">
              <span>ROAS: {efficiency.breakdown.roasScore}/40</span>
              <span>CTR: {efficiency.breakdown.ctrScore}/20</span>
              <span>Conv: {efficiency.breakdown.convScore}/20</span>
              <span>Pos: {efficiency.breakdown.posScore}/20</span>
            </div>
          </div>

          {/* Cost vs Margin Alert Banner */}
          {costMarginAlert && (
            <div className={cn('rounded-xl border p-3 flex items-center gap-2.5 text-xs font-bold animate-fade-in',
              costMarginAlert.level === 'safe' ? 'border-success/30 bg-success/10 text-success' :
              costMarginAlert.level === 'warning' ? 'border-warning/30 bg-warning/10 text-warning' :
              'border-destructive/30 bg-destructive/10 text-destructive'
            )}>
              {costMarginAlert.level === 'safe' ? '✅' : costMarginAlert.level === 'warning' ? '⚠️' : '🚨'}
              <span>{costMarginAlert.message}</span>
            </div>
          )}

          {/* Learning Phase Warning */}
          {emAprendizado && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Fase de aprendizado</p>
                <p className="text-[11px] text-text-2 mt-0.5">Anúncio com apenas {dias} dias. Aguarde 7 dias antes de tomar decisões. O algoritmo ainda está otimizando.</p>
              </div>
            </div>
          )}

          {/* Section 1: Status */}
          {classification ? (
            <div className={cn('rounded-xl border p-4 space-y-3', `bg-${statusColor}/10 border-${statusColor}/30`)}>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('w-5 h-5', `text-${statusColor}`)} />
                <span className={cn('text-sm font-extrabold uppercase', `text-${statusColor}`)}>{classification.classificacao.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-text-2">{classification.mensagem}</p>
              {roasEmpate && (
                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <span className="text-text-2">ROAS Real: <strong className={`text-${statusColor}`}>{roasDireto.toFixed(2)}</strong></span>
                  <span className="text-text-2">Empate: <strong className="text-warning">{roasEmpate.toFixed(2)}</strong></span>
                  <span className="text-text-2">Segurança: <strong>{(roasDireto / roasEmpate).toFixed(1)}x</strong></span>
                </div>
              )}
              {roasEmpate && (
                <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden relative">
                  <div
                    className={cn('h-full rounded-full', `bg-${statusColor}`)}
                    style={{ width: `${Math.min((roasDireto / (roasEmpate * 2.5)) * 100, 100)}%` }}
                  />
                  <div className="absolute top-0 h-full w-0.5 bg-warning" style={{ left: `${Math.min((roasEmpate / (roasEmpate * 2.5)) * 100, 100)}%` }} />
                </div>
              )}
            </div>
          ) : !product ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-sm font-bold text-warning">Vincule este anúncio a um produto</span>
              </div>
              <p className="text-xs text-text-2">Para calcular o ROAS Empate e ver se é lucrativo.</p>
              <Button onClick={onLink} size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Link2 className="w-3 h-3" /> Vincular produto
              </Button>
            </div>
          ) : null}

          {/* Section 2: Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={Eye} label="Impressões" value={ad.impressoes.toLocaleString('pt-BR')} />
            <Stat icon={MousePointerClick} label="Cliques" value={ad.cliques.toLocaleString('pt-BR')} />
            <Stat icon={Percent} label="CTR" value={`${ad.ctr.toFixed(2)}%`} sub={ad.ctr >= 2 ? 'Bom' : ad.ctr >= 1 ? 'Ok' : 'Baixo'} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={ShoppingCart} label="Conversões" value={String(ad.conversoes || ad.itens_vendidos)} />
            <Stat icon={Percent} label="Taxa Conv." value={`${ad.taxa_conversao.toFixed(2)}%`} sub={ad.taxa_conversao >= 3 ? 'Bom' : 'Baixo'} />
            <Stat icon={DollarSign} label="Custo/Venda" value={custoVenda > 0 ? fmt(custoVenda) : '—'} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={DollarSign} label="GMV" value={fmt(ad.gmv)} />
            <Stat icon={DollarSign} label="Gasto" value={fmt(ad.despesas)} />
            <Stat icon={Percent} label="ACOS" value={`${ad.acos.toFixed(1)}%`} sub={margemContrib ? `Margem: ${margemContrib.toFixed(1)}%` : undefined} />
          </div>

          {/* Custo vs Lucro por Venda */}
          {empateResult && ad.itens_vendidos > 0 && (
            <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
              <p className="section-label flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" /> Custo vs Lucro por Venda
              </p>
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-text-2">Custo por pedido:</span>
                  <span className="font-bold">{fmt(custoPorPedido)}</span>
                </div>
                {ad.itens_vendidos !== (ad.conversoes || 0) && ad.conversoes > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-text-2">Custo por unidade:</span>
                      <span className="font-bold">{fmt(custoPorUnidade)}</span>
                    </div>
                    <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] text-primary font-bold">
                      Cada pedido tem em média {(ad.itens_vendidos / ad.conversoes).toFixed(1)} unidades
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-text-2">Lucro por unidade:</span>
                  <span className="font-bold">{fmt(empateResult.lucroPorUnidade)}</span>
                </div>
                <div className="border-t border-dashed border-border pt-2">
                  <div className="flex justify-between">
                    <span className="text-text-2 font-bold">Sobra por venda:</span>
                    <span className={cn('font-extrabold', sobraPorVenda !== null && sobraPorVenda >= 0 ? 'text-success' : 'text-destructive')}>
                      {sobraPorVenda !== null ? (sobraPorVenda >= 0 ? fmt(sobraPorVenda) + ' ✅' : `Prejuízo de ${fmt(Math.abs(sobraPorVenda))} 🔴`) : '—'}
                    </span>
                  </div>
                  {lucroTotalPeriodo !== null && (
                    <div className="flex justify-between mt-1.5">
                      <span className="text-text-2">Lucro total período:</span>
                      <span className={cn('font-bold', lucroTotalPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{fmt(lucroTotalPeriodo)}</span>
                    </div>
                  )}
                </div>
                {pctConsumo !== null && (
                  <p className="text-[11px] text-text-3 pt-1">
                    O ads consome {pctConsumo.toFixed(1)}% do lucro por unidade
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ACOS vs Margem */}
          {margemContrib !== null && (
            <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
              <p className="section-label">ACOS vs Margem</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-3 w-12">ACOS</span>
                  <div className="flex-1 h-3 rounded-full bg-background overflow-hidden">
                    <div className={cn('h-full rounded-full', acosDireto <= margemContrib ? 'bg-primary' : 'bg-destructive')} style={{ width: `${Math.min((acosDireto / Math.max(margemContrib, 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums w-14 text-right">{acosDireto.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-3 w-12">Margem</span>
                  <div className="flex-1 h-3 rounded-full bg-background overflow-hidden">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, (margemContrib / Math.max(margemContrib, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums w-14 text-right">{margemContrib.toFixed(1)}%</span>
                </div>
              </div>
              {folgaAcosMargem !== null && (
                <p className={cn('text-xs font-bold', folgaAcosMargem > 0 ? 'text-success' : 'text-destructive')}>
                  {folgaAcosMargem > 0
                    ? `Folga: ${folgaAcosMargem.toFixed(2)}% ✅ — O ads consome ${acosDireto.toFixed(1)}% do faturamento. Sua margem é ${margemContrib.toFixed(1)}%. Sobram ${folgaAcosMargem.toFixed(2)}%.`
                    : `ACOS maior que margem 🔴 — O custo de publicidade (${acosDireto.toFixed(1)}%) supera sua margem (${margemContrib.toFixed(1)}%).`
                  }
                </p>
              )}
            </div>
          )}

          {/* Geral vs Direto */}
          {ad.roas_direto && ad.roas_direto > 0 && ad.gmv_direto > 0 && ad.gmv_direto !== ad.gmv && (
            <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
              <p className="section-label">Geral vs Direto</p>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                <div><p className="section-label mb-1">ROAS</p><p className="font-bold">G: {ad.roas.toFixed(2)} / D: {ad.roas_direto.toFixed(2)}</p></div>
                <div><p className="section-label mb-1">ACOS</p><p className="font-bold">G: {ad.acos.toFixed(1)}% / D: {ad.acos_direto.toFixed(1)}%</p></div>
                <div><p className="section-label mb-1">GMV</p><p className="font-bold">{fmt(ad.gmv)} / {fmt(ad.gmv_direto)}</p></div>
              </div>
              {crossSell && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-dashed border-border">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-2">{crossSell.mensagem}</p>
                </div>
              )}
            </div>
          )}

          {/* Halo Effect Section */}
          {halo && (
            <div className={cn('rounded-xl border p-4 space-y-2 animate-fade-in',
              halo.isSignificant ? 'border-success/30 bg-success/5' : 'border-border bg-surface-2'
            )}>
              <p className="section-label flex items-center gap-1.5">
                {halo.isSignificant ? '💎' : '🔗'} Efeito Halo — Vendas Indiretas
              </p>
              <p className="text-xs text-text-2">{halo.message}</p>
              <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums text-text-3">
                <span>Itens do produto: {ad.itens_vendidos - halo.haloItems}</span>
                <span>·</span>
                <span>Itens de outros: {halo.haloItems}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums text-text-3">
                <span>Receita direta: {fmt(ad.gmv_direto)}</span>
                <span>·</span>
                <span>Receita extra: {fmt(halo.haloGmv)}</span>
              </div>
            </div>
          )}

          {/* Config + Meta ROAS + Bid diagnosis + Budget */}
          {(ad.metodo_lance || metaRoas) && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {ad.metodo_lance && (
                <div className="space-y-2">
                  {isMetaRoas ? (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        <span className="font-bold text-foreground">Tipo: {ad.metodo_lance}</span>
                      </div>
                      <ul className="text-[11px] text-text-2 space-y-0.5 ml-5">
                        <li>• Você define a meta, algoritmo otimiza</li>
                        <li>• Proteção de ROAS: {convPorDia >= 5 ? <span className="text-success font-bold">Ativa ✓</span> : <span className="text-warning font-bold">Inativa (precisa ≥5 conv/dia, atual: {convPorDia.toFixed(1)})</span>}</li>
                      </ul>
                    </>
                  ) : isAutomatic ? (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        <span className="font-bold text-foreground">Tipo: {ad.metodo_lance}</span>
                      </div>
                      <ul className="text-[11px] text-text-2 space-y-0.5 ml-5">
                        <li>• Sem meta de ROAS definida</li>
                        <li>• Sem proteção — algoritmo maximiza GMV</li>
                      </ul>
                      {roasEmpate && (
                        <p className={cn('text-[11px] font-bold ml-5', roasDireto >= roasEmpate ? 'text-primary' : 'text-destructive')}>
                          {roasDireto >= roasEmpate
                            ? '💡 ROAS está bom. Considere migrar para Meta de ROAS para ter mais controle.'
                            : '🔴 ROAS abaixo do empate e sem proteção. Pause ou migre para Meta de ROAS.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-3">Tipo:</span>
                      <span className="font-bold text-foreground">{ad.metodo_lance}</span>
                    </div>
                  )}
                </div>
              )}

              {ad.status_anuncio && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-3">Status:</span>
                  <span className="font-bold text-foreground">{ad.status_anuncio}</span>
                </div>
              )}

              {metaRoas && (
                <div className="space-y-3 pt-3 border-t border-dashed border-border">
                  <p className="section-label">Meta de ROAS sugerida</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: 'Agressivo', value: metaRoas.agressivo, sub: 'mais GMV' },
                      { label: 'Equilibrado', value: metaRoas.equilibrado, sub: 'ideal' },
                      { label: 'Conservador', value: metaRoas.conservador, sub: 'mais lucro' },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg border border-border bg-surface-2 p-2.5 text-center">
                        <p className="section-label">{m.label}</p>
                        <p className="text-lg font-extrabold font-mono tabular-nums text-foreground mt-1">{m.value}</p>
                        <p className="text-[9px] text-text-3">{m.sub}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Nunca abaixo de {roasEmpate?.toFixed(2)} (seu empate)
                  </p>
                  <p className="text-[10px] text-text-3 flex items-start gap-1">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar. Não faça mudanças consecutivas.
                  </p>
                </div>
              )}

              {/* Budget suggestion */}
              {custoConversao > 0 && (
                <div className="space-y-2 pt-3 border-t border-dashed border-border">
                  <p className="section-label flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" /> Orçamento Sugerido
                  </p>
                  <div className="text-xs font-mono tabular-nums space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-2">Custo por conversão atual:</span>
                      <span className="font-bold">{fmt(custoConversao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-2">Para proteção ROAS (≥5 vendas/dia):</span>
                      <span className="font-bold text-primary">{fmt(orcamentoProtecao)}/dia</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-2">Mínimo saudável (≥3 vendas/dia):</span>
                      <span className="font-bold">{fmt(orcamentoMinimo)}/dia</span>
                    </div>
                  </div>
                  <p className={cn('text-[11px] font-bold', qualificaProtecao ? 'text-success' : 'text-warning')}>
                    {qualificaProtecao
                      ? '✅ Você qualifica para proteção de ROAS'
                      : `⚠️ Aumente budget para proteção (atual: ${convPorDia.toFixed(1)} conv/dia)`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Posicionamento */}
          {ad.posicao_media !== null && posInfo ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="section-label">Posicionamento</span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-foreground ml-auto">#{ad.posicao_media}</span>
              </div>
              <div className="relative w-full h-10 bg-surface-2 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  {[1, 3, 8, 16].map(p => (
                    <div key={p} className="absolute h-full w-px bg-border" style={{ left: `${Math.min((p / 25) * 100, 100)}%` }} />
                  ))}
                </div>
                <div
                  className="absolute top-1.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[9px] font-extrabold text-primary-foreground"
                  style={{ left: `${Math.min((ad.posicao_media / 25) * 100, 96)}%`, transform: 'translateX(-50%)' }}
                >
                  {ad.posicao_media}
                </div>
              </div>
              <p className={cn('text-xs font-bold', posInfo.classe === 'TOPO' ? 'text-success' : posInfo.classe === 'PRIMEIRA_PAGINA' ? 'text-primary' : posInfo.classe === 'SEGUNDA_PAGINA' ? 'text-warning' : 'text-destructive')}>
                {posInfo.label}
              </p>
              <div className="text-[10px] text-text-3 space-y-0.5">
                <p>• Posição 1-3: Topo da busca {ad.posicao_media <= 3 ? '← VOCÊ' : ''}</p>
                <p>• Posição 4-8: Primeira página {ad.posicao_media > 3 && ad.posicao_media <= 8 ? '← VOCÊ' : ''}</p>
                <p>• Posição 9-16: Segunda página {ad.posicao_media > 8 && ad.posicao_media <= 16 ? '← VOCÊ' : ''}</p>
                <p>• Posição 17+: Baixa visibilidade {ad.posicao_media > 16 ? '← VOCÊ' : ''}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface-2 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-text-3" />
                <span className="section-label">Posicionamento</span>
              </div>
              <p className="text-xs text-text-2">Dados de posição não disponíveis.</p>
              <p className="text-[11px] text-text-3">Importe o relatório individual deste produto para análise completa.</p>
              <Button onClick={onImportPosition} size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Importar CSV do Produto
              </Button>
            </div>
          )}

          {/* Section 6: Diagnóstico */}
          {diagnostico ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="section-label flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Diagnóstico Completo
              </p>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{diagnostico.emoji}</span>
                <div className="space-y-1.5">
                  <p className="text-sm font-extrabold text-foreground">{diagnostico.titulo}</p>
                  <p className="text-xs text-text-2">{diagnostico.mensagem}</p>
                  {metaRoas && diagnostico.acaoRoas !== 'pausar' && diagnostico.acaoRoas !== 'manter' && (
                    <p className="text-xs text-primary font-bold">
                      Meta sugerida: {diagnostico.acaoRoas === 'agressivo' ? metaRoas.agressivo : diagnostico.acaoRoas === 'equilibrado' ? metaRoas.equilibrado : metaRoas.conservador}
                    </p>
                  )}
                  {roasEmpate && (
                    <p className="text-[10px] text-warning flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Nunca abaixo de {roasEmpate.toFixed(2)} (empate)
                    </p>
                  )}
                  {classification?.acao === 'AUMENTAR_META_ROAS' && (
                    <p className="text-[10px] text-text-3 flex items-start gap-1">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : roasEmpate && classification ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="section-label flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Diagnóstico
              </p>
              <div className="space-y-1.5 text-xs">
                <p className={cn('flex items-center gap-1.5', roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                  {roasDireto >= roasEmpate ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  ROAS {(roasDireto / roasEmpate).toFixed(1)}x {roasDireto >= roasEmpate ? 'acima' : 'abaixo'} do empate
                </p>
                <p className={cn('flex items-center gap-1.5', margemContrib && ad.acos < margemContrib ? 'text-success' : 'text-warning')}>
                  {margemContrib && ad.acos < margemContrib ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  ACOS {ad.acos.toFixed(1)}% {margemContrib ? `vs Margem ${margemContrib.toFixed(1)}%` : ''}
                </p>
                <p className={cn('flex items-center gap-1.5', ad.taxa_conversao >= 3 ? 'text-success' : 'text-text-2')}>
                  <Info className="w-3 h-3" /> Taxa conv. {ad.taxa_conversao.toFixed(2)}%
                </p>
                {ad.posicao_media === null && (
                  <p className="flex items-center gap-1.5 text-text-3">
                    <Info className="w-3 h-3" /> Importe CSV individual para diagnóstico de posição
                  </p>
                )}
                {classification.acao === 'AUMENTAR_META_ROAS' && (
                  <p className="flex items-start gap-1.5 text-text-3 mt-1">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar. Não faça mudanças consecutivas.
                  </p>
                )}
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
