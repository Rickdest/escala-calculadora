export interface MLFeeTier {
  min: number;
  max: number | null;
  fee: number;
  percent?: number; // when fee is percent of price (e.g., "50% do preço" abaixo de 12,5)
}

export interface MLFeeConfigData {
  classic_pct: number;
  premium_pct: number;
  fixed_fee_min_price: number;
  fixed_fee_tiers: MLFeeTier[];
}

export interface MLProductRow {
  id?: string;
  ad_id: string | null;
  sku: string | null;
  name: string | null;
  variation: string | null;
  status: string | null;
  ad_type: 'classico' | 'premium' | null;
  sale_price: number | null;
  cost_price: number | null;
  packaging_cost: number | null;
  additional_cost: number | null;
  freight_cost: number | null;
  freight_mode: 'per_unit' | 'per_sale' | 'total_manual' | 'none';
  tax_value: number | null;
  tax_mode: 'percent' | 'fixed' | 'default';
  notes: string | null;
  linked_manually: boolean;
}

export interface MLImportedMetrics {
  unitsSold: number;
  salesCount: number;
  grossSales: number;
}

export interface MLCalcResult {
  revenue: number;
  productsCost: number;
  packagingTotal: number;
  additionalTotal: number;
  commission: number;
  commissionPct: number;
  fixedFeeUnit: number;
  fixedFeeTotal: number;
  taxes: number;
  freight: number;
  otherCosts: number;
  profit: number;
  margin: number;
  profitPerUnit: number;
  avgPrice: number;
  situation: MLSituation[];
}

export type MLSituation =
  | 'ok'
  | 'no_cost'
  | 'no_ad_type'
  | 'no_freight'
  | 'no_tax'
  | 'unlinked'
  | 'inactive';

export function pickFixedFee(
  tiers: MLFeeTier[],
  minPrice: number,
  price: number,
): number {
  if (!price || price <= 0) return 0;
  if (price >= minPrice) return 0; // acima do mínimo, ML não cobra tarifa fixa
  for (const t of tiers) {
    const max = t.max == null ? Infinity : t.max;
    if (price >= t.min && price < max) {
      if (t.percent && t.percent > 0) return price * (t.percent / 100);
      return t.fee || 0;
    }
  }
  return 0;
}

export function calcMercadoLivre(
  p: MLProductRow,
  m: MLImportedMetrics,
  cfg: MLFeeConfigData,
  defaultTaxPct = 0,
): MLCalcResult {
  const units = Math.max(0, m.unitsSold);
  const sales = Math.max(0, m.salesCount);
  const revenue = Math.max(0, m.grossSales);
  const avgPrice = units > 0 ? revenue / units : p.sale_price || 0;

  const cost = p.cost_price ?? 0;
  const pack = p.packaging_cost ?? 0;
  const add = p.additional_cost ?? 0;

  const productsCost = cost * units;
  const packagingTotal = pack * units;
  const additionalTotal = add * units;

  const commissionPct = p.ad_type === 'premium' ? cfg.premium_pct : p.ad_type === 'classico' ? cfg.classic_pct : 0;
  const commission = revenue * (commissionPct / 100);

  const fixedFeeUnit = pickFixedFee(cfg.fixed_fee_tiers, cfg.fixed_fee_min_price, avgPrice);
  const fixedFeeTotal = fixedFeeUnit * units;

  let taxes = 0;
  if (p.tax_mode === 'percent') taxes = revenue * ((p.tax_value ?? 0) / 100);
  else if (p.tax_mode === 'fixed') taxes = (p.tax_value ?? 0) * units;
  else taxes = revenue * (defaultTaxPct / 100);

  let freight = 0;
  const fc = p.freight_cost ?? 0;
  if (p.freight_mode === 'per_unit') freight = fc * units;
  else if (p.freight_mode === 'per_sale') freight = fc * sales;
  else if (p.freight_mode === 'total_manual') freight = fc;

  const otherCosts = 0;
  const profit =
    revenue - productsCost - packagingTotal - additionalTotal - commission - fixedFeeTotal - taxes - freight - otherCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const profitPerUnit = units > 0 ? profit / units : 0;

  const situation: MLSituation[] = [];
  if (!p.id) situation.push('unlinked');
  if (cost === 0) situation.push('no_cost');
  if (!p.ad_type) situation.push('no_ad_type');
  if (p.freight_mode === 'none' && (p.freight_cost ?? 0) === 0) situation.push('no_freight');
  if (p.tax_mode === 'default' && defaultTaxPct === 0) situation.push('no_tax');
  if (p.status && /pausad|inativ|encerrad|finaliza/i.test(p.status)) situation.push('inactive');
  if (situation.length === 0) situation.push('ok');

  return {
    revenue,
    productsCost,
    packagingTotal,
    additionalTotal,
    commission,
    commissionPct,
    fixedFeeUnit,
    fixedFeeTotal,
    taxes,
    freight,
    otherCosts,
    profit,
    margin,
    profitPerUnit,
    avgPrice,
    situation,
  };
}

export function situationLabel(s: MLSituation): { label: string; tone: 'ok' | 'warn' | 'err' | 'muted' } {
  switch (s) {
    case 'ok': return { label: 'Configurado', tone: 'ok' };
    case 'no_cost': return { label: 'Custo não informado', tone: 'err' };
    case 'no_ad_type': return { label: 'Tipo não informado', tone: 'warn' };
    case 'no_freight': return { label: 'Frete não configurado', tone: 'warn' };
    case 'no_tax': return { label: 'Imposto não configurado', tone: 'warn' };
    case 'unlinked': return { label: 'Produto não vinculado', tone: 'warn' };
    case 'inactive': return { label: 'Inativo', tone: 'muted' };
  }
}

export const DEFAULT_ML_FEE_CONFIG: MLFeeConfigData = {
  classic_pct: 14,
  premium_pct: 19,
  fixed_fee_min_price: 79,
  fixed_fee_tiers: [
    { min: 0, max: 12.5, fee: 0, percent: 50 },
    { min: 12.5, max: 29, fee: 6.25 },
    { min: 29, max: 50, fee: 6.5 },
    { min: 50, max: 79, fee: 6.75 },
  ],
};
