import { Product, StoreConfig } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';

// ═══ Types ═══

export interface RoasEmpateResult {
  roasEmpate: number;
  margemContribuicao: number;
  lucroPorUnidade: number;
  acosMaximo: number;
}

export type Classificacao = 'LUCRATIVO' | 'MARGEM_APERTADA' | 'ABAIXO_EMPATE' | 'PREJUIZO';

export interface ClassificacaoResult {
  classificacao: Classificacao;
  cor: string;
  mensagem: string;
  acao: string;
}

export type PosClasse = 'TOPO' | 'PRIMEIRA_PAGINA' | 'SEGUNDA_PAGINA' | 'FORA_RADAR';

export interface DiagnosticoResult {
  emoji: string;
  titulo: string;
  mensagem: string;
  acaoRoas: string;
}

export interface MetaRoasResult {
  agressivo: number;
  equilibrado: number;
  conservador: number;
  empate: number;
  nota: string;
}

export interface CrossSellResult {
  temCrossSell: boolean;
  diferenca: number;
  mensagem: string;
}

export type AlertType = 'critico' | 'atencao' | 'oportunidade' | 'insight';

export interface AlertItem {
  productName: string;
  type: AlertType;
  priority: number;
  message: string;
  cor: string;
}

// ═══ Functions ═══

export function calcularRoasEmpate(product: Product, config: StoreConfig): RoasEmpateResult {
  const roasResult = calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost);
  const lucroBruto = roasResult.lucroBruto;
  const margemContribuicao = product.salePrice > 0 ? lucroBruto / product.salePrice : 0;
  const roasEmpate = margemContribuicao > 0 ? Number((1 / margemContribuicao).toFixed(2)) : Infinity;
  return {
    roasEmpate,
    margemContribuicao: Number((margemContribuicao * 100).toFixed(2)),
    lucroPorUnidade: Number(lucroBruto.toFixed(2)),
    acosMaximo: Number((margemContribuicao * 100).toFixed(2)),
  };
}

export function classificarAnuncio(roasDireto: number, roasEmpate: number): ClassificacaoResult {
  if (roasEmpate === Infinity || roasEmpate <= 0) {
    return { classificacao: 'PREJUIZO', cor: 'destructive', mensagem: 'Margem insuficiente para anunciar.', acao: 'PAUSAR' };
  }
  const ms = roasDireto / roasEmpate;
  if (roasDireto < 1) return { classificacao: 'PREJUIZO', cor: 'destructive', mensagem: `Cada R$1 em ads retorna R$${roasDireto.toFixed(2)}. Pausar imediatamente.`, acao: 'PAUSAR' };
  if (roasDireto < roasEmpate) return { classificacao: 'ABAIXO_EMPATE', cor: 'warning', mensagem: `ROAS ${roasDireto.toFixed(2)} abaixo do empate (${roasEmpate}). Anúncio consome ${Math.round((1 - ms) * 100)}% do lucro.`, acao: 'AUMENTAR_META_ROAS' };
  if (ms < 1.5) return { classificacao: 'MARGEM_APERTADA', cor: 'warning', mensagem: `ROAS ${roasDireto.toFixed(2)} acima do empate mas com margem de apenas ${Math.round((ms - 1) * 100)}%.`, acao: 'MONITORAR' };
  return { classificacao: 'LUCRATIVO', cor: 'success', mensagem: `ROAS ${roasDireto.toFixed(2)} é ${ms.toFixed(1)}x acima do empate. Considere aumentar orçamento.`, acao: 'ESCALAR' };
}

export function sugerirMetaRoas(roasEmpate: number): MetaRoasResult {
  return {
    agressivo: Number((roasEmpate * 1.1).toFixed(1)),
    equilibrado: Number((roasEmpate * 1.3).toFixed(1)),
    conservador: Number((roasEmpate * 1.5).toFixed(1)),
    empate: roasEmpate,
    nota: `Seu ROAS mínimo para não ter prejuízo é ${roasEmpate}. Configure a meta na Shopee como ${(roasEmpate * 1.3).toFixed(1)} para garantir margem.`,
  };
}

export function classificarPosicao(posicao: number): { classe: PosClasse; label: string } {
  if (posicao <= 3) return { classe: 'TOPO', label: 'Top 3 - Posição Premium' };
  if (posicao <= 8) return { classe: 'PRIMEIRA_PAGINA', label: 'Primeira Página' };
  if (posicao <= 16) return { classe: 'SEGUNDA_PAGINA', label: 'Segunda Página' };
  return { classe: 'FORA_RADAR', label: 'Baixa Visibilidade' };
}

function getRoasClasse(roasDireto: number, roasEmpate: number): string {
  if (roasEmpate === Infinity || roasEmpate <= 0) return 'PREJUIZO';
  const ms = roasDireto / roasEmpate;
  if (roasDireto < 1) return 'PREJUIZO';
  if (roasDireto < roasEmpate) return 'ABAIXO_EMPATE';
  if (ms < 1.5) return 'APERTADO';
  return 'LUCRATIVO';
}

const MATRIZ: Record<string, DiagnosticoResult> = {
  'TOPO_LUCRATIVO': { emoji: '🏆', titulo: 'Produto Dominante', mensagem: 'Posição premium + ROAS excelente. Manter configuração atual.', acaoRoas: 'manter' },
  'TOPO_APERTADO': { emoji: '⚖️', titulo: 'Topo mas margem fina', mensagem: 'Está no topo mas a margem é apertada. Aumente a meta de ROAS.', acaoRoas: 'conservador' },
  'TOPO_ABAIXO_EMPATE': { emoji: '🚨', titulo: 'Posição cara sem retorno', mensagem: 'Pagando caro para estar no topo mas não converte. Revisar produto/preço.', acaoRoas: 'pausar' },
  'TOPO_PREJUIZO': { emoji: '💀', titulo: 'Queimando dinheiro no topo', mensagem: 'Máxima visibilidade gerando máximo prejuízo. Pausar AGORA.', acaoRoas: 'pausar' },
  'PRIMEIRA_PAGINA_LUCRATIVO': { emoji: '🚀', titulo: 'Oportunidade de escalar', mensagem: 'ROAS forte na primeira página. Tem espaço para subir. Aumente budget.', acaoRoas: 'agressivo' },
  'PRIMEIRA_PAGINA_APERTADO': { emoji: '⚖️', titulo: 'Equilibrado - manter', mensagem: 'Performance ok. Subir posição pode apertar margem.', acaoRoas: 'equilibrado' },
  'PRIMEIRA_PAGINA_ABAIXO_EMPATE': { emoji: '🟠', titulo: 'Visível mas não lucrativo', mensagem: 'Primeira página mas abaixo do empate. Aumente a meta de ROAS.', acaoRoas: 'conservador' },
  'PRIMEIRA_PAGINA_PREJUIZO': { emoji: '🔴', titulo: 'Prejuízo - pausar', mensagem: 'Pausar. Revisar produto antes de reativar.', acaoRoas: 'pausar' },
  'SEGUNDA_PAGINA_LUCRATIVO': { emoji: '💎', titulo: 'Diamante escondido', mensagem: 'ROAS excelente na segunda página! Reduza a meta de ROAS para competir por posições melhores.', acaoRoas: 'agressivo' },
  'SEGUNDA_PAGINA_APERTADO': { emoji: '🔍', titulo: 'Testar com cuidado', mensagem: 'Margem apertada. Aumente budget em 20% por semana e monitore.', acaoRoas: 'equilibrado' },
  'SEGUNDA_PAGINA_ABAIXO_EMPATE': { emoji: '🟠', titulo: 'Sem tração', mensagem: 'Posição ruim + ROAS ruim. Revisar preço e diferenciais.', acaoRoas: 'pausar' },
  'SEGUNDA_PAGINA_PREJUIZO': { emoji: '🔴', titulo: 'Pausar', mensagem: 'Sem visibilidade e sem conversão. Pausar.', acaoRoas: 'pausar' },
  'FORA_RADAR_LUCRATIVO': { emoji: '💎', titulo: 'Oportunidade máxima', mensagem: 'Lucrativo mesmo invisível! Aumente budget significativamente.', acaoRoas: 'agressivo' },
  'FORA_RADAR_APERTADO': { emoji: '🔍', titulo: 'Testar subida', mensagem: 'Aumentar budget gradualmente para testar.', acaoRoas: 'equilibrado' },
  'FORA_RADAR_ABAIXO_EMPATE': { emoji: '⚪', titulo: 'Sem viabilidade', mensagem: 'Invisível e não lucrativo. Pausar.', acaoRoas: 'pausar' },
  'FORA_RADAR_PREJUIZO': { emoji: '💀', titulo: 'Descartar', mensagem: 'Posição 17+ com ROAS abaixo de 1. Foque em orgânico.', acaoRoas: 'pausar' },
};

export function getDiagnostico(posicao: number, roasDireto: number, roasEmpate: number): DiagnosticoResult | null {
  const posClasse = classificarPosicao(posicao).classe;
  const roasClasse = getRoasClasse(roasDireto, roasEmpate);
  return MATRIZ[`${posClasse}_${roasClasse}`] || null;
}

export function detectarCrossSell(roasGeral: number, roasDireto: number): CrossSellResult | null {
  const diff = roasGeral - roasDireto;
  if (diff > 1) {
    return {
      temCrossSell: true,
      diferenca: Number(diff.toFixed(2)),
      mensagem: `Este anúncio traz clientes que compram outros produtos. ROAS Geral (${roasGeral.toFixed(2)}) vs Direto (${roasDireto.toFixed(2)}): diferença de ${diff.toFixed(2)}.`,
    };
  }
  return null;
}

export function generateAlerts(adsData: Array<{
  nome_produto_csv: string;
  roas_direto: number;
  roas: number;
  acos: number;
  despesas: number;
  roas_empate: number | null;
  margem_contribuicao: number | null;
  periodo_inicio?: string;
  periodo_fim?: string;
}>): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const ad of adsData) {
    const name = ad.nome_produto_csv;
    if (ad.despesas <= 0) continue;

    // Check learning phase - suppress "pausar" alerts for <7 days
    let emAprendizado = false;
    if (ad.periodo_inicio && ad.periodo_fim) {
      const dias = Math.ceil((new Date(ad.periodo_fim).getTime() - new Date(ad.periodo_inicio).getTime()) / (1000 * 60 * 60 * 24));
      emAprendizado = dias < 7;
    }

    if (ad.roas_direto < 1) {
      if (emAprendizado) {
        alerts.push({ productName: name, type: 'atencao', priority: 2, message: `ROAS ${ad.roas_direto.toFixed(2)} baixo, mas anúncio em fase de aprendizado (< 7 dias). Aguarde antes de pausar.`, cor: 'warning' });
      } else {
        alerts.push({ productName: name, type: 'critico', priority: 1, message: `Cada R$1 investido retorna R$${ad.roas_direto.toFixed(2)}. Pause imediatamente.`, cor: 'destructive' });
      }
      continue;
    }

    if (ad.roas_empate && ad.roas_direto < ad.roas_empate) {
      alerts.push({ productName: name, type: 'atencao', priority: 2, message: `ROAS ${ad.roas_direto.toFixed(2)} abaixo do empate (${ad.roas_empate.toFixed(2)}). Aumente a meta de ROAS.`, cor: 'warning' });
    }

    if (ad.margem_contribuicao && ad.acos > ad.margem_contribuicao) {
      alerts.push({ productName: name, type: 'atencao', priority: 2, message: `ACOS (${ad.acos.toFixed(1)}%) maior que margem (${ad.margem_contribuicao.toFixed(1)}%).`, cor: 'warning' });
    }

    if (ad.roas_empate && ad.roas_direto >= ad.roas_empate * 2) {
      alerts.push({ productName: name, type: 'oportunidade', priority: 3, message: `ROAS ${ad.roas_direto.toFixed(2)} é ${(ad.roas_direto / ad.roas_empate).toFixed(1)}x acima do empate. Escale!`, cor: 'success' });
    }

    const cross = detectarCrossSell(ad.roas, ad.roas_direto);
    if (cross) {
      alerts.push({ productName: name, type: 'insight', priority: 4, message: cross.mensagem, cor: 'primary' });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}

// ═══ Efficiency Score ═══

export interface EfficiencyScore {
  score: number;
  label: string;
  color: string;
  breakdown: {
    roasScore: number;
    ctrScore: number;
    convScore: number;
    posScore: number;
  };
}

export function calcAdEfficiencyScore(
  roasDireto: number,
  roasEmpate: number | null,
  ctr: number,
  taxaConversao: number,
  posicaoMedia: number | null,
): EfficiencyScore {
  let roasScore = 0;
  if (roasEmpate && roasEmpate > 0 && roasEmpate !== Infinity) {
    const ratio = roasDireto / roasEmpate;
    if (ratio >= 2.5) roasScore = 40;
    else if (ratio >= 1.5) roasScore = 30;
    else if (ratio >= 1.0) roasScore = 20;
    else if (ratio >= 0.5) roasScore = 10;
  } else {
    if (roasDireto >= 8) roasScore = 35;
    else if (roasDireto >= 5) roasScore = 25;
    else if (roasDireto >= 2) roasScore = 15;
    else roasScore = 5;
  }

  let ctrScore = 0;
  if (ctr >= 4) ctrScore = 20;
  else if (ctr >= 2.5) ctrScore = 15;
  else if (ctr >= 1.5) ctrScore = 10;
  else if (ctr >= 0.8) ctrScore = 5;

  let convScore = 0;
  if (taxaConversao >= 3) convScore = 20;
  else if (taxaConversao >= 1.5) convScore = 15;
  else if (taxaConversao >= 0.8) convScore = 10;
  else if (taxaConversao >= 0.3) convScore = 5;

  let posScore = 10;
  if (posicaoMedia !== null) {
    if (posicaoMedia <= 3) posScore = 20;
    else if (posicaoMedia <= 8) posScore = 15;
    else if (posicaoMedia <= 16) posScore = 8;
    else posScore = 3;
  }

  const score = roasScore + ctrScore + convScore + posScore;
  let label: string, color: string;
  if (score >= 80) { label = 'Excelente'; color = 'text-success'; }
  else if (score >= 60) { label = 'Bom'; color = 'text-primary'; }
  else if (score >= 40) { label = 'Regular'; color = 'text-warning'; }
  else { label = 'Ruim'; color = 'text-destructive'; }

  return { score, label, color, breakdown: { roasScore, ctrScore, convScore, posScore } };
}

// ═══ Halo Effect ═══

export interface HaloEffect {
  haloGmv: number;
  haloItems: number;
  haloPct: number;
  isSignificant: boolean;
  message: string;
}

export function calcHaloEffect(
  gmv: number,
  gmvDireto: number,
  itensVendidos: number,
  itensVendidosDiretos: number,
): HaloEffect | null {
  if (gmv <= 0 || gmvDireto <= 0) return null;
  const haloGmv = gmv - gmvDireto;
  const haloItems = itensVendidos - itensVendidosDiretos;
  const haloPct = (haloGmv / gmv) * 100;
  if (haloGmv <= 0) return null;

  const isSignificant = haloPct > 10;
  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const message = isSignificant
    ? `Este anúncio gerou ${fmtBRL(haloGmv)} em vendas de OUTROS produtos da loja (${haloPct.toFixed(1)}% do GMV). É um forte "puxador" de vendas!`
    : `+${fmtBRL(haloGmv)} em vendas indiretas (${haloPct.toFixed(1)}% do GMV)`;

  return { haloGmv, haloItems, haloPct, isSignificant, message };
}

// ═══ Cost vs Margin Alert ═══

export interface CostMarginAlert {
  custoPorUnidade: number;
  lucroPorUnidade: number;
  pctConsumo: number;
  level: 'safe' | 'warning' | 'danger';
  message: string;
}

export function calcCostVsMarginAlert(
  despesas: number,
  itensVendidos: number,
  lucroPorUnidade: number,
): CostMarginAlert | null {
  if (itensVendidos <= 0 || lucroPorUnidade <= 0) return null;
  const custoPorUnidade = despesas / itensVendidos;
  const pctConsumo = (custoPorUnidade / lucroPorUnidade) * 100;

  let level: 'safe' | 'warning' | 'danger';
  let message: string;
  if (pctConsumo <= 30) {
    level = 'safe';
    message = `Ads consome apenas ${pctConsumo.toFixed(0)}% do lucro por unidade. Margem saudável.`;
  } else if (pctConsumo <= 60) {
    level = 'warning';
    message = `Ads consome ${pctConsumo.toFixed(0)}% do lucro por unidade. Monitore de perto.`;
  } else {
    level = 'danger';
    message = `⚠️ Ads consome ${pctConsumo.toFixed(0)}% do lucro por unidade! Considere reduzir gastos.`;
  }

  return { custoPorUnidade, lucroPorUnidade, pctConsumo, level, message };
}
