import { Product, Store, StoreConfig, ProductCalculation, getShopeeFeeForPrice, SHOPEE_ACELERA_RATES } from '@/types/store';

export function calculateProduct(product: Product, config: StoreConfig): ProductCalculation {
  const grossRevenue = product.salePrice;
  const range = getShopeeFeeForPrice(grossRevenue);
  const feePercent = range.percent;
  const feeFixed = range.fixed;

  const shopeeFeePercentValue = grossRevenue * (feePercent / 100);
  const shopeeFeeFixedValue = feeFixed;
  const cpfAdditional = (config.isCpfSeller && config.hasOver450Orders) ? 3 : 0;
  const totalShopeeFee = shopeeFeePercentValue + shopeeFeeFixedValue + cpfAdditional;
  const taxesValue = grossRevenue * (config.taxes / 100);
  const packagingCost = config.enablePackaging ? product.packagingCost : 0;
  const adsCost = config.enableAds ? product.adsCost : 0;
  const adsRevenue = config.enableAds ? product.adsRevenue : 0;
  const affiliateCommissionValue = config.enableAffiliateCommission ? grossRevenue * ((config.affiliateCommission || 0) / 100) : 0;
  const shopeeCampaignsValue = config.enableShopeeCampaigns ? grossRevenue * ((config.shopeeCampaigns || 0) / 100) : 0;

  const productAcelera = product.shopeeAcelera !== 'none' ? product.shopeeAcelera : config.shopeeAcelera;
  const aceleraCost = grossRevenue * (SHOPEE_ACELERA_RATES[productAcelera] ?? 0);

  const totalCosts = product.costPrice + packagingCost + adsCost + totalShopeeFee + taxesValue + affiliateCommissionValue + shopeeCampaignsValue + aceleraCost;
  const netProfit = grossRevenue + adsRevenue - totalCosts;
  const realMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const marginDifference = realMargin - config.desiredMargin;

  return {
    grossRevenue,
    shopeeFeePercent: shopeeFeePercentValue,
    shopeeFeeFixed: shopeeFeeFixedValue + cpfAdditional,
    totalShopeeFee,
    taxes: taxesValue,
    affiliateCommission: affiliateCommissionValue,
    shopeeCampaigns: shopeeCampaignsValue,
    shopeeAcelera: aceleraCost,
    adsRevenue,
    totalCosts,
    netProfit,
    realMargin,
    marginDifference,
    isAboveTarget: realMargin >= config.desiredMargin,
  };
}

export function getStoreStats(store: Store, calculateFn: (product: Product, config: StoreConfig) => ProductCalculation) {
  if (store.products.length === 0) {
    return { avgMargin: 0, totalProducts: 0, productsAboveTarget: 0, productsBelowTarget: 0, totalProfit: 0 };
  }
  const calculations = store.products.map(p => calculateFn(p, store.config));
  const avgMargin = calculations.reduce((sum, c) => sum + c.realMargin, 0) / calculations.length;
  const productsAboveTarget = calculations.filter(c => c.isAboveTarget).length;
  const productsBelowTarget = calculations.filter(c => !c.isAboveTarget).length;
  const totalProfit = calculations.reduce((sum, c) => sum + c.netProfit, 0);
  return { avgMargin, totalProducts: store.products.length, productsAboveTarget, productsBelowTarget, totalProfit };
}
