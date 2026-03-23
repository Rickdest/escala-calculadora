import { describe, it, expect } from 'vitest';
import { calculateProduct, getStoreStats } from '@/lib/calculateProduct';
import { Product, StoreConfig, Store } from '@/types/store';

const baseConfig: StoreConfig = {
  isCpfSeller: false,
  hasOver450Orders: false,
  taxes: 0,
  desiredMargin: 17,
  currency: 'BRL',
  enablePackaging: false,
  enableAds: false,
  enableAffiliateCommission: false,
  enableShopeeCampaigns: false,
  affiliateCommission: 0,
  shopeeCampaigns: 0,
  shopeeAcelera: 'none',
};

const baseProduct: Product = {
  id: 'test-1',
  storeId: 'store-1',
  name: 'Produto Teste',
  costPrice: 30,
  salePrice: 100,
  packagingCost: 0,
  adsCost: 0,
  adsRevenue: 0,
  stockQuantity: 10,
  minStockQuantity: 5,
  hasVariations: false,
  attributes: [],
  variations: [],
  shopeeAcelera: 'none',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('calculateProduct', () => {
  it('produto simples R$100 venda, R$30 custo → margem positiva', () => {
    const result = calculateProduct(baseProduct, baseConfig);
    expect(result.grossRevenue).toBe(100);
    expect(result.realMargin).toBeGreaterThan(0);
    expect(result.netProfit).toBeGreaterThan(0);
    // Shopee fee for R$100: 14% + R$16 fixed
    expect(result.shopeeFeePercent).toBeCloseTo(14);
    expect(result.totalShopeeFee).toBeCloseTo(30);
    // totalCosts = 30 (custo) + 30 (shopee) = 60
    expect(result.totalCosts).toBeCloseTo(60);
    expect(result.netProfit).toBeCloseTo(40);
    expect(result.realMargin).toBe(40);
  });

  it('produto com prejuízo (custo alto)', () => {
    const expensive = { ...baseProduct, costPrice: 90 };
    const result = calculateProduct(expensive, baseConfig);
    // totalCosts = 90 + 30 (shopee) = 120 > 100
    expect(result.netProfit).toBeLessThan(0);
    expect(result.realMargin).toBeLessThan(0);
    expect(result.isAboveTarget).toBe(false);
  });

  it('isCpfSeller + hasOver450Orders → adiciona R$3', () => {
    const cpfConfig = { ...baseConfig, isCpfSeller: true, hasOver450Orders: true };
    const result = calculateProduct(baseProduct, cpfConfig);
    // shopeeFeeFixed deve incluir os R$3 adicionais
    expect(result.shopeeFeeFixed).toBe(16 + 3);
    expect(result.totalShopeeFee).toBe(14 + 16 + 3);
  });

  it('shopeeAcelera indicado → custo adicional 2.5%', () => {
    const product = { ...baseProduct, shopeeAcelera: 'indicado' as const };
    const result = calculateProduct(product, baseConfig);
    expect(result.shopeeAcelera).toBeCloseTo(100 * 0.025);
    // Compara com sem acelera
    const base = calculateProduct(baseProduct, baseConfig);
    expect(result.netProfit).toBeLessThan(base.netProfit);
  });

  it('shopeeAcelera nao_indicado → custo adicional 3.5%', () => {
    const product = { ...baseProduct, shopeeAcelera: 'nao_indicado' as const };
    const result = calculateProduct(product, baseConfig);
    expect(result.shopeeAcelera).toBeCloseTo(100 * 0.035);
  });

  it('affiliateCommission 10% habilitada', () => {
    const config = { ...baseConfig, enableAffiliateCommission: true, affiliateCommission: 10 };
    const result = calculateProduct(baseProduct, config);
    expect(result.affiliateCommission).toBe(10); // 10% de R$100
    const base = calculateProduct(baseProduct, baseConfig);
    expect(result.netProfit).toBe(base.netProfit - 10);
  });

  it('shopeeCampaigns 5% habilitada', () => {
    const config = { ...baseConfig, enableShopeeCampaigns: true, shopeeCampaigns: 5 };
    const result = calculateProduct(baseProduct, config);
    expect(result.shopeeCampaigns).toBe(5); // 5% de R$100
    const base = calculateProduct(baseProduct, baseConfig);
    expect(result.netProfit).toBe(base.netProfit - 5);
  });
});

describe('getStoreStats', () => {
  const makeStore = (products: Product[]): Store => ({
    id: 'store-1',
    name: 'Loja Teste',
    config: baseConfig,
    products,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('0 produtos → tudo zerado', () => {
    const stats = getStoreStats(makeStore([]), calculateProduct);
    expect(stats).toEqual({
      avgMargin: 0,
      totalProducts: 0,
      productsAboveTarget: 0,
      productsBelowTarget: 0,
      totalProfit: 0,
    });
  });

  it('mix de produtos acima e abaixo da meta', () => {
    const profitable = { ...baseProduct, id: 'p1', costPrice: 30, salePrice: 100 }; // ~40% margin
    const losing = { ...baseProduct, id: 'p2', costPrice: 85, salePrice: 100 }; // ~-15% margin
    const stats = getStoreStats(makeStore([profitable, losing]), calculateProduct);
    expect(stats.totalProducts).toBe(2);
    expect(stats.productsAboveTarget).toBe(1);
    expect(stats.productsBelowTarget).toBe(1);
    expect(stats.avgMargin).toBeGreaterThan(-15);
    expect(stats.avgMargin).toBeLessThan(40);
    // totalProfit = soma dos dois
    const r1 = calculateProduct(profitable, baseConfig);
    const r2 = calculateProduct(losing, baseConfig);
    expect(stats.totalProfit).toBeCloseTo(r1.netProfit + r2.netProfit);
  });
});
