export type AmazonPlan = 'individual' | 'profissional';

export interface AmazonCategory {
  label: string;
  rate: number;
}

export const AMAZON_CATEGORIES: AmazonCategory[] = [
  { label: 'Comidas e Bebidas', rate: 0.10 },
  { label: 'TV, Áudio e Cinema em Casa', rate: 0.10 },
  { label: 'Pneus e Rodas', rate: 0.10 },
  { label: 'Eletrodomésticos de Linha Branca', rate: 0.11 },
  { label: 'Bebidas Alcoólicas', rate: 0.11 },
  { label: 'Celulares', rate: 0.11 },
  { label: 'Câmera e Fotografia', rate: 0.11 },
  { label: 'Videogames e Consoles', rate: 0.11 },
  { label: 'Ferramentas e Construção', rate: 0.11 },
  { label: 'Instrumentos Musicais e Acessórios', rate: 0.12 },
  { label: 'Saúde e Cuidados Pessoais', rate: 0.12 },
  { label: 'Indústria e Ciência', rate: 0.12 },
  { label: 'Produtos para Bebês', rate: 0.12 },
  { label: 'Produtos para Animais', rate: 0.12 },
  { label: 'Eletroportáteis Cuidado Pessoal', rate: 0.12 },
  { label: 'Cozinha', rate: 0.12 },
  { label: 'Jardim e Piscina', rate: 0.12 },
  { label: 'Brinquedos e Jogos', rate: 0.12 },
  { label: 'PC', rate: 0.12 },
  { label: 'Peças e Acessórios Automotivos', rate: 0.12 },
  { label: 'Casa', rate: 0.12 },
  { label: 'Esportes, Aventura e Lazer', rate: 0.12 },
  { label: 'Eletrônicos Portáteis', rate: 0.13 },
  { label: 'Beleza', rate: 0.13 },
  { label: 'Papelaria e Escritório', rate: 0.13 },
  { label: 'Relógios', rate: 0.13 },
  { label: 'Beleza de Luxo', rate: 0.14 },
  { label: 'Bagagem e Acessórios de Viagem', rate: 0.14 },
  { label: 'Roupas e Acessórios', rate: 0.14 },
  { label: 'Calçados, Bolsas e Óculos', rate: 0.14 },
  { label: 'Joias', rate: 0.14 },
  { label: 'Livros', rate: 0.15 },
  { label: 'Acessórios p/ Eletrônicos e PC', rate: 0.15 },
  { label: 'Móveis', rate: 0.15 },
  { label: 'Vídeo e DVD', rate: 0.15 },
  { label: 'Música (CDs, LPs etc)', rate: 0.15 },
  { label: 'Demais Categorias', rate: 0.15 },
];

export interface AmazonResult {
  salePrice: number;
  commissionRate: number;
  commissionCost: number;
  planFixedFee: number;
  packagingCost: number;
  taxesCost: number;
  costPrice: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  isViable: boolean;
}

export function calcAmazon(
  salePrice: number,
  costPrice: number,
  categoryRate: number,
  plan: AmazonPlan,
  packagingCost = 0,
  taxesPercent = 0,
): AmazonResult {
  const commissionCost = salePrice * categoryRate;
  const planFixedFee = plan === 'individual' ? 2 : 0;
  const taxesCost = salePrice * (taxesPercent / 100);
  const totalCosts = costPrice + packagingCost + commissionCost + planFixedFee + taxesCost;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  return { salePrice, commissionRate: categoryRate, commissionCost, planFixedFee, packagingCost, taxesCost, costPrice, totalCosts, netProfit, margin, isViable: netProfit > 0 };
}
