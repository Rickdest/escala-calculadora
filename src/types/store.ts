export interface StoreConfig {
  shopeeFeePercent: number; // percentage (e.g., 20 for 20%)
  shopeeFeeFixed: number; // fixed fee per sale (e.g., 4.00)
  taxes: number; // percentage
  desiredMargin: number; // percentage
  currency: string;
  enablePackaging: boolean;
  enableAds: boolean;
  affiliateCommission: number; // percentage for affiliates
  shopeeCampaigns: number; // percentage for campaigns
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
  imageUrl?: string;
  stockQuantity: number;
  hasVariations: boolean;
  variations: ProductVariation[];
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
  totalCosts: number;
  netProfit: number;
  realMargin: number;
  marginDifference: number;
  isAboveTarget: boolean;
}

export type SortOption = 'name' | 'margin-high' | 'margin-low' | 'profit-high' | 'profit-low' | 'recent' | 'stock-low' | 'stock-high';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  shopeeFeePercent: 20,
  shopeeFeeFixed: 4,
  taxes: 0,
  desiredMargin: 17,
  currency: 'BRL',
  enablePackaging: true,
  enableAds: true,
  affiliateCommission: 0,
  shopeeCampaigns: 0,
};
