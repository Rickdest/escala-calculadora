export interface MarketplaceShortcut {
  sigla: string;
  name: string;
  rate: string;
  rateDesktop?: string;
  tab: string;
  bg: string;
  text: string;
}

export const MARKETPLACE_SHORTCUTS: MarketplaceShortcut[] = [
  { sigla: 'SP', name: 'Shopee', rate: '14-20%', rateDesktop: '14-20% por faixa', tab: 'shopee', bg: '#EE4D2D', text: 'text-white' },
  { sigla: 'TK', name: 'TikTok Shop', rate: '12% + R$4', rateDesktop: '12% + R$4 fixo', tab: 'tiktok', bg: '#010101', text: 'text-white' },
  { sigla: 'SH', name: 'Shein', rate: 'Moda 20%', rateDesktop: 'Moda 20% · Outros 18%', tab: 'shein', bg: '#E43D79', text: 'text-white' },
  { sigla: 'AZ', name: 'Amazon', rate: '10-15%', rateDesktop: '10-15% por categoria', tab: 'amazon', bg: '#232F3E', text: 'text-white' },
  { sigla: 'ML', name: 'Mercado Livre', rate: '10-19%', rateDesktop: 'Clássico / Premium', tab: 'ml', bg: '#FFE600', text: 'text-black' },
];
