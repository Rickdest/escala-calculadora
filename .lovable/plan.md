

## Logos oficiais nos tabs das calculadoras

### O que muda

Adicionar logos SVG inline dos 4 marketplaces (TikTok, Shein, Amazon, Mercado Livre) nas abas da página `/calculadoras`. Os logos ficam à esquerda do texto, com 16×16px.

### Implementação

**1. Criar `src/components/icons/MarketplaceLogos.tsx`**

Arquivo com 4 componentes SVG simples (TikTokLogo, SheinLogo, AmazonLogo, MLLogo), cada um recebendo `className` como prop. SVGs minimalistas monocromáticos que herdam `currentColor` para funcionar bem nos estados ativo/inativo das abas.

**2. Atualizar `src/pages/Calculators.tsx`**

- Importar os 4 logos
- Expandir o array `TABS` para incluir o componente do ícone:
  ```ts
  const TABS = [
    { key: 'tiktok', label: 'TikTok', icon: TikTokLogo },
    { key: 'shein', label: 'Shein', icon: SheinLogo },
    ...
  ];
  ```
- No `.map` dos tabs, renderizar `<tab.icon className="w-4 h-4 shrink-0" />` antes do label
- Ajustar o botão para `flex items-center justify-center gap-1.5`

### Detalhes técnicos

- SVGs inline (não imagens externas) para controle de cor e zero latência
- Usar `currentColor` nos paths para que a cor siga o estado ativo/inativo da aba automaticamente
- No mobile (390px), com 4 abas + ícone + texto, o `text-[12px]` existente + `gap-1.5` cabe sem overflow

