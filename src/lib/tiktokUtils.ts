export interface TikTokResult {
  salePrice: number;
  commission: number;
  shippingFee: number;
  fixedFee: number;
  affiliateCost: number;
  packagingCost: number;
  taxesCost: number;
  costPrice: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  isViable: boolean;
}

export function calcTikTok(
  salePrice: number,
  costPrice: number,
  packagingCost = 0,
  taxesPercent = 0,
  affiliatePercent = 0,
): TikTokResult {
  const commission = salePrice * 0.06;
  const shippingFee = salePrice * 0.06;
  const fixedFee = salePrice < 79 ? 4 : 0;
  const affiliateCost = salePrice * (affiliatePercent / 100);
  const taxesCost = salePrice * (taxesPercent / 100);
  const totalCosts = costPrice + packagingCost + commission + shippingFee + fixedFee + affiliateCost + taxesCost;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  return { salePrice, commission, shippingFee, fixedFee, affiliateCost, packagingCost, taxesCost, costPrice, totalCosts, netProfit, margin, isViable: netProfit > 0 };
}
