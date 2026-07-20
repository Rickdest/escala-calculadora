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
  // A partir de 15/07/2026: comissão 10% se < R$50, 6% se >= R$50
  // Taxa por item vendido: R$4 se < R$50, R$6 se >= R$50
  const commissionRate = salePrice < 50 ? 0.10 : 0.06;
  const commission = salePrice * commissionRate;
  const shippingFee = 0; // frete pago pelo comprador/plataforma
  const fixedFee = salePrice < 50 ? 4 : 6;
  const affiliateCost = salePrice * (affiliatePercent / 100);
  const taxesCost = salePrice * (taxesPercent / 100);
  const totalCosts = costPrice + packagingCost + commission + shippingFee + fixedFee + affiliateCost + taxesCost;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  return { salePrice, commission, shippingFee, fixedFee, affiliateCost, packagingCost, taxesCost, costPrice, totalCosts, netProfit, margin, isViable: netProfit > 0 };
}
