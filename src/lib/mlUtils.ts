export type MLAnuncio = 'classico' | 'premium';

export interface MLCategory {
  label: string;
  classico: number;
  premium: number;
}

export const ML_CATEGORIES: MLCategory[] = [
  { label: 'Geral (Casa, Ferramentas, Brinquedos)', classico: 0.11, premium: 0.16 },
  { label: 'Moda (Vestuário, Acessórios)', classico: 0.14, premium: 0.19 },
  { label: 'Eletrônicos (Celulares, Informática)', classico: 0.10, premium: 0.15 },
  { label: 'Autopeças', classico: 0.12, premium: 0.17 },
  { label: 'Beleza e Saúde', classico: 0.11, premium: 0.16 },
  { label: 'Livros', classico: 0.10, premium: 0.15 },
  { label: 'Pet Shop', classico: 0.125, premium: 0.175 },
  { label: 'Alimentos e Bebidas', classico: 0.14, premium: 0.19 },
];

export function getMLFixedFee(salePrice: number): number {
  if (salePrice >= 79) return 0;
  if (salePrice < 12.5) return salePrice * 0.5;
  if (salePrice < 29) return 6.25;
  if (salePrice < 50) return 6.50;
  return 6.75;
}

export interface MLResult {
  salePrice: number;
  commissionRate: number;
  commissionCost: number;
  fixedFee: number;
  freightCost: number;
  packagingCost: number;
  taxesCost: number;
  costPrice: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  isViable: boolean;
}

export function calcML(
  salePrice: number,
  costPrice: number,
  categoryIndex: number,
  anuncio: MLAnuncio,
  freightCost = 0,
  packagingCost = 0,
  taxesPercent = 0,
): MLResult {
  const cat = ML_CATEGORIES[categoryIndex];
  const commissionRate = anuncio === 'classico' ? cat.classico : cat.premium;
  const commissionCost = salePrice * commissionRate;
  const fixedFee = getMLFixedFee(salePrice);
  const taxesCost = salePrice * (taxesPercent / 100);
  const totalCosts = costPrice + packagingCost + commissionCost + fixedFee + freightCost + taxesCost;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  return { salePrice, commissionRate, commissionCost, fixedFee, freightCost, packagingCost, taxesCost, costPrice, totalCosts, netProfit, margin, isViable: netProfit > 0 };
}
