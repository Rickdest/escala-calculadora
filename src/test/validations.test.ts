import { describe, it, expect } from 'vitest';
import { productSchema, storeSettingsSchema, quickCalcSchema, validateForm } from '@/lib/validations';

describe('productSchema', () => {
  it('aceita dados válidos', () => {
    const result = validateForm(productSchema, {
      name: 'Produto Teste',
      costPrice: 30,
      salePrice: 100,
      packagingCost: 2,
      adsCost: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    const result = validateForm(productSchema, {
      name: '',
      costPrice: 30,
      salePrice: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
    }
  });

  it('rejeita preço negativo', () => {
    const result = validateForm(productSchema, {
      name: 'Test',
      costPrice: -10,
      salePrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita valor acima do limite', () => {
    const result = validateForm(productSchema, {
      name: 'Test',
      costPrice: 30,
      salePrice: 9999999,
    });
    expect(result.success).toBe(false);
  });
});

describe('storeSettingsSchema', () => {
  it('aceita configurações válidas', () => {
    const result = validateForm(storeSettingsSchema, {
      desiredMargin: 17,
      taxes: 6,
      affiliateCommission: 10,
      shopeeCampaigns: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita margem acima de 100%', () => {
    const result = validateForm(storeSettingsSchema, {
      desiredMargin: 150,
      taxes: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('quickCalcSchema', () => {
  it('aceita valores válidos', () => {
    const result = validateForm(quickCalcSchema, {
      costPrice: 50,
      salePrice: 100,
      packaging: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita custo zero', () => {
    const result = validateForm(quickCalcSchema, {
      costPrice: 0,
      salePrice: 100,
    });
    expect(result.success).toBe(false);
  });
});
