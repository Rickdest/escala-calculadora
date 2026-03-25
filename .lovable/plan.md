

## Adicionar Shopee na aba Calculadoras

### Contexto
A página `/calculadoras` tem 4 abas (TikTok, Shein, Amazon, ML), mas a Shopee — que é o marketplace principal do app — fica separada apenas no QuickCalculator da Home. Faz sentido unificar tudo na mesma página.

### Mudanças

#### 1. Criar `src/components/calculators/ShopeeTab.tsx`
- Campos: Preço de venda, Custo do produto, Embalagem, Impostos
- Toggles: CPF seller + >450 pedidos, Afiliado, Campanhas Shopee, Shopee Acelera
- Usar `getShopeeFeeForPrice()` e `SHOPEE_ACELERA_RATES` de `src/types/store.ts` para calcular taxas
- Mostrar faixa de taxa aplicada automaticamente (ex: "20% + R$4 para vendas até R$79,99")
- Usar `ResultPanel` com `showRoas` igual aos outros tabs

#### 2. Atualizar `src/pages/Calculators.tsx`
- Adicionar tab `shopee` como primeira aba (marketplace principal)
- Tab padrão passa a ser `shopee` em vez de `tiktok`
- Importar `ShopeeTab`

#### 3. Atualizar `src/lib/marketplaceShortcuts.ts`
- Adicionar entrada Shopee: `{ sigla: 'SP', name: 'Shopee', rate: '14–20%', tab: 'shopee', bg: '#EE4D2D', text: 'text-white' }`

### Ordem das abas
Shopee > TikTok > Shein > Amazon > Mercado Livre

