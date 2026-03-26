import { calcTikTok } from '@/lib/tiktokUtils';
import { calcShein } from '@/lib/sheinUtils';
import { calcAmazon, AMAZON_CATEGORIES } from '@/lib/amazonUtils';
import { calcML, ML_CATEGORIES } from '@/lib/mlUtils';
import { OutrosCanais } from '@/types/store';

export interface ChannelResult {
  key: string;
  label: string;
  margin: number;
  netProfit: number;
  salePrice: number;
  isViable: boolean;
}

/**
 * Calcula margem e lucro para cada canal ativo em outrosCanais.
 * taxesPercent vem do StoreConfig.taxes da loja — mesmo imposto da Shopee.
 * Embalagem não entra — varia por canal e produto.
 */
export function calcOutrosCanais(
  outrosCanais: OutrosCanais,
  taxesPercent = 0,
): ChannelResult[] {
  const results: ChannelResult[] = [];

  if (outrosCanais.tiktok) {
    const { costPrice, salePrice, packagingCost = 0, affiliatePercent = 0 } = outrosCanais.tiktok;
    const r = calcTikTok(salePrice, costPrice, packagingCost, taxesPercent, affiliatePercent);
    results.push({ key: 'tiktok', label: 'TikTok Shop', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable });
  }

  if (outrosCanais.shein) {
    const { costPrice, salePrice, category = 'moda', weightKg = 0, packagingCost = 0 } = outrosCanais.shein;
    const r = calcShein(salePrice, costPrice, category, weightKg, packagingCost, taxesPercent);
    results.push({ key: 'shein', label: 'Shein', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable });
  }

  if (outrosCanais.amazon) {
    const { costPrice, salePrice, categoryRate = 0.15, plan = 'profissional', packagingCost = 0 } = outrosCanais.amazon;
    const r = calcAmazon(salePrice, costPrice, categoryRate, plan, packagingCost, taxesPercent);
    results.push({ key: 'amazon', label: 'Amazon', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable });
  }

  if (outrosCanais.ml) {
    const { costPrice, salePrice, categoryIndex = 0, anuncio = 'classico', freightCost = 0, packagingCost = 0 } = outrosCanais.ml;
    const r = calcML(salePrice, costPrice, categoryIndex, anuncio, freightCost, packagingCost, taxesPercent);
    results.push({ key: 'ml', label: 'Mercado Livre', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable });
  }

  return results.sort((a, b) => b.margin - a.margin);
}

export function getBestChannel(results: ChannelResult[]): ChannelResult | null {
  return results.length > 0 ? results[0] : null;
}
