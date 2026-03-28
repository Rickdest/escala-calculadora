import { Product, StoreConfig, getShopeeFeeForPrice, SHOPEE_ACELERA_RATES } from '@/types/store';

export interface RoasCostBreakdown {
  costPrice: number;
  packagingCost: number;
  shopeeFee: number;
  taxes: number;
  affiliateCommission: number;
  campaigns: number;
  acelera: number;
  cpfAdditional: number;
}

export interface RoasResult {
  roasAtual: number | null;
  roasEmpate: number | null;
  roasSaudavel: number | null;
  roasIdeal: number | null;
  lucroBruto: number;
  taxaShopee: number;
  valorRecebido: number;
  totalCosts: number;
  margemInsuficiente: boolean;
  precoIncompleto: boolean;
  costs: RoasCostBreakdown;
}

/**
 * Unified ROAS calculation using ALL costs from StoreConfig.
 * Used by: RoasAnalysis, QuickCalculator, AdsTab, Ranking.
 */
// Percentual de margem consumida pelos ads:
// Saudável = ads consomem até 39% da margem (divisor 0.61)
// Ideal = ads consomem até 60% da margem (divisor 0.40)
const ROAS_SAUDAVEL_DIVISOR = 0.61;
const ROAS_IDEAL_DIVISOR = 0.40;

export function calcFullRoas(
  salePrice: number,
  costPrice: number,
  config: StoreConfig,
  packagingCost: number = 0,
  gastoAds: number = 0,
  receitaAds: number = 0,
): RoasResult {
  const sp = salePrice;
  const fee = getShopeeFeeForPrice(sp);
  const shopeeFeePercent = sp * (fee.percent / 100);
  const shopeeFeeFixed = fee.fixed;
  const cpfAdditional = (config.isCpfSeller && config.hasOver450Orders) ? 3 : 0;
  const totalShopeeFee = shopeeFeePercent + shopeeFeeFixed + cpfAdditional;

  const taxesCost = sp * ((config.taxes || 0) / 100);
  const pkg = config.enablePackaging ? packagingCost : 0;
  const affiliateCommission = config.enableAffiliateCommission ? sp * ((config.affiliateCommission || 0) / 100) : 0;
  const campaigns = config.enableShopeeCampaigns ? sp * ((config.shopeeCampaigns || 0) / 100) : 0;
  const acelera = sp * (SHOPEE_ACELERA_RATES[config.shopeeAcelera] ?? 0);

  const totalCosts = costPrice + pkg + totalShopeeFee + taxesCost + affiliateCommission + campaigns + acelera;
  const netProfit = sp - totalCosts;
  const valorRecebido = sp - totalShopeeFee;

  const costsBreakdown: RoasCostBreakdown = {
    costPrice,
    packagingCost: pkg,
    shopeeFee: totalShopeeFee,
    taxes: taxesCost,
    affiliateCommission,
    campaigns,
    acelera,
    cpfAdditional,
  };

  if (salePrice === 0 || costPrice === 0) {
    return {
      roasAtual: null, roasEmpate: null, roasSaudavel: null, roasIdeal: null,
      lucroBruto: 0, taxaShopee: totalShopeeFee, valorRecebido, totalCosts,
      margemInsuficiente: false, precoIncompleto: true, costs: costsBreakdown,
    };
  }

  if (netProfit <= 0) {
    return {
      roasAtual: null, roasEmpate: null, roasSaudavel: null, roasIdeal: null,
      lucroBruto: netProfit, taxaShopee: totalShopeeFee, valorRecebido, totalCosts,
      margemInsuficiente: true, precoIncompleto: false, costs: costsBreakdown,
    };
  }

  const roasEmpate = parseFloat((sp / netProfit).toFixed(2));
  const roasSaudavel = parseFloat((roasEmpate / ROAS_SAUDAVEL_DIVISOR).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate / ROAS_IDEAL_DIVISOR).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;

  return {
    roasAtual, roasEmpate, roasSaudavel, roasIdeal,
    lucroBruto: netProfit, taxaShopee: totalShopeeFee, valorRecebido, totalCosts,
    margemInsuficiente: false, precoIncompleto: false, costs: costsBreakdown,
  };
}

/** Convenience: calc from a Product + Config */
export function calcProductRoas(product: Product, config: StoreConfig): RoasResult {
  return calcFullRoas(
    product.salePrice,
    product.costPrice,
    config,
    product.packagingCost,
    product.adsCost,
    product.adsRevenue,
  );
}

export function getRoasStatus(roasAtual: number, roasEmpate: number, roasSaudavel: number, roasIdeal: number) {
  if (roasAtual < roasEmpate) return 'danger';
  if (Math.abs(roasAtual - roasEmpate) < 0.01) return 'empate';
  if (roasAtual < roasSaudavel) return 'warning';
  if (roasAtual < roasIdeal) return 'medium';
  return 'success';
}
