

## Plano: Enriquecer Performance com dados completos das 2 APIs

### O que adicionar

#### 1. Enriquecer `shopee-sync` — mais campos do `get_item_base_info`

Atualizar `fetchProductsWithModels` para extrair do response e salvar no `enrichmentMap` (que vai para o JSONB `product_sales`):
- `price_info.current_price` ou `price_info.min_price` / `price_info.max_price`
- `stock_info_v2.summary_info.total_available_stock`
- `rating_star` (float 0-5)
- `comment_count`
- `category_id`
- `weight` (em kg)
- `days_to_ship`

Também pedir mais `response_optional_fields`: adicionar `description,weight,dimension,rating_star,comment_count,category_id`.

#### 2. Salvar vendas por dia no `product_sales`

No `fetchOrdersWithAggregation`, ao processar cada pedido, agrupar por data (`pay_time` ou `create_time`) para cada `item_id`. Salvar campo `daily_sales: Record<string, number>` (data ISO → qty) no `product_sales` JSONB. Isso permite gráfico de vendas diárias **real** em vez de simulado.

#### 3. Cruzar dados de Ads na tela de Performance

No frontend, carregar `shopee_ads_by_product` (já existe o hook `useApiAdsData`) e cruzar por `item_id`. Na tela de detalhes do produto, mostrar seção "Dados de Ads" com:
- Gasto total, GMV de Ads, ROAS
- CTR, Custo por pedido
- Status da campanha

#### 4. Atualizar `PerformanceProductDetail.tsx`

Adicionar novas seções:
- **Preço & Estoque**: preço atual, estoque disponível, alerta se < 10
- **Avaliação**: rating ⭐ + nº de avaliações
- **Vendas Diárias**: gráfico real usando `daily_sales`
- **Performance de Ads**: gasto, ROAS, CTR (cruzado do `shopee_ads_by_product`)
- **Logística**: peso, prazo de envio

#### 5. Atualizar `ProductExpandedDetail.tsx`

Adicionar mini-badges de:
- Rating (⭐ 4.8)
- Estoque (📦 45 un)
- Ads ROAS (se tiver campanha ativa)

### Arquivos

```text
supabase/functions/shopee-sync/index.ts           — mais campos no enrichmentMap + daily_sales
src/hooks/usePerformanceData.ts                    — tipar novos campos
src/pages/PerformanceProductDetail.tsx              — novas seções (preço, rating, ads, logística, gráfico real)
src/components/performance/ProductExpandedDetail.tsx — mini-badges extras
```

### Resultado

A aba Performance passa a exibir **tudo** que as 2 APIs disponibilizam: vendas reais por dia (gráfico), preço atual, estoque, rating/avaliações, dados de Ads cruzados (gasto/ROAS/CTR) e info logística — transformando a tela num painel completo de inteligência por produto.

