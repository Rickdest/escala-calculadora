

## Plano: Credenciais Duplas Shopee + Discovery Vendedor + ROAS Líquido

### Status: Fase 1 ✅ + Fase 2 ✅ implementadas

### Implementado

#### Fase 1 — Credenciais Duplas
- ✅ Secrets `SHOPEE_ADS_PARTNER_ID` e `SHOPEE_ADS_KEY` configurados
- ✅ Migration: `app_type` em `shopee_tokens` e `shopee_auth_states`
- ✅ `_shared/shopee.ts`: helpers parametrizáveis (`generateSignWith`, `shopeeGetWith`, `shopeePostWith`, `getAdsCredentials`, `getSellerCredentials`, `getCredentialsForAppType`)
- ✅ `shopee-auth`: aceita `app_type` no body, usa credenciais correspondentes
- ✅ `shopee-callback`: lê `app_type` do state, token exchange com credenciais certas, upsert com `app_type`
- ✅ `shopee-ads`: usa `getAdsCredentials()` + `shopeeGetWith` em todas as chamadas, busca token `app_type='ads'` com fallback
- ✅ `useShopeeToken`: aceita `appType`, novo hook `useShopeeTokenStatus` para status dual
- ✅ `ShopeeIntegrationModal`: cards de conexão dupla (Loja + Ads), status independente

#### Fase 2 — Discovery Vendedor
- ✅ Nova Edge Function `shopee-seller-discovery`: admin-only, 1s delay entre steps
- ✅ Testa: order_list (page_size=1), order_detail, escrow_detail, item_extra_info, shop_performance, shop_penalty, product_comment
- ✅ Cada step com try/catch individual, skip se sem dados
- ✅ Botão discovery no modal (admin-only), mostra JSON dos resultados

### Pendente — Fase 3 (pós-discovery)
- Migration: tabela `shopee_order_finances` + VIEW `shopee_finances_with_net`
- Sync finanças paginado no `shopee-sync`
- Dashboard ROAS bruto vs líquido com breakdown de taxas
