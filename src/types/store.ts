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

export interface ProductVariation {
  id: string;
  name: string;
  sku?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  costPrice: number;
  salePrice: number;
  packagingCost: number;
  adsCost: number;
  adsRevenue: number;
  imageUrl?: string;
  stockQuantity: number;
  hasVariations: boolean;
  variations: ProductVariation[];
  shopeeAcelera: ShopeeAceleraOption;
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
  desiredMargin: 17,
  currency: 'BRL',
  enablePackaging: true,
  enableAds: true,
  enableAffiliateCommission: false,
  enableShopeeCampaigns: false,
  affiliateCommission: 0,
  shopeeCampaigns: 0,
};
