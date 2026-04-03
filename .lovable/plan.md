

## Plano: Credenciais Duplas Shopee + Discovery Vendedor + ROAS Líquido

### Contexto

Hoje o sistema usa um único par de credenciais Shopee (Partner ID 2032348). Existem dois apps aprovados — Vendedor (2032348) e Ads (2032223) — que precisam coexistir para cruzar dados financeiros com dados de Ads e calcular ROAS líquido real.

O plano e os ajustes propostos estão coerentes com o código atual. Confirmei que:
- `_shared/shopee.ts` usa `PARTNER_ID` e `getPartnerKey()` globais — precisa de helpers parametrizáveis
- `shopee-ads/index.ts` importa diretamente `PARTNER_ID`, `generateSign`, `shopeeGet`, `shopeePost` — precisa migrar para versões `With`
- `shopee_tokens` tem constraint `user_id, shop_id` — precisa virar `user_id, shop_id, app_type`
- `useShopeeToken.ts` busca `limit(1)` sem filtro de tipo — precisa de `app_type`
- `shopee-auth` e `shopee-callback` não têm noção de `app_type`

### Fase 1 — Credenciais Duplas

**1.1 Secrets** — Solicitar `SHOPEE_ADS_PARTNER_ID` (2032223) e `SHOPEE_ADS_KEY`

**1.2 Migration**
```sql
ALTER TABLE shopee_tokens ADD COLUMN app_type text NOT NULL DEFAULT 'seller';
DROP CONSTRAINT shopee_tokens_user_id_shop_id_key;
ADD CONSTRAINT shopee_tokens_user_shop_app UNIQUE (user_id, shop_id, app_type);
ALTER TABLE shopee_auth_states ADD COLUMN app_type text NOT NULL DEFAULT 'seller';
```

**1.3 `_shared/shopee.ts`** — Adicionar helpers parametrizáveis (`generateSignWith`, `shopeeGetWith`, `shopeePostWith`, `getAdsCredentials`) mantendo os atuais intactos

**1.4 `shopee-ads/index.ts`** — Usar `getAdsCredentials()` + versões `With` em todas as chamadas. Query de token filtra `app_type = 'ads'` com fallback sem filtro

**1.5 `shopee-auth/index.ts`** — Aceitar `app_type` no body (default `'seller'`), usar credenciais correspondentes, salvar no `shopee_auth_states`

**1.6 `shopee-callback/index.ts`** — Ler `app_type` do state row, token exchange com credenciais certas, upsert com `app_type`

**1.7 `useShopeeToken.ts`** — Aceitar `appType` param, `startOAuth(appType)` envia no body, query filtra por tipo

**1.8 UI conexão dupla** — No `ShopeeIntegrationModal`, card separado para "Dados da Loja" (seller) e "Dados de Ads" (ads) com status e botão independente

### Fase 2 — Discovery Vendedor

**2.1 Nova Edge Function `shopee-seller-discovery/index.ts`** — Nunca roda automaticamente. Admin-only. Testa com delay 1s entre cada:
1. `order/get_order_list` (7 dias, `page_size=1`) → pegar 1 `order_sn`
2. `order/get_order_detail` (com order_sn)
3. `finance/get_escrow_detail` (com order_sn) — skip se step 1 vazio
4. `product/get_item_extra_info` (com item_id existente)
5. `shop/get_shop_performance`
6. `shop/get_shop_penalty`
7. `product/get_comment` (com item_id)

Cada step com try/catch individual. Se order_list vazio → loga "Sem pedidos recentes" e pula steps que dependem de order_sn.

**2.2 Botão admin no frontend** — Visível só com `useAdmin`. Chama discovery e mostra JSON dos resultados.

### Fase 3 — ROAS Líquido (pós-discovery)

**3.1 Migration: `shopee_order_finances`**
```sql
CREATE TABLE shopee_order_finances (
  id uuid PK, user_id uuid NOT NULL, shop_id bigint, order_sn text,
  gmv_gross numeric, commission numeric, service_fee numeric,
  shipping_fee numeric, actual_shipping numeric, order_status text,
  return_amount numeric, item_ids jsonb DEFAULT '[]',
  synced_at timestamptz, created_at timestamptz,
  UNIQUE(user_id, shop_id, order_sn)
);
-- RLS: SELECT owner-only, sem INSERT/UPDATE/DELETE para clients (service_role only)
```

**3.2 VIEW para gmv_net calculado** (não armazenado):
```sql
CREATE VIEW shopee_finances_with_net AS
SELECT *, (gmv_gross - commission - service_fee - shipping_fee - return_amount) as gmv_net
FROM shopee_order_finances;
```

**3.3 Sync finanças no `shopee-sync`** — Paginar pedidos em lotes de 50, sleep 2s entre lotes, salvar cursor para continuar se timeout. Filtrar: só buscar escrow de pedidos com item_id associado a campanha de Ads.

**3.4 Dashboard** — Card comparativo ROAS bruto vs líquido com breakdown de taxas (comissão, frete, devoluções).

### Ordem de execução

```text
1. Secrets (SHOPEE_ADS_PARTNER_ID + SHOPEE_ADS_KEY)
2. Migration (app_type)
3. _shared/shopee.ts (helpers parametrizáveis)
4. shopee-auth + shopee-callback (suporte dual)
5. shopee-ads (usar credenciais Ads)
6. useShopeeToken + UI conexão dupla
7. Testar OAuth dos dois apps
8. shopee-seller-discovery (Fase 2)
9. Analisar resultados → decidir Fase 3
```

### Arquivos alterados

```text
Fase 1:
  supabase/functions/_shared/shopee.ts
  supabase/functions/shopee-ads/index.ts
  supabase/functions/shopee-auth/index.ts
  supabase/functions/shopee-callback/index.ts
  src/hooks/useShopeeToken.ts
  src/components/roas/ShopeeIntegrationModal.tsx
  Migration: app_type em shopee_tokens + shopee_auth_states

Fase 2:
  supabase/functions/shopee-seller-discovery/index.ts (NOVA)
  Frontend: botão admin para discovery

Fase 3 (pós-discovery):
  Migration: shopee_order_finances + VIEW
  supabase/functions/shopee-sync/index.ts
  src/components/roas/ApiAdsDashboard.tsx
```

