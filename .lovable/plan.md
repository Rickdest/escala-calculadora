

## Diagnóstico: por que o Comparativo de Canais mostra valores sem você ter preenchido preço

### O que está acontecendo

Existem **dois fluxos paralelos** no app calculando margem de outros marketplaces, e eles funcionam de formas diferentes:

**1. ProductForm (formulário de edição) — CORRETO**
Em `ProductForm.tsx` o "Comparativo de canais — tempo real" só aparece quando você preenche manualmente preço de venda + custo do TikTok/Shein/Amazon/ML em "Outros Canais". Usa o helper `calcOutrosCanais` em cima do objeto `product.outrosCanais` com taxas detalhadas por categoria (TikTok, Shein, etc.).

**2. ProductDetail e ProductDetailDrawer (telas de visualização) — É O CULPADO**
Essas duas telas usam uma lógica simplificada e **independente** do `outrosCanais`:

```ts
// src/pages/ProductDetail.tsx (linhas 16-22) e ProductDetailDrawer.tsx (linhas 13-19)
const PLATFORM_FEES = [
  { id: 'shopee', feePercent: 20, feeFixed: 4 },
  { id: 'amazon', feePercent: 15, feeFixed: 0 },
  { id: 'shein',  feePercent: 20, feeFixed: 0 },
  { id: 'ml',     feePercent: 14, feeFixed: 0 },
  { id: 'tiktok', feePercent: 12, feeFixed: 4 },
];

// margem = preço_shopee - custo - embalagem - (preço_shopee × taxa_fixa%) - impostos
```

Ou seja: ela pega o **mesmo preço de venda da Shopee** e simula "e se eu vendesse esse mesmo produto, pelo mesmo preço, em outra plataforma, com uma taxa fixa simplificada?". Não usa os preços por canal cadastrados e não considera frete/categoria/comissão real do marketplace.

Por isso aparecem valores como "Mercado Livre 42,3%" sem você ter preenchido nada — é uma **simulação hipotética em cima do preço da Shopee**, não o cálculo real do canal.

### Problemas dessa lógica simplificada

- **Confunde o usuário** (seu caso): parece que o app "inventou" preços
- **Diverge do ProductForm**: o formulário usa cálculo detalhado (`calcOutrosCanais`) com taxas por categoria; as telas de detalhe usam taxa única fixa — mesmos dados → resultados diferentes
- **Viola memória do projeto** (`mem://logic/multi-channel-margin-calculation`): a regra é usar `OtherChannels` com campos detalhados, não taxa fixa simplificada
- **Não respeita o que foi cadastrado**: se o usuário preencheu `outrosCanais` com preço/custo/frete específicos, essa info é ignorada nas telas de detalhe

### Solução proposta

Unificar para que **ProductDetail** e **ProductDetailDrawer** sigam a mesma regra do **ProductForm**:

1. **Se o produto tem `outrosCanais` preenchido** → usar `calcOutrosCanais` (cálculo real por canal, com taxas detalhadas)
2. **Se não tem** → exibir card vazio com CTA "Preencha 'Outros Canais' no produto para ver a comparação real" em vez de mostrar simulação enganosa
3. **Manter Shopee sempre visível** (margem real do produto) como referência

Vou também:
- Remover o array `PLATFORM_FEES` duplicado e a função `calcPlatformMargin` dos dois arquivos
- Renomear o título de "Margem em Outras Plataformas" → "Comparativo de Canais" para alinhar com o ProductForm
- Atualizar o badge "Melhor canal" para considerar só canais efetivamente cadastrados

### Arquivos a modificar

- `src/pages/ProductDetail.tsx` — substituir lógica de PLATFORM_FEES por `calcOutrosCanais`
- `src/components/ProductDetailDrawer.tsx` — mesma substituição
- `src/components/cards/ProductCard.tsx` — já tem guarda `product.outrosCanais && Object.keys(...).length > 0` mas calcula com `PLATFORM_FEES` simplificado. Trocar para usar `calcOutrosCanais` e mostrar só canais cadastrados

### Memória a salvar

Atualizar `mem://logic/multi-channel-margin-calculation` reforçando: **toda exibição de margem de outros canais (cards, drawer, página de detalhe) deve usar `calcOutrosCanais` em cima de `product.outrosCanais`. Nunca simular com taxa fixa em cima do preço da Shopee.**

