export interface StoreConfig {
  shopeeFeePercent: number; // percentage (e.g., 12 for 12%)
  shopeeFeeFixed: number; // fixed fee per sale (e.g., 2.00)
  taxes: number; // percentage
  desiredMargin: number; // percentage
  currency: string;
  enablePackaging: boolean;
  enableAds: boolean;
}

export interface Store {
  id: string;
  name: string;
  config: StoreConfig;
  products: Product[];
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCalculation {
  grossRevenue: number;
  shopeeFeePercent: number;
  shopeeFeeFixed: number;
  totalShopeeFee: number;
  taxes: number;
  totalCosts: number;
  netProfit: number;
  realMargin: number;
  marginDifference: number;
  isAboveTarget: boolean;
}

export type SortOption = 'name' | 'margin-high' | 'margin-low' | 'profit-high' | 'profit-low' | 'recent';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  shopeeFeePercent: 12,
  shopeeFeeFixed: 2,
  taxes: 6,
  desiredMargin: 30,
  currency: 'BRL',
  enablePackaging: true,
  enableAds: true,
};
