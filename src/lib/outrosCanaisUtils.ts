import { calcTikTok } from '@/lib/tiktokUtils';
import { calcShein } from '@/lib/sheinUtils';
import { calcAmazon, AMAZON_CATEGORIES } from '@/lib/amazonUtils';
import { calcML, ML_CATEGORIES } from '@/lib/mlUtils';
import { OutrosCanais } from '@/types/store';

export interface ChannelFee {
  label: string;
  value: number;
}

export interface ChannelResult {
  key: string;
  label: string;
  margin: number;
  netProfit: number;
  salePrice: number;
  isViable: boolean;
  fees: ChannelFee[];
  totalFees: number;
  costPrice: number;
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
    const fees: ChannelFee[] = [
      { label: 'Comissão TikTok (6%)', value: r.commission },
      { label: 'Frete plataforma (6%)', value: r.shippingFee },
      { label: 'Taxa fixa (< R$79)', value: r.fixedFee },
      { label: `Afiliados (${affiliatePercent}%)`, value: r.affiliateCost },
      { label: 'Embalagem', value: r.packagingCost },
      { label: `Impostos (${taxesPercent}%)`, value: r.taxesCost },
    ];
    const totalFees = fees.reduce((s, f) => s + f.value, 0);
    results.push({ key: 'tiktok', label: 'TikTok Shop', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable, fees, totalFees, costPrice });
  }

  if (outrosCanais.shein) {
    const { costPrice, salePrice, category = 'moda', weightKg = 0, packagingCost = 0 } = outrosCanais.shein;
    const r = calcShein(salePrice, costPrice, category, weightKg, packagingCost, taxesPercent);
    const fees: ChannelFee[] = [
      { label: `Comissão Shein (${(r.commissionRate * 100).toFixed(0)}%)`, value: r.commissionCost },
      { label: `Frete (${weightKg}kg)`, value: r.freightCost },
      { label: 'Embalagem', value: r.packagingCost },
      { label: `Impostos (${taxesPercent}%)`, value: r.taxesCost },
    ];
    const totalFees = fees.reduce((s, f) => s + f.value, 0);
    results.push({ key: 'shein', label: 'Shein', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable, fees, totalFees, costPrice });
  }

  if (outrosCanais.amazon) {
    const { costPrice, salePrice, categoryRate = 0.15, plan = 'profissional', packagingCost = 0 } = outrosCanais.amazon;
    const r = calcAmazon(salePrice, costPrice, categoryRate, plan, packagingCost, taxesPercent);
    const fees: ChannelFee[] = [
      { label: `Comissão Amazon (${(r.commissionRate * 100).toFixed(0)}%)`, value: r.commissionCost },
      { label: `Plano ${plan}`, value: r.planFixedFee },
      { label: 'Embalagem', value: r.packagingCost },
      { label: `Impostos (${taxesPercent}%)`, value: r.taxesCost },
    ];
    const totalFees = fees.reduce((s, f) => s + f.value, 0);
    results.push({ key: 'amazon', label: 'Amazon', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable, fees, totalFees, costPrice });
  }

  if (outrosCanais.ml) {
    const { costPrice, salePrice, categoryIndex = 0, anuncio = 'classico', freightCost = 0, packagingCost = 0 } = outrosCanais.ml;
    const r = calcML(salePrice, costPrice, categoryIndex, anuncio, freightCost, packagingCost, taxesPercent);
    const cat = ML_CATEGORIES[categoryIndex];
    const fees: ChannelFee[] = [
      { label: `Comissão ML ${anuncio} ${cat?.name ? '· ' + cat.name : ''} (${(r.commissionRate * 100).toFixed(0)}%)`, value: r.commissionCost },
      { label: 'Taxa fixa ML', value: r.fixedFee },
      { label: 'Frete', value: r.freightCost },
      { label: 'Embalagem', value: r.packagingCost },
      { label: `Impostos (${taxesPercent}%)`, value: r.taxesCost },
    ];
    const totalFees = fees.reduce((s, f) => s + f.value, 0);
    results.push({ key: 'ml', label: 'Mercado Livre', margin: r.margin, netProfit: r.netProfit, salePrice, isViable: r.isViable, fees, totalFees, costPrice });
  }

  return results.sort((a, b) => b.margin - a.margin);
}

export function getBestChannel(results: ChannelResult[]): ChannelResult | null {
  return results.length > 0 ? results[0] : null;
}
