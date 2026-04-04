

## Plano: Dados faltantes das 2 APIs na Performance

### Bug encontrado
O `shopee-sync` **constrói** os campos enriquecidos (preço, estoque, rating, peso, etc.) no `enrichmentMap` (linha 117-133), mas na hora de **mesclar** no `product_sales` (linhas 390-396), só copia 5 campos: `image_url`, `likes`, `views`, `sales`, `item_status`. Os outros 8 campos são **descartados** — por isso a tela de detalhes não mostra preço, estoque, rating, peso nem prazo de envio.

### O que já temos vs. o que não estamos usando

```text
┌─────────────────────────────────────────────────────────────┐
│ API SELLER (shopee-sync)                                    │
├──────────────────────────┬──────────────────────────────────┤
│ ✅ Usando                │ ❌ Coletado mas não salvo        │
│ image_url                │ current_price / min / max        │
│ likes, views, sales      │ stock_available                  │
│ item_status              │ rating_star                      │
│ daily_sales (vendas/dia) │ comment_count                    │
│ variants (variações)     │ category_id                      │
│                          │ weight                           │
│                          │ days_to_ship                     │
├──────────────────────────┴──────────────────────────────────┤
│ API ADS (shopee-ads)                                        │
├──────────────────────────┬──────────────────────────────────┤
│ ✅ Usando na Performance │ ❌ Disponível mas não mostrado   │
│ expense, gmv, roas       │ direct_gmv / direct_roas         │
│ clicks, impressions, ctr │ avg_position (ranking de busca)  │
│ orders, cost_per_order   │ days_active                      │
│ status (ativo/pausado)   │ daily_data (gráfico Ads/dia)     │
│                          │ keywords (palavras-chave)        │
│                          │ hourly_performance (heatmap 24h) │
│                          │ total_balance (saldo Ads)        │
│                          │ recommended_items                │
└──────────────────────────┴──────────────────────────────────┘
```

### Correções e melhorias

#### 1. Fix merge no `shopee-sync` (bug)
Adicionar os 8 campos faltantes na mesclagem (linhas 390-396):
`current_price`, `min_price`, `max_price`, `stock_available`, `rating_star`, `comment_count`, `category_id`, `weight`, `days_to_ship`

#### 2. Enriquecer `PerformanceProductDetail` com dados de Ads completos
- **Direct vs Broad**: mostrar ROAS Direto vs ROAS Amplo
- **Posição Média**: badge de ranking de busca (se disponível)
- **Dias Ativos**: quantos dias a campanha rodou
- **Gráfico de Ads Diário**: gráfico de gasto e GMV por dia usando `daily_data`
- **Keywords**: listar top palavras-chave recomendadas (volume, bid, quality score)

#### 3. Persistir keywords no `shopee_ads_by_product`
Adicionar coluna `keywords jsonb` à tabela para que as palavras-chave recomendadas não se percam após o sync.

#### 4. Expandir seção de Ads no detalhe do produto
Layout com sub-abas ou seções:
- **Resumo**: gasto, GMV, ROAS direto/amplo, posição média
- **Tendência**: gráfico diário de gasto vs GMV de Ads
- **Keywords**: tabela com palavra, volume de busca, bid sugerido, quality score

### Arquivos modificados

```text
supabase/functions/shopee-sync/index.ts          — fix merge (adicionar 8 campos)
supabase/functions/shopee-ads/index.ts           — persistir keywords no upsert
supabase/migrations/                             — ADD keywords jsonb to shopee_ads_by_product
src/pages/PerformanceProductDetail.tsx            — seções de Ads expandidas + keywords + gráfico diário
src/components/performance/ProductExpandedDetail.tsx — badge posição média
```

### Resultado
Após a correção do merge, preço/estoque/rating/peso passam a aparecer na tela de detalhes. Com os dados de Ads expandidos (ROAS direto, posição, keywords, gráfico diário), a Performance vira um painel completo cruzando **tudo** das 2 APIs.

