import { useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, AlertTriangle, Target, Zap, MapPin,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Percent, Upload,
  Link2, BarChart3, Info, Clock, Wallet, Package, Plus, LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import {
  calcularRoasEmpate, classificarAnuncio, sugerirMetaRoas,
  classificarPosicao, getDiagnostico, detectarCrossSell,
  calcAdEfficiencyScore, calcHaloEffect, calcCostVsMarginAlert,
  type Classificacao,
} from '@/lib/adsLogic';
import { fmt, fmtShort, getClassCor, getRoasColor, getDiasPeriodo } from './adsHelpers';

interface Props {
  ad: EnrichedAdsData;
  allAds: EnrichedAdsData[];
  onClose: () => void;
  onNavigate: (ad: EnrichedAdsData) => void;
  onImportPosition: () => void;
  onLink: () => void;
  onQuickRegister: () => void;
  onReimport?: () => void;
  onUnlink?: () => void;
  onChangeLink?: () => void;
}

// ═══ Small helper components ═══

function KpiCard({ label, value, sub, subColor, icon: Icon }: { label: string; value: string; sub?: string; subColor?: string; icon: React.ElementType }) {
  return (
    <div className="p-3 rounded-xl bg-surface-2 text-center min-w-0 overflow-hidden">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-xl md:text-2xl font-extrabold mt-0.5 font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className={cn('text-[11px] font-medium mt-0.5 truncate', subColor || 'text-muted-foreground')}>{sub}</p>}
    </div>
  );
}

// ═══ Main Component ═══

export function AdsDetailFullView({ ad, allAds, onClose, onNavigate, onImportPosition, onLink, onQuickRegister, onReimport, onUnlink, onChangeLink }: Props) {
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const config = currentStore?.config;

  const roasDireto = ad.roas_direto && ad.roas_direto > 0 ? ad.roas_direto : ad.roas;
  const product = ad.product;

  // ═══ Calculations ═══
  const empateResult = useMemo(() => {
    if (!product || !config) return null;
    return calcularRoasEmpate(product, config);
  }, [product, config]);

  const roasEmpate = empateResult?.roasEmpate ?? (ad.roas_empate || null);
  const margemContrib = empateResult?.margemContribuicao ?? (ad.margem_contribuicao || null);

  const classification = useMemo(() => {
    // Try calculated classification first
    if (roasEmpate && roasEmpate !== Infinity) {
      return classificarAnuncio(roasDireto, roasEmpate);
    }
    // Fallback to imported classification from CSV
    if (ad.classificacao) {
      const fallbackMap: Record<string, { cor: string; mensagem: string; acao: string }> = {
        'LUCRATIVO': { cor: 'emerald-500', mensagem: 'Anúncio lucrativo com base na classificação importada.', acao: 'Manter' },
        'MARGEM_APERTADA': { cor: 'amber-500', mensagem: 'Margem apertada — monitore de perto.', acao: 'Otimizar' },
        'ABAIXO_EMPATE': { cor: 'orange-500', mensagem: 'ROAS abaixo do empate — considere ajustes.', acao: 'Ajustar' },
        'PREJUIZO': { cor: 'red-500', mensagem: 'Anúncio em prejuízo — avalie pausar.', acao: 'Pausar' },
      };
      const info = fallbackMap[ad.classificacao];
      if (info) return { classificacao: ad.classificacao as Classificacao, ...info };
    }
    return null;
  }, [roasDireto, roasEmpate, ad.classificacao]);

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

  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;

  const custoPorPedido = ad.conversoes > 0 ? ad.despesas / ad.conversoes : 0;
  const custoPorUnidade = ad.itens_vendidos > 0 ? ad.despesas / ad.itens_vendidos : 0;
  const sobraPorVenda = empateResult ? empateResult.lucroPorUnidade - custoPorUnidade : null;
  const lucroTotalPeriodo = sobraPorVenda !== null ? sobraPorVenda * ad.itens_vendidos : null;
  const pctConsumo = empateResult && empateResult.lucroPorUnidade > 0 ? (custoPorUnidade / empateResult.lucroPorUnidade) * 100 : null;

  const acosDireto = ad.acos_direto || ad.acos;
  const folgaAcosMargem = margemContrib !== null ? margemContrib - acosDireto : null;

  const custoConversao = ad.custo_por_conversao || custoPorPedido;
  const orcamentoProtecao = custoConversao * 5;
  const orcamentoMinimo = custoConversao * 3;
  const convPorDia = dias > 0 ? (ad.conversoes || 0) / dias : 0;
  const qualificaProtecao = convPorDia >= 5;

  const isMetaRoas = ad.metodo_lance?.toLowerCase().includes('meta de roas') || ad.metodo_lance?.toLowerCase().includes('target roas');
  const isAutomatic = ad.metodo_lance?.toLowerCase().includes('automático') || ad.metodo_lance?.toLowerCase().includes('automatic');

  const periodLabel = (() => {
    const f = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)} (${dias} dias)`;
  })();

  const effBarColor = efficiency.score >= 80 ? 'bg-success' : efficiency.score >= 60 ? 'bg-primary' : efficiency.score >= 40 ? 'bg-warning' : 'bg-destructive';

  // Navigation
  const currentIndex = allAds.findIndex(a => a.id === ad.id);
  const prevAd = currentIndex > 0 ? allAds[currentIndex - 1] : null;
  const nextAd = currentIndex < allAds.length - 1 ? allAds[currentIndex + 1] : null;

  const statusColor = classification?.cor || 'text-3';

  // Semaphore bg classes
  const semaphoreBg = classification
    ? classification.classificacao === 'LUCRATIVO' ? 'bg-emerald-500/5 border-emerald-500/20'
    : classification.classificacao === 'MARGEM_APERTADA' ? 'bg-amber-500/5 border-amber-500/20'
    : classification.classificacao === 'ABAIXO_EMPATE' ? 'bg-orange-500/5 border-orange-500/20'
    : 'bg-red-500/5 border-red-500/20'
    : 'bg-surface-2 border-border';

  // ═══ Right Column ═══
  const renderRightColumn = () => {
    if (!product) {
      return (
        <div className="rounded-2xl border-2 border-dashed border-warning/30 bg-warning/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-base font-extrabold text-warning">PRODUTO NÃO VINCULADO</span>
          </div>
          <p className="text-sm text-text-2">Vincule a um produto cadastrado para:</p>
          <ul className="text-sm text-text-2 space-y-1.5 ml-1">
            <li>• Calcular ROAS Empate</li>
            <li>• Ver se é lucrativo</li>
            <li>• Receber meta ROAS ideal</li>
            <li>• Score de eficiência completo</li>
          </ul>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onLink} variant="outline" className="gap-1.5 text-sm font-bold w-full">
              <Link2 className="w-4 h-4" /> Vincular Produto
            </Button>
            <Button onClick={onQuickRegister} className="gap-1.5 text-sm font-bold w-full">
              <Plus className="w-4 h-4" /> Cadastro Rápido
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {/* Card 1: Score de Eficiência (compacto) */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Score</p>
            <span className={cn('text-3xl font-extrabold font-mono tabular-nums', efficiency.color)}>
              {efficiency.score}<span className="text-sm text-text-3 font-normal">/100</span>
            </span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-background overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', effBarColor)} style={{ width: `${efficiency.score}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-text-3 font-mono tabular-nums">
            <span>ROAS {efficiency.breakdown.roasScore}/40</span>
            <span>CTR {efficiency.breakdown.ctrScore}/20</span>
            <span>Conv {efficiency.breakdown.convScore}/20</span>
            <span>Pos {efficiency.breakdown.posScore}/20</span>
          </div>
        </div>

        {/* Card 2: Custo vs Lucro por Venda */}
        {empateResult && ad.itens_vendidos > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-primary" /> Custo vs Lucro por Venda
            </p>
            <div className="space-y-2.5 text-sm font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-text-2">Custo por pedido:</span>
                <span className="font-bold">{fmt(custoPorPedido)} <span className="text-text-3 text-xs">({ad.conversoes} pedidos)</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Custo por unidade:</span>
                <span className="font-bold">{fmt(custoPorUnidade)} <span className="text-text-3 text-xs">({ad.itens_vendidos} un{ad.conversoes > 0 ? ` · média ${(ad.itens_vendidos / ad.conversoes).toFixed(1)}/ped` : ''})</span></span>
              </div>
              {ad.conversoes > 0 && ad.itens_vendidos / ad.conversoes > 1 && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  Cada pedido tem em média {(ad.itens_vendidos / ad.conversoes).toFixed(1)} unidades — custo real por unidade é menor.
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-text-2">Lucro por unidade:</span>
                <span className="font-bold">{fmt(empateResult.lucroPorUnidade)}</span>
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <div className="flex justify-between">
                  <span className="text-text-2 font-bold">Sobra por venda:</span>
                  <span className={cn('font-extrabold', sobraPorVenda !== null && sobraPorVenda >= 0 ? 'text-success' : 'text-destructive')}>
                    {sobraPorVenda !== null ? (sobraPorVenda >= 0 ? `${fmt(sobraPorVenda)} ✅` : `-${fmt(Math.abs(sobraPorVenda))} 🔴`) : '—'}
                  </span>
                </div>
                {lucroTotalPeriodo !== null && (
                  <div className="flex justify-between mt-1.5">
                    <span className="text-text-2">{lucroTotalPeriodo >= 0 ? 'Lucro total período:' : 'Prejuízo total:'}</span>
                    <span className={cn('font-bold', lucroTotalPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{fmt(Math.abs(lucroTotalPeriodo))}</span>
                  </div>
                )}
              </div>
              {pctConsumo !== null && (
                <p className="text-xs text-text-3 pt-1">O ads consome {pctConsumo.toFixed(1)}% do lucro por unidade.</p>
              )}
            </div>
          </div>
        )}

        {/* Card 3: Configuração e Meta ROAS */}
        {(ad.metodo_lance || metaRoas) && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">⚙️ Configuração</p>

            {ad.metodo_lance && (
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-2">Tipo:</span>
                  <span className="font-bold text-foreground">{ad.metodo_lance}</span>
                </div>
                {ad.status_anuncio && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-2">Status:</span>
                    <span className="font-bold text-foreground">{ad.status_anuncio}</span>
                  </div>
                )}
                {isMetaRoas && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-2">Proteção:</span>
                    <span className={cn('font-bold', qualificaProtecao ? 'text-success' : 'text-warning')}>
                      {qualificaProtecao ? `✅ Ativa (${convPorDia.toFixed(1)} conv/dia)` : `⚠️ Inativa (${convPorDia.toFixed(1)} conv/dia)`}
                    </span>
                  </div>
                )}
                {isAutomatic && (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1.5">
                    <p className="text-xs text-text-2">• Sem meta de ROAS definida</p>
                    <p className="text-xs text-text-2">• Sem proteção</p>
                    {roasEmpate && (
                      <p className={cn('text-xs font-bold', roasDireto >= roasEmpate ? 'text-primary' : 'text-destructive')}>
                        {roasDireto >= roasEmpate
                          ? '💡 ROAS acima do empate. Migre para Meta de ROAS para ter controle.'
                          : '🔴 ROAS abaixo do empate e sem proteção. Pause ou migre para Meta de ROAS.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {metaRoas && (
              <div className="space-y-3 pt-3 border-t border-dashed border-border">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Meta de ROAS Sugerida</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Agressivo', value: metaRoas.agressivo, sub: '+volume' },
                    { label: 'Equilibrado', value: metaRoas.equilibrado, sub: 'ideal' },
                    { label: 'Conservador', value: metaRoas.conservador, sub: '+lucro' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl border border-border bg-surface-2 p-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                      <p className="text-xl font-extrabold font-mono tabular-nums text-foreground mt-1">{m.value}</p>
                      <p className="text-[11px] text-text-3">{m.sub}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Nunca abaixo de {roasEmpate?.toFixed(2)} (empate)
                </p>
                <p className="text-xs text-text-3 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Após alterar, aguarde 3-5 dias.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Card 4: Orçamento Sugerido */}
        {custoConversao > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">💵 Orçamento Sugerido</p>
            <div className="text-sm font-mono tabular-nums space-y-2.5">
              <div className="flex justify-between">
                <span className="text-text-2">Custo por conversão:</span>
                <span className="font-bold">{fmt(custoConversao)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Para proteção (≥5 vendas/dia):</span>
                <span className="font-bold text-primary">{fmt(orcamentoProtecao)}/dia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Mínimo saudável (≥3 vendas/dia):</span>
                <span className="font-bold">{fmt(orcamentoMinimo)}/dia</span>
              </div>
            </div>
            <p className={cn('text-xs font-bold', qualificaProtecao ? 'text-success' : 'text-warning')}>
              {qualificaProtecao
                ? `✅ Você qualifica para proteção (${convPorDia.toFixed(1)} conv/dia)`
                : `⚠️ Aumente budget para proteção (atual: ${convPorDia.toFixed(1)} conv/dia)`}
            </p>
          </div>
        )}

        {/* Card 5: Diagnóstico */}
        {diagnostico ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">🎯 Diagnóstico Completo</p>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{diagnostico.emoji}</span>
              <div className="space-y-1">
                <p className="text-base font-extrabold text-foreground">{diagnostico.titulo}</p>
                <p className="text-sm text-text-2">{diagnostico.mensagem}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm pt-2">
              <p className={cn('flex items-center gap-1.5', roasEmpate && roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                {roasEmpate && roasDireto >= roasEmpate ? '✅' : '❌'} ROAS {roasEmpate ? `${(roasDireto / roasEmpate).toFixed(1)}x` : ''} {roasEmpate && roasDireto >= roasEmpate ? 'acima' : 'abaixo'} do empate
              </p>
              {margemContrib !== null && (
                <p className={cn('flex items-center gap-1.5', acosDireto < margemContrib ? 'text-success' : 'text-destructive')}>
                  {acosDireto < margemContrib ? '✅' : '❌'} ACOS {acosDireto.toFixed(1)}% {'<'} Margem {margemContrib.toFixed(1)}%
                </p>
              )}
              {ad.posicao_media !== null && posInfo && (
                <p className={cn('flex items-center gap-1.5', posInfo.classe === 'TOPO' ? 'text-success' : posInfo.classe === 'PRIMEIRA_PAGINA' ? 'text-primary' : 'text-warning')}>
                  ✅ Posição #{ad.posicao_media} — {posInfo.label.split('—')[0].trim()}
                </p>
              )}
              <p className={cn('flex items-center gap-1.5', ad.taxa_conversao >= 3 ? 'text-success' : 'text-warning')}>
                {ad.taxa_conversao >= 3 ? '✅' : '⚠️'} Taxa conv. {ad.taxa_conversao.toFixed(2)}% — {ad.taxa_conversao >= 3 ? 'Bom' : 'pode melhorar'}
              </p>
            </div>
            <p className={cn('text-sm font-bold font-mono tabular-nums pt-1', efficiency.color)}>Score: {efficiency.score}/100</p>
          </div>
        ) : roasEmpate && classification ? (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">🎯 Diagnóstico</p>
            <div className="space-y-2 text-sm">
              <p className={cn('flex items-center gap-1.5', roasDireto >= roasEmpate ? 'text-success' : 'text-destructive')}>
                {roasDireto >= roasEmpate ? '✅' : '❌'} ROAS {(roasDireto / roasEmpate).toFixed(1)}x {roasDireto >= roasEmpate ? 'acima' : 'abaixo'} do empate
              </p>
              {margemContrib !== null && (
                <p className={cn('flex items-center gap-1.5', acosDireto < margemContrib ? 'text-success' : 'text-destructive')}>
                  {acosDireto < margemContrib ? '✅' : '❌'} ACOS {acosDireto.toFixed(1)}% vs Margem {margemContrib.toFixed(1)}%
                </p>
              )}
              <p className={cn('flex items-center gap-1.5', ad.taxa_conversao >= 3 ? 'text-success' : 'text-warning')}>
                {ad.taxa_conversao >= 3 ? '✅' : '⚠️'} Taxa conv. {ad.taxa_conversao.toFixed(2)}%
              </p>
              {ad.posicao_media === null && (
                <p className="flex items-center gap-1.5 text-text-3">
                  ❓ Importe CSV individual para posição
                </p>
              )}
            </div>
            <p className={cn('text-sm font-bold font-mono tabular-nums pt-1', efficiency.color)}>Score: {efficiency.score}/100</p>
          </div>
        ) : null}
      </div>
    );
  };

  // ═══ Left Column ═══
  const renderLeftColumn = () => (
    <div className="space-y-5">
      {/* 1. Header do produto — compacto */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-foreground leading-tight line-clamp-2">{ad.nome_produto_csv}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-[11px] text-text-3 font-mono tabular-nums">{periodLabel}</span>
              {ad.metodo_lance && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-2">
                  {ad.metodo_lance}
                </span>
              )}
              {ad.status_anuncio && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                  {ad.status_anuncio}
                </span>
              )}
              {emAprendizado && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Aprendizado
                </span>
              )}
            </div>
          </div>
          {onReimport && (
            <Button onClick={onReimport} variant="outline" size="sm" className="gap-1 text-xs font-bold flex-shrink-0">
              <Upload className="w-3.5 h-3.5" /> CSV
            </Button>
          )}
          {product && onChangeLink && (
            <Button onClick={onChangeLink} variant="outline" size="sm" className="gap-1 text-xs font-bold flex-shrink-0">
              <Link2 className="w-3.5 h-3.5" /> Trocar
            </Button>
          )}
          {product && onUnlink && (
            <Button onClick={onUnlink} variant="ghost" size="sm" className="gap-1 text-xs font-bold flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
              Desvincular
            </Button>
          )}
        </div>
      </div>

      {/* 2. KPIs em linha — destaque visual */}
      <div className={cn('grid gap-2', isMobile ? 'grid-cols-3' : 'grid-cols-6')}>
        <KpiCard icon={Eye} label="Impressões" value={ad.impressoes >= 1000 ? `${(ad.impressoes / 1000).toFixed(1)}k` : String(ad.impressoes)} />
        <KpiCard icon={MousePointerClick} label="Cliques" value={ad.cliques >= 1000 ? `${(ad.cliques / 1000).toFixed(1)}k` : String(ad.cliques)} />
        <KpiCard icon={Percent} label="CTR" value={`${ad.ctr.toFixed(2)}%`} sub={ad.ctr >= 2.5 ? 'Bom' : ad.ctr >= 1.5 ? 'Ok' : 'Baixo'} subColor={ad.ctr >= 2.5 ? 'text-success' : ad.ctr >= 1.5 ? 'text-warning' : 'text-destructive'} />
        <KpiCard icon={ShoppingCart} label="Vendas" value={ad.itens_vendidos >= 1000 ? `${(ad.itens_vendidos / 1000).toFixed(1)}k` : String(ad.itens_vendidos)} />
        <KpiCard icon={DollarSign} label="GMV" value={fmtShort(ad.gmv)} />
        <KpiCard icon={Target} label="ROAS" value={roasDireto.toFixed(2)} sub={roasEmpate ? `Emp: ${roasEmpate.toFixed(2)}` : undefined} subColor={roasEmpate ? (roasDireto >= roasEmpate ? 'text-success' : 'text-destructive') : undefined} />
      </div>

      {/* 3. Status de Lucratividade */}
      <div className={cn('rounded-2xl border p-6 space-y-4 shadow-sm', semaphoreBg)}>
        {classification ? (
          <>
            <div className="flex items-center gap-2">
              {classification.classificacao === 'LUCRATIVO' ? (
                <TrendingUp className={cn('w-5 h-5', `text-${statusColor}`)} />
              ) : classification.classificacao === 'PREJUIZO' ? (
                <TrendingDown className={cn('w-5 h-5', `text-${statusColor}`)} />
              ) : (
                <AlertTriangle className={cn('w-5 h-5', `text-${statusColor}`)} />
              )}
              <span className={cn('text-base font-extrabold uppercase', `text-${statusColor}`)}>
                {classification.classificacao.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2.5 text-sm font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-text-2">ROAS Real:</span>
                <span className={cn('font-extrabold', `text-${statusColor}`)}>{roasDireto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">ROAS Empate:</span>
                <span className="font-bold text-warning">{roasEmpate?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Segurança:</span>
                <span className="font-bold">{roasEmpate ? `${(roasDireto / roasEmpate).toFixed(1)}x acima` : '—'}</span>
              </div>
            </div>

            {/* ROAS visual bar */}
            {roasEmpate && (
              <div className="space-y-1">
                <div className="w-full h-4 rounded-full bg-background/50 overflow-hidden relative">
                  <div
                    className={cn('h-full rounded-full transition-all', `bg-${statusColor}`)}
                    style={{ width: `${Math.min((roasDireto / (roasEmpate * 2.5)) * 100, 100)}%` }}
                  />
                  <div className="absolute top-0 h-full w-0.5 bg-warning/80" style={{ left: `${Math.min((roasEmpate / (roasEmpate * 2.5)) * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-text-3">
                  <span>↑ Empate</span>
                  <span>↑ Real</span>
                </div>
              </div>
            )}

            <p className="text-sm text-text-2">{classification.mensagem}</p>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-3">Dados insuficientes para classificação.</p>
            {!product && (
              <Button onClick={onLink} variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link2 className="w-3.5 h-3.5" /> Vincular Produto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 4. Posicionamento */}
      {ad.posicao_media !== null && posInfo ? (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Posicionamento
            </h3>
            <span className="text-4xl font-bold font-mono tabular-nums">#{ad.posicao_media}</span>
          </div>

          {/* Régua visual melhorada */}
          <div className="relative h-12 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-red-500/20 rounded-xl mb-3">
            {/* Marcadores de zona */}
            <div className="absolute top-0 left-[15%] h-full border-l border-dashed border-border" />
            <div className="absolute top-0 left-[40%] h-full border-l border-dashed border-border" />
            <div className="absolute top-0 left-[80%] h-full border-l border-dashed border-border" />

            {/* Indicador de posição */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg"
              style={{ left: `${Math.min((ad.posicao_media / 30) * 100, 95)}%`, transform: 'translateX(-50%) translateY(-50%)' }}
            >
              {ad.posicao_media}
            </div>
          </div>

          {/* Labels das zonas */}
          <div className="flex justify-between text-xs text-text-3 px-1">
            <span>Top 3</span>
            <span>Pág 1</span>
            <span>Pág 2</span>
            <span>17+</span>
          </div>

          {/* Classificação */}
          <p className={cn(
            'text-sm font-bold mt-2',
            ad.posicao_media <= 3 && 'text-emerald-500',
            ad.posicao_media > 3 && ad.posicao_media <= 8 && 'text-blue-500',
            ad.posicao_media > 8 && ad.posicao_media <= 16 && 'text-amber-500',
            ad.posicao_media > 16 && 'text-red-500',
          )}>
            {posInfo.label}
          </p>

          <div className="text-sm text-text-3 space-y-1.5">
            <p className={ad.posicao_media <= 3 ? 'text-emerald-500 font-bold' : ''}>• 1-3: Topo {ad.posicao_media <= 3 ? '← VOCÊ' : ''}</p>
            <p className={ad.posicao_media > 3 && ad.posicao_media <= 8 ? 'text-blue-500 font-bold' : ''}>• 4-8: Primeira página {ad.posicao_media > 3 && ad.posicao_media <= 8 ? '← VOCÊ' : ''}</p>
            <p className={ad.posicao_media > 8 && ad.posicao_media <= 16 ? 'text-amber-500 font-bold' : ''}>• 9-16: Segunda página {ad.posicao_media > 8 && ad.posicao_media <= 16 ? '← VOCÊ' : ''}</p>
            <p className={ad.posicao_media > 16 ? 'text-red-500 font-bold' : ''}>• 17+: Baixa visibilidade {ad.posicao_media > 16 ? '← VOCÊ' : ''}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 space-y-3 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-text-3" /> Posicionamento
          </p>
          <p className="text-sm text-text-2">Importe o CSV individual para ver a posição nos resultados de busca.</p>
          <Button onClick={onImportPosition} size="sm" variant="outline" className="gap-1.5 text-sm">
            <Upload className="w-4 h-4" /> Importar CSV do Produto
          </Button>
        </div>
      )}

      {/* 5. ACOS vs Margem */}
      {margemContrib !== null && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">ACOS vs Margem</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-2">ACOS</span>
                <span className="font-bold font-mono tabular-nums">{acosDireto.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500/80"
                  style={{ width: `${Math.min((acosDireto / Math.max(margemContrib, acosDireto, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-2">Margem</span>
                <span className="font-bold font-mono tabular-nums">{margemContrib.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-background overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${Math.min((margemContrib / Math.max(margemContrib, acosDireto, 1)) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          {folgaAcosMargem !== null && (
            <div className={cn('rounded-xl p-3 text-sm font-bold', folgaAcosMargem > 0 ? 'bg-emerald-500/10 text-success' : 'bg-red-500/10 text-destructive')}>
              {folgaAcosMargem > 0
                ? `Folga: ${folgaAcosMargem.toFixed(1)}% ✅ — O ads consome ${acosDireto.toFixed(1)}% do faturamento. Sua margem é ${margemContrib.toFixed(1)}%. Sobram ${folgaAcosMargem.toFixed(1)}% de lucro líquido.`
                : `Excedente: ${folgaAcosMargem.toFixed(1)}% 🔴 — ACOS maior que margem. Cada venda via ads dá prejuízo.`}
            </div>
          )}
        </div>
      )}

      {/* 6. Geral vs Direto */}
      {ad.roas_direto > 0 && ad.gmv_direto > 0 && ad.gmv_direto !== ad.gmv && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Geral vs Direto</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono tabular-nums">
              <thead>
                <tr className="text-text-3">
                  <th className="text-left py-2 font-normal text-xs uppercase tracking-wider"></th>
                  <th className="text-right py-2 font-normal text-xs uppercase tracking-wider">Geral</th>
                  <th className="text-right py-2 font-normal text-xs uppercase tracking-wider">Direto</th>
                  <th className="text-right py-2 font-normal text-xs uppercase tracking-wider">Diferença</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-2 text-text-2 font-bold">ROAS</td>
                  <td className="py-2 text-right font-bold">{ad.roas.toFixed(2)}</td>
                  <td className="py-2 text-right font-bold">{ad.roas_direto.toFixed(2)}</td>
                  <td className={cn('py-2 text-right font-bold', ad.roas - ad.roas_direto > 0 ? 'text-success' : 'text-destructive')}>
                    {(ad.roas - ad.roas_direto) > 0 ? '+' : ''}{(ad.roas - ad.roas_direto).toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 text-text-2 font-bold">ACOS</td>
                  <td className="py-2 text-right font-bold">{ad.acos.toFixed(1)}%</td>
                  <td className="py-2 text-right font-bold">{acosDireto.toFixed(1)}%</td>
                  <td className={cn('py-2 text-right font-bold', ad.acos - acosDireto < 0 ? 'text-success' : 'text-destructive')}>
                    {(ad.acos - acosDireto).toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 text-text-2 font-bold">GMV</td>
                  <td className="py-2 text-right font-bold">{fmt(ad.gmv)}</td>
                  <td className="py-2 text-right font-bold">{fmt(ad.gmv_direto)}</td>
                  <td className={cn('py-2 text-right font-bold', ad.gmv - ad.gmv_direto > 0 ? 'text-success' : 'text-text-2')}>
                    +{fmt(ad.gmv - ad.gmv_direto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {crossSell && (
            <div className="flex items-start gap-2.5 pt-2 border-t border-dashed border-border">
              <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-2">{crossSell.mensagem}</p>
            </div>
          )}
        </div>
      )}

      {/* Halo Effect */}
      {halo && halo.isSignificant && (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-5 space-y-2 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">💎 Efeito Halo — Vendas Indiretas</p>
          <p className="text-sm text-text-2">{halo.message}</p>
        </div>
      )}

      {/* 7. Evolução Temporal (placeholder) */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <LineChart className="w-4 h-4 text-text-3" /> Evolução Temporal
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LineChart className="w-10 h-10 text-text-3 mb-3" />
          <p className="text-base font-bold text-text-2">Importe relatórios de períodos diferentes</p>
          <p className="text-sm text-text-3 mt-1">para ver a evolução ao longo do tempo.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in px-1 md:px-0">
      {/* Breadcrumb / Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-sm font-bold text-text-2 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar para Ads
        </Button>

        <div className="flex items-center gap-1.5 ml-auto md:ml-0">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={!prevAd}
            onClick={() => prevAd && onNavigate(prevAd)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-text-3 font-mono tabular-nums">
            {currentIndex + 1}/{allAds.length}
          </span>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={!nextAd}
            onClick={() => nextAd && onNavigate(nextAd)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {ad.status_anuncio && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary hidden md:inline-flex">
            {ad.status_anuncio}
          </span>
        )}
      </div>

      {/* Main 2-column layout */}
      {isMobile ? (
        <div className="space-y-5">
          {renderLeftColumn()}
          {renderRightColumn()}
        </div>
      ) : (
        <div className="grid grid-cols-[3fr_2fr] gap-6">
          {renderLeftColumn()}
          <div className="space-y-5">
            <div className="lg:sticky lg:top-4">
              {renderRightColumn()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
