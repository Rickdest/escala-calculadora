export type SheinCategory = 'moda' | 'outros';

export const SHEIN_COMMISSION: Record<SheinCategory, number> = {
  moda: 0.20,
  outros: 0.18,
};

export const SHEIN_FREIGHT_TABLE = [
  { maxWeight: 0.3, cost: 4.00 },
  { maxWeight: 1, cost: 5.00 },
  { maxWeight: 2, cost: 5.00 },
  { maxWeight: 5, cost: 6.00 },
  { maxWeight: 9, cost: 7.00 },
];

export function getSheinFreight(weightKg: number): number {
  for (const band of SHEIN_FREIGHT_TABLE) {
    if (weightKg <= band.maxWeight) return band.cost;
  }
  return SHEIN_FREIGHT_TABLE[SHEIN_FREIGHT_TABLE.length - 1].cost;
}

export interface SheinResult {
  salePrice: number;
  commissionRate: number;
  commissionCost: number;
  freightCost: number;
  packagingCost: number;
  taxesCost: number;
  costPrice: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  isViable: boolean;
}

export function calcShein(
  salePrice: number,
  costPrice: number,
  category: SheinCategory,
  weightKg = 0,
  packagingCost = 0,
  taxesPercent = 0,
): SheinResult {
  const commissionRate = SHEIN_COMMISSION[category];
  const commissionCost = salePrice * commissionRate;
  const freightCost = weightKg > 0 ? getSheinFreight(weightKg) : 0;
  const taxesCost = salePrice * (taxesPercent / 100);
  const totalCosts = costPrice + packagingCost + commissionCost + freightCost + taxesCost;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  return { salePrice, commissionRate, commissionCost, freightCost, packagingCost, taxesCost, costPrice, totalCosts, netProfit, margin, isViable: netProfit > 0 };
}
