import { describe, it, expect } from 'vitest';
import { getShopeeFeeForPrice, generateVariationCombinations } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';

const configBase = {
  isCpfSeller: false, hasOver450Orders: false,
  taxes: 0, desiredMargin: 15, currency: 'BRL',
  enablePackaging: false, enableAds: false,
  enableAffiliateCommission: false, enableShopeeCampaigns: false,
  affiliateCommission: 0, shopeeCampaigns: 0, shopeeAcelera: 'none' as const,
};

describe('getShopeeFeeForPrice', () => {
  it('R$50 → 20% + R$4', () => {
    const fee = getShopeeFeeForPrice(50);
    expect(fee.percent).toBe(20);
    expect(fee.fixed).toBe(4);
  });

  it('R$79.99 → 20% + R$4', () => {
    const fee = getShopeeFeeForPrice(79.99);
    expect(fee.percent).toBe(20);
    expect(fee.fixed).toBe(4);
  });

  it('R$80 → 14% + R$16', () => {
    const fee = getShopeeFeeForPrice(80);
    expect(fee.percent).toBe(14);
    expect(fee.fixed).toBe(16);
  });

  it('R$150 → 14% + R$20', () => {
    const fee = getShopeeFeeForPrice(150);
    expect(fee.percent).toBe(14);
    expect(fee.fixed).toBe(20);
  });

  it('R$300 → 14% + R$26', () => {
    const fee = getShopeeFeeForPrice(300);
    expect(fee.percent).toBe(14);
    expect(fee.fixed).toBe(26);
  });

  it('R$500 → 14% + R$26', () => {
    const fee = getShopeeFeeForPrice(500);
    expect(fee.percent).toBe(14);
    expect(fee.fixed).toBe(26);
  });
});

describe('calcFullRoas', () => {
  it('R$100 venda, R$30 custo → taxa R$30, lucro R$40', () => {
    const r = calcFullRoas(100, 30, configBase);
    expect(r.taxaShopee).toBe(100 * 0.14 + 16); // 30
    expect(r.lucroBruto).toBe(100 - 30 - 30); // 40
    expect(r.margemInsuficiente).toBe(false);
  });

  it('R$50 venda, R$45 custo → margem insuficiente', () => {
    const r = calcFullRoas(50, 45, configBase);
    expect(r.margemInsuficiente).toBe(true);
    expect(r.roasEmpate).toBeNull();
  });

  it('shopeeAcelera indicado → custo = salePrice * 0.025', () => {
    const cfg = { ...configBase, shopeeAcelera: 'indicado' as const };
    const r = calcFullRoas(100, 30, cfg);
    expect(r.costs.acelera).toBeCloseTo(100 * 0.025);
  });

  it('shopeeAcelera nao_indicado → custo = salePrice * 0.035', () => {
    const cfg = { ...configBase, shopeeAcelera: 'nao_indicado' as const };
    const r = calcFullRoas(100, 30, cfg);
    expect(r.costs.acelera).toBeCloseTo(100 * 0.035);
  });

  it('CPF seller com +450 pedidos → adicional R$3', () => {
    const cfg = { ...configBase, isCpfSeller: true, hasOver450Orders: true };
    const r = calcFullRoas(100, 30, cfg);
    expect(r.costs.cpfAdditional).toBe(3);
  });
});

describe('generateVariationCombinations', () => {
  it('1 atributo com 3 valores → 3 combinações', () => {
    const result = generateVariationCombinations([
      { id: '1', name: 'Tamanho', values: ['P', 'M', 'G'] },
    ]);
    expect(result).toHaveLength(3);
  });

  it('2 atributos (2×3) → 6 combinações', () => {
    const result = generateVariationCombinations([
      { id: '1', name: 'Tamanho', values: ['P', 'M'] },
      { id: '2', name: 'Cor', values: ['Preto', 'Branco', 'Azul'] },
    ]);
    expect(result).toHaveLength(6);
  });

  it('atributo sem valores → array vazio', () => {
    const result = generateVariationCombinations([
      { id: '1', name: 'Tamanho', values: [] },
    ]);
    expect(result).toHaveLength(0);
  });
});
