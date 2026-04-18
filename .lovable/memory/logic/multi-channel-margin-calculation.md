---
name: Multi-Channel Margin Calculation
description: Cálculo de margem para canais externos usa OtherChannels detalhado; nunca simular taxa fixa em cima do preço Shopee
type: feature
---

A lógica de cálculo para canais externos (TikTok, Shein, Amazon, Mercado Livre) utiliza campos detalhados em `OtherChannels` (preço de venda, custo, frete, categoria, comissão por canal) através do helper `calcOutrosCanais` em `src/lib/outrosCanaisUtils.ts`.

## Regra estrita de exibição

**Toda exibição de margem de outros canais (ProductCard, ProductDetailDrawer, ProductDetail) deve usar `calcOutrosCanais` em cima de `product.outrosCanais`.**

- ✅ Se `product.outrosCanais` tem dados → mostrar comparativo real por canal
- ✅ Se vazio → exibir CTA "Preencha 'Outros Canais' no produto"
- ❌ NUNCA simular margem aplicando taxa fixa percentual em cima do preço da Shopee. Isso confunde o usuário, diverge do ProductForm e ignora o que foi cadastrado.

## Histórico

Anteriormente `ProductDetail.tsx`, `ProductDetailDrawer.tsx` e `ProductCard.tsx` usavam um array `PLATFORM_FEES` hardcoded com taxa única simplificada e função `calcPlatformMargin` que recebia o preço Shopee e simulava margens hipotéticas. Isso foi removido — todos os 3 arquivos agora usam exclusivamente `calcOutrosCanais`.
