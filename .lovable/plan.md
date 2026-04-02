

## Plano: Performance por produto via `get_product_campaign_daily_performance`

### Resumo

Adicionar Step 4 no backend que busca performance diária **por campanha** (com `campaign_id`), agrega por `item_id`, e retorna `ads_by_product` com métricas reais por produto. No frontend, exibir cards por produto com sparkline, ordenação e botão de refresh individual.

### Parte 1 — Backend (`supabase/functions/shopee-ads/index.ts`)

**Novo Step 4** após Step 3 (daily_performance shop-level):

- Filtrar `campaignDetails` para status "ongoing" (status === 1 ou "ongoing")
- Agrupar por `item_id` usando o mapa já existente
- Para cada campanha ativa, chamar `shopeeGet("/api/v2/ads/get_product_campaign_daily_performance", ...)` com `campaign_id`, `start_date`, `end_date`
- **Rate limit**: batches de 5 chamadas, delay 200ms entre batches
- Parsear resposta: `result.response` (array) com campos `impression/impressions`, `click/clicks`, `expense/cost`, `broad_order_amount/gmv`, `broad_roas/roas`, `direct_order_amount/direct_gmv`, `average_position/avg_position`, `ctr`
- Agregar por `item_id`:
  - Somar: impressions, clicks, expense, gmv, direct_gmv, orders, direct_orders
  - Média ponderada por impressões: avg_position
  - Calcular: roas, direct_roas, acos, ctr, cost_per_order, days_active
  - Guardar `daily[]` array para sparkline
- Logar: total de produtos com dados, produto com maior gasto, produto com maior ROAS

**Aceitar query param `?item_id=XXX`**: quando presente, filtrar campanhas para apenas as que têm aquele item_id, permitindo refresh individual.

**Retorno atualizado**: `ads_by_product` deixa de ser `campaignDetails` e passa a ser o array agregado por produto com a estrutura especificada.

### Parte 2 — Frontend

**2a. `ApiAdsDashboard.tsx`** — Seção de produtos:
- Abaixo do gráfico diário, renderizar lista de cards por produto vindos de `ads_by_product`
- Cada card mostra: nome, ROAS (colorido), ROAS Direto, Gasto, GMV, Lucro estimado, Cliques, Impressões, CTR, Posição média, ACOS%, Custo/pedido, Pedidos, Dias ativos
- Mini sparkline (recharts `LineChart` pequeno, ~40px altura) dos últimos 7 dias de ROAS se `daily[]` tiver dados

**2b. Botão "↻ Atualizar"** por produto:
- No card, botão que chama `shopee-ads?item_id=XXX` 
- No `AdsTab.tsx`, nova função `handleRefreshProduct(itemId)` que invoca `syncAdsOnly` com param

**2c. Dropdown de ordenação**:
- Acima da lista de produtos, select com opções: ROAS, Gasto, GMV, Posição
- Estado local `sortBy`, aplicar `.sort()` antes de renderizar

**2d. `useShopeeToken.ts`** — Ajustar `syncAdsOnly`:
- Aceitar parâmetro opcional `itemId` para passar como body/query ao invocar `shopee-ads`

### Parte 3 — Banco de Dados

Criar tabela `shopee_ads_by_product` via migration:

```sql
CREATE TABLE public.shopee_ads_by_product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id bigint NOT NULL,
  item_id bigint NOT NULL,
  item_name text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  expense numeric DEFAULT 0,
  gmv numeric DEFAULT 0,
  direct_gmv numeric DEFAULT 0,
  orders integer DEFAULT 0,
  direct_orders integer DEFAULT 0,
  avg_position numeric,
  roas numeric DEFAULT 0,
  direct_roas numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cost_per_order numeric DEFAULT 0,
  days_active integer DEFAULT 0,
  daily_data jsonb DEFAULT '[]',
  campaign_ids jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, item_id, period_start)
);

ALTER TABLE public.shopee_ads_by_product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own" ON public.shopee_ads_by_product
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own" ON public.shopee_ads_by_product
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND has_active_subscription());
CREATE POLICY "Users can update own" ON public.shopee_ads_by_product
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own" ON public.shopee_ads_by_product
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

O backend faz upsert (`ON CONFLICT (user_id, item_id, period_start) DO UPDATE`) após agregar os dados.

### Arquivos alterados

```text
supabase/functions/shopee-ads/index.ts   — Step 4 + item_id filter + upsert
src/components/roas/ApiAdsDashboard.tsx   — cards por produto + sparkline + ordenação
src/components/roas/AdsTab.tsx            — handleRefreshProduct + passar dados
src/hooks/useShopeeToken.ts              — syncAdsOnly com itemId opcional
Migration SQL                            — nova tabela shopee_ads_by_product
```

