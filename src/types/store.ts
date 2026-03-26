export interface ShopeeFeeRange {
  minPrice: number;
  maxPrice: number | null;
  percent: number;
  fixed: number;
  label: string;
}

export const SHOPEE_FEE_RANGES: ShopeeFeeRange[] = [
  { minPrice: 0, maxPrice: 79.99, percent: 20, fixed: 4, label: 'Até R$79,99' },
  { minPrice: 80, maxPrice: 149.99, percent: 14, fixed: 16, label: 'R$80 a R$149,99' },
  { minPrice: 150, maxPrice: 299.99, percent: 14, fixed: 20, label: 'R$150 a R$299,99' },
  { minPrice: 300, maxPrice: null, percent: 14, fixed: 26, label: 'Acima de R$300' },
];

export const SHOPEE_ACELERA_RATES: Record<string, number> = {
  indicado: 0.025,
  nao_indicado: 0.035,
  none: 0,
};

export function getShopeeFeeForPrice(salePrice: number): ShopeeFeeRange {
  for (const range of SHOPEE_FEE_RANGES) {
    if (range.maxPrice === null || salePrice <= range.maxPrice) {
      return range;
    }
  }
  return SHOPEE_FEE_RANGES[SHOPEE_FEE_RANGES.length - 1];
}

export type ShopeeAceleraOption = 'none' | 'indicado' | 'nao_indicado';

export interface StoreConfig {
  isCpfSeller: boolean;
  hasOver450Orders: boolean;
  taxes: number;
  desiredMargin: number;
  currency: string;
  enablePackaging: boolean;
  enableAds: boolean;
  enableAffiliateCommission: boolean;
  enableShopeeCampaigns: boolean;
  affiliateCommission: number;
  shopeeCampaigns: number;
  shopeeAcelera: ShopeeAceleraOption;
}

export interface Store {
  id: string;
  name: string;
  config: StoreConfig;
  products: Product[];
  createdAt: Date;
  updatedAt: Date;
}

// ══════════ ERP-STYLE VARIATIONS ══════════

export interface ProductAttribute {
  id: string;
  name: string;        // e.g. "Tamanho", "Cor"
  values: string[];    // e.g. ["P", "M", "G", "GG"]
}

export interface ProductVariation {
  id: string;
  attributes: Record<string, string>; // e.g. { "Tamanho": "P", "Cor": "Preto" }
  sku?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
}

// Quick-add presets for common attributes
export const ATTRIBUTE_PRESETS: Record<string, string[]> = {
  'Tamanho': ['PP', 'P', 'M', 'G', 'GG', 'XG'],
  'Cor': ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde'],
  'Material': ['Algodão', 'Poliéster', 'Couro', 'Sintético'],
};

/**
 * Generate all combinations from a list of attributes.
 * E.g. [{ name: "Tamanho", values: ["P","M"] }, { name: "Cor", values: ["Preto","Branco"] }]
 * → [{ "Tamanho":"P","Cor":"Preto" }, { "Tamanho":"P","Cor":"Branco" }, ...]
 */
export function generateVariationCombinations(
  attributes: ProductAttribute[]
): Record<string, string>[] {
  const validAttrs = attributes.filter(a => a.values.length > 0);
  if (validAttrs.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const attr of validAttrs) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const val of attr.values) {
        next.push({ ...combo, [attr.name]: val });
      }
    }
    combos = next;
  }
  return combos;
}

/** Get a label for a variation combination, e.g. "P / Preto" */
export function getVariationLabel(attrs: Record<string, string>): string {
  return Object.values(attrs).join(' / ');
}

// ══════════ OTHER CHANNELS ══════════

export interface OtherChannelData {
  costPrice: number;
  salePrice: number;
}

export interface TikTokChannelData {
  costPrice: number;
  salePrice: number;
  packagingCost?: number;
  affiliatePercent?: number;
}

export interface SheinChannelData {
  costPrice: number;
  salePrice: number;
  category?: 'moda' | 'outros';
  weightKg?: number;
  packagingCost?: number;
}

export interface AmazonChannelData {
  costPrice: number;
  salePrice: number;
  categoryRate?: number;
  plan?: 'individual' | 'profissional';
  packagingCost?: number;
}

export interface MLChannelData {
  costPrice: number;
  salePrice: number;
  categoryIndex?: number;
  anuncio?: 'classico' | 'premium';
  freightCost?: number;
  packagingCost?: number;
}

export interface OutrosCanais {
  tiktok?: TikTokChannelData;
  shein?: SheinChannelData;
  amazon?: AmazonChannelData;
  ml?: MLChannelData;
}

// ══════════ PRODUCT ══════════

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  packagingCost: number;
  adsCost: number;
  adsRevenue: number;
  imageUrl?: string;
  stockQuantity: number;
  minStockQuantity: number;
  hasVariations: boolean;
  attributes: ProductAttribute[];
  variations: ProductVariation[];
  shopeeAcelera: ShopeeAceleraOption;
  outrosCanais?: OutrosCanais;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCalculation {
  grossRevenue: number;
  shopeeFeePercent: number;
  shopeeFeeFixed: number;
  totalShopeeFee: number;
  taxes: number;
  affiliateCommission: number;
  shopeeCampaigns: number;
  shopeeAcelera: number;
  adsRevenue: number;
  totalCosts: number;
  netProfit: number;
  realMargin: number;
  marginDifference: number;
  isAboveTarget: boolean;
}

export type SortOption = 'name' | 'margin-high' | 'margin-low' | 'profit-high' | 'profit-low' | 'recent' | 'stock-low' | 'stock-high';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  isCpfSeller: false,
  hasOver450Orders: false,
  taxes: 0,
  desiredMargin: 15,
  currency: 'BRL',
  enablePackaging: true,
  enableAds: true,
  enableAffiliateCommission: false,
  enableShopeeCampaigns: false,
  affiliateCommission: 0,
  shopeeCampaigns: 0,
  shopeeAcelera: 'none',
};
