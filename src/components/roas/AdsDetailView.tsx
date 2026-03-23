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

function getDiasPeriodo(inicio: string, fim: string): number {
  return Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
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
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel} ({dias} dias)</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* 1. Learning Phase Warning */}
          {emAprendizado && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Fase de aprendizado</p>
                <p className="text-[11px] text-muted-foreground">Anúncio com apenas {dias} dias. Aguarde 7 dias antes de tomar decisões. O algoritmo ainda está otimizando.</p>
              </div>
            </div>
          )}

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

          {/* 2. Custo vs Lucro por Venda */}
          {empateResult && ad.itens_vendidos > 0 && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" /> Custo vs Lucro por Venda
              </p>
              <div className="space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo por pedido:</span>
                  <span className="font-bold">{fmt(custoPorPedido)}</span>
                </div>
                {ad.itens_vendidos !== (ad.conversoes || 0) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo por unidade:</span>
                    <span className="font-bold">{fmt(custoPorUnidade)} <span className="text-[10px] text-muted-foreground">({ad.itens_vendidos} itens/{ad.conversoes || 0} ped.)</span></span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro por unidade:</span>
                  <span className="font-bold">{fmt(empateResult.lucroPorUnidade)}</span>
                </div>
                <div className="border-t border-dashed border-border pt-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Sobra por venda:</span>
                    <span className={cn('font-extrabold', sobraPorVenda !== null && sobraPorVenda >= 0 ? 'text-success' : 'text-destructive')}>
                      {sobraPorVenda !== null ? (sobraPorVenda >= 0 ? fmt(sobraPorVenda) + ' ✅' : `Prejuízo de ${fmt(Math.abs(sobraPorVenda))} 🔴`) : '—'}
                    </span>
                  </div>
                  {lucroTotalPeriodo !== null && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Lucro total período:</span>
                      <span className={cn('font-bold', lucroTotalPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{fmt(lucroTotalPeriodo)}</span>
                    </div>
                  )}
                </div>
                {pctConsumo !== null && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    O ads consome {pctConsumo.toFixed(1)}% do lucro por unidade
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. ACOS vs Margem */}
          {margemContrib !== null && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">ACOS vs Margem</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">ACOS</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                    <div className={cn('h-full rounded-full', acosDireto <= margemContrib ? 'bg-primary' : 'bg-destructive')} style={{ width: `${Math.min((acosDireto / Math.max(margemContrib, 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums w-14 text-right">{acosDireto.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">Margem</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
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

          {/* Section 4: Config + Meta ROAS + 3. Diagnóstico por tipo de lance + 5. Orçamento */}
          {(ad.metodo_lance || metaRoas) && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              {/* 3. Bid type diagnosis */}
              {ad.metodo_lance && (
                <div className="space-y-1.5">
                  {isMetaRoas ? (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        <span className="font-bold text-foreground">Tipo: {ad.metodo_lance}</span>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 ml-5">
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
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 ml-5">
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
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-bold text-foreground">{ad.metodo_lance}</span>
                    </div>
                  )}
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
                  {/* 6. Aviso de não alterar */}
                  <p className="text-[10px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar. Não faça mudanças consecutivas.
                  </p>
                </div>
              )}

              {/* 5. Orçamento sugerido */}
              {custoConversao > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-dashed border-border">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" /> Orçamento Sugerido
                  </p>
                  <div className="text-xs font-mono tabular-nums space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo por conversão atual:</span>
                      <span className="font-bold">{fmt(custoConversao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Para proteção ROAS (≥5 vendas/dia):</span>
                      <span className="font-bold text-primary">{fmt(orcamentoProtecao)}/dia</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mínimo saudável (≥3 vendas/dia):</span>
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
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Posicionamento</span>
                <span className="text-base font-extrabold font-mono tabular-nums text-foreground ml-auto">#{ad.posicao_media}</span>
              </div>
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
                  {/* 6. Aviso aguardar when action is AUMENTAR_META_ROAS */}
                  {classification?.acao === 'AUMENTAR_META_ROAS' && (
                    <p className="text-[10px] text-muted-foreground flex items-start gap-1 mt-1">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar.
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
                {/* 6. Aviso aguardar when action is AUMENTAR_META_ROAS */}
                {classification.acao === 'AUMENTAR_META_ROAS' && (
                  <p className="flex items-start gap-1.5 text-muted-foreground mt-1">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Após alterar a meta na Shopee, aguarde 3-5 dias para o algoritmo se ajustar. Não faça mudanças consecutivas.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Profit per sale (legacy kept) */}
          {lucroPorVenda !== null && !empateResult && (
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
