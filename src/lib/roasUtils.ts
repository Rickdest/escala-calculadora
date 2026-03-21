import { Product, StoreConfig, getShopeeFeeForPrice } from '@/types/store';

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
  costs: RoasCostBreakdown;
}

/**
 * Unified ROAS calculation using ALL costs from StoreConfig.
 * Used by: RoasAnalysis, QuickCalculator, AdsTab, Ranking.
 */
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
  const aceleraPercent = config.shopeeAcelera === 'indicado' ? 2.5 : config.shopeeAcelera === 'nao_indicado' ? 3.5 : 0;
  const acelera = sp * (aceleraPercent / 100);

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

  if (netProfit <= 0) {
    return {
      roasAtual: null, roasEmpate: null, roasSaudavel: null, roasIdeal: null,
      lucroBruto: netProfit, taxaShopee: totalShopeeFee, valorRecebido, totalCosts,
      margemInsuficiente: true, costs: costsBreakdown,
    };
  }

  const roasEmpate = parseFloat((sp / netProfit).toFixed(2));
  const roasSaudavel = parseFloat((roasEmpate / 0.61).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate / 0.40).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;

  return {
    roasAtual, roasEmpate, roasSaudavel, roasIdeal,
    lucroBruto: netProfit, taxaShopee: totalShopeeFee, valorRecebido, totalCosts,
    margemInsuficiente: false, costs: costsBreakdown,
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
  if (roasAtual === roasEmpate) return 'empate';
  if (roasAtual < roasSaudavel) return 'warning';
  if (roasAtual < roasIdeal) return 'medium';
  return 'success';
}
