import { describe, it, expect } from 'vitest';
import { calcOutrosCanais, getBestChannel } from '@/lib/outrosCanaisUtils';
import { getSheinFreight } from '@/lib/sheinUtils';

describe('getSheinFreight', () => {
  it('0.2kg → R$4', () => {
    expect(getSheinFreight(0.2)).toBe(4);
  });

  it('0.3kg → R$4 (limite da faixa)', () => {
    expect(getSheinFreight(0.3)).toBe(4);
  });

  it('0.5kg → R$5', () => {
    expect(getSheinFreight(0.5)).toBe(5);
  });

  it('3kg → R$6', () => {
    expect(getSheinFreight(3)).toBe(6);
  });

  it('7kg → R$7', () => {
    expect(getSheinFreight(7)).toBe(7);
  });

  it('15kg (acima da tabela) → R$7 (última faixa)', () => {
    expect(getSheinFreight(15)).toBe(7);
  });
});

describe('calcOutrosCanais', () => {
  it('retorna array vazio para objeto vazio', () => {
    expect(calcOutrosCanais({})).toEqual([]);
  });

  it('calcula TikTok corretamente', () => {
    const results = calcOutrosCanais({ tiktok: { costPrice: 30, salePrice: 100 } });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('tiktok');
    expect(results[0].salePrice).toBe(100);
    expect(results[0].netProfit).toBeGreaterThan(0);
  });

  it('calcula múltiplos canais e ordena por margem', () => {
    const results = calcOutrosCanais({
      tiktok: { costPrice: 30, salePrice: 100 },
      shein: { costPrice: 30, salePrice: 100 },
      amazon: { costPrice: 30, salePrice: 100 },
      ml: { costPrice: 30, salePrice: 100 },
    });
    expect(results).toHaveLength(4);
    // Deve estar ordenado por margem decrescente
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].margin).toBeGreaterThanOrEqual(results[i].margin);
    }
  });

  it('aplica imposto corretamente', () => {
    const semImposto = calcOutrosCanais({ tiktok: { costPrice: 30, salePrice: 100 } }, 0);
    const comImposto = calcOutrosCanais({ tiktok: { costPrice: 30, salePrice: 100 } }, 10);
    expect(comImposto[0].netProfit).toBeLessThan(semImposto[0].netProfit);
  });
});

describe('getBestChannel', () => {
  it('retorna null para array vazio', () => {
    expect(getBestChannel([])).toBeNull();
  });

  it('retorna o primeiro item (maior margem)', () => {
    const results = calcOutrosCanais({
      tiktok: { costPrice: 30, salePrice: 100 },
      shein: { costPrice: 30, salePrice: 100 },
    });
    const best = getBestChannel(results);
    expect(best).toBe(results[0]);
  });
});
