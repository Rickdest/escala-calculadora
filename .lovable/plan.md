

## Plano: Aba de Performance de Produtos com dados de Pedidos expandidos

### O que a API da Shopee permite

**Período de pedidos**: A Shopee permite até **90 dias** no `get_order_list` (não apenas 15). Vamos expandir.

**Dados por pedido** (`get_order_detail` com `response_optional_fields`):
- `item_list` — cada item do pedido com `item_id`, `model_id`, `model_name`, `model_quantity_purchased`, `model_discounted_price`
- `total_amount`, `pay_time`, `order_status`
- Com isso conseguimos calcular: **variações mais vendidas**, **faturamento por produto**, **ticket médio**, **volume de vendas por período**

**O que NÃO conseguimos**: dados de conversão (visitas → vendas), impressões, ou ranking de mercado — isso é do Seller Center, não da API.

### Alterações

**1. Edge Function `shopee-sync/index.ts`**
- Expandir período de 15 para **90 dias**
- Paginar pedidos (loop com `cursor` enquanto `more === true`, máximo 200 pedidos)
- Buscar detalhes de todos os pedidos (batches de 50 order_sn)
- Agregar no backend:
  - `product_sales`: mapa `item_id → { name, total_qty, total_revenue, variants: { model_name, qty, revenue }[] }`
  - `summary`: total de pedidos, faturamento total, ticket médio, pedidos por status

**2. Frontend — Nova aba "Performance" no relatório do modal**

Seções:
- **Resumo**: total pedidos (90d), faturamento, ticket médio
- **Ranking de Produtos**: tabela ordenada por quantidade vendida, com faturamento
- **Variações mais vendidas**: dentro de cada produto, listar models ordenados por qty
- **Pedidos por status**: mini gráfico ou contadores (COMPLETED, SHIPPED, CANCELLED etc.)

**3. Arquivos envolvidos**
- `supabase/functions/shopee-sync/index.ts` — expandir período, paginar, agregar dados
- `src/components/roas/ShopeeIntegrationModal.tsx` — nova seção "Performance de Produtos" no relatório

### Limitações
- Máximo ~200 pedidos por sync (rate limit da API)
- Sem dados de visitas/conversão (não disponível na API Seller v2)
- Variações só aparecem se houver pedidos no período

