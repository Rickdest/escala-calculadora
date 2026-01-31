export interface StoreConfig {
  shopeeFee: number; // percentage (e.g., 12 for 12%)
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
  shopeeFee: number;
  taxes: number;
  totalCosts: number;
  netProfit: number;
  realMargin: number;
  marginDifference: number;
  isAboveTarget: boolean;
}

export type SortOption = 'name' | 'margin-high' | 'margin-low' | 'profit-high' | 'profit-low' | 'recent';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  shopeeFee: 12,
  taxes: 6,
  desiredMargin: 30,
  currency: 'BRL',
  enablePackaging: true,
  enableAds: true,
};
