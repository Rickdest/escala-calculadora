

## Plano: Discovery Total — testar TODOS os endpoints de Ads ainda não usados

### Objetivo

Adicionar um Step temporário de discovery no `shopee-ads/index.ts` que testa todos os endpoints de leitura da API Shopee Ads v2 que ainda não são usados. Apenas logar respostas para análise — sem alterar dados ou UI.

### Endpoints já usados (10)

```text
✅ get_product_level_campaign_id_list
✅ get_product_level_campaign_setting_info
✅ get_all_cpc_ads_daily_performance
✅ get_product_campaign_daily_performance
✅ get_product_campaign_hourly_performance
✅ get_recommended_keyword_list
✅ get_all_cpc_ads_hourly_performance
✅ get_recommended_item_list
✅ get_shop_toggle_info
✅ get_total_balance
✅ get_gms_campaign_performance (fallback)
```

### Endpoints a testar (20)

Organizados por módulo. Cada chamada logada com `[DISCOVERY]` e 500ms de delay entre chamadas.

**Keyword Ads (Search Ads):**
1. `GET /api/v2/ads/get_keyword_level_campaign_id_list` — sem params extras
2. `GET /api/v2/ads/get_keyword_level_campaign_setting_info` — params: `campaign_id_list` (do resultado de #1)
3. `GET /api/v2/ads/get_keyword_campaign_daily_performance` — params: `campaign_id_list`, `start_date`, `end_date`
4. `GET /api/v2/ads/get_keyword_campaign_hourly_performance` — params: `campaign_id_list`, `performance_date`

**Shop Ads:**
5. `GET /api/v2/ads/get_shop_level_campaign_id_list` — sem params extras
6. `GET /api/v2/ads/get_shop_level_campaign_setting_info` — params: `campaign_id_list` (do resultado de #5)
7. `GET /api/v2/ads/get_shop_campaign_daily_performance` — params: `campaign_id_list`, `start_date`, `end_date`
8. `GET /api/v2/ads/get_shop_campaign_hourly_performance` — params: `campaign_id_list`, `performance_date`

**Discovery Ads ("Você também pode gostar"):**
9. `GET /api/v2/ads/get_discovery_ads_campaign_id_list` — sem params extras
10. `GET /api/v2/ads/get_discovery_ads_campaign_setting_info` — params: `campaign_id_list` (do resultado de #9)
11. `GET /api/v2/ads/get_discovery_campaign_daily_performance` — params: `campaign_id_list`, `start_date`, `end_date`
12. `GET /api/v2/ads/get_discovery_campaign_hourly_performance` — params: `campaign_id_list`, `performance_date`

**Otimização e sugestões:**
13. `GET /api/v2/ads/get_product_recommended_roi_target` — params: `item_id` (singular, não lista)
14. `GET /api/v2/ads/get_keyword_bid_suggestion` — params: `item_id`, `keyword` (primeira keyword ativa)
15. `GET /api/v2/ads/get_create_product_ad_budget_suggestion` — params: `item_id`
16. `GET /api/v2/ads/check_create_gms_product_campaign_eligibility` — params: `item_id_list`

**AMS (Marketing Automation):**
17. `GET /api/v2/ams/get_targeting_tag_list` — sem params extras
18. `GET /api/v2/ams/get_campaign_list` — sem params extras

**Outros:**
19. `GET /api/v2/ads/list_gms_user_deleted_item` — sem params extras
20. `GET /api/v2/ads/get_ads_facil_shop_rate` — sem params extras (corrigido: sem acento)

### Implementação

Após o Step 6 (Enrichment) e antes do Step 7 (Balance), adicionar um bloco `DISCOVERY`:

```typescript
// === DISCOVERY (temporary) ===
const disc: Record<string, any> = {};

// Keyword Ads
const kwIds = await shopeeGet("/api/v2/ads/get_keyword_level_campaign_id_list", ...);
disc.keyword_ids = kwIds;
// Se retornou IDs, testar settings + daily + hourly com o primeiro ID

// Shop Ads  
const shopIds = await shopeeGet("/api/v2/ads/get_shop_level_campaign_id_list", ...);
disc.shop_ids = shopIds;
// Se retornou IDs, testar settings + daily + hourly

// Discovery Ads
const discIds = await shopeeGet("/api/v2/ads/get_discovery_ads_campaign_id_list", ...);
disc.discovery_ids = discIds;
// Se retornou IDs, testar settings + daily + hourly

// ... demais endpoints
```

Cada resultado logado: `console.log('[DISCOVERY] endpoint_name:', JSON.stringify(res).substring(0, 1000))`

O campo `discovery_results` será incluído no retorno para análise no frontend (temporário).

### Rate limit

- 20 endpoints × 500ms delay = ~10s extra
- Endpoints que dependem de IDs de steps anteriores só são chamados se o step anterior retornou dados
- Total estimado: 12-20 chamadas extras dependendo dos dados disponíveis

### Arquivo alterado

```text
supabase/functions/shopee-ads/index.ts — adicionar bloco DISCOVERY temporário entre Step 6 e Step 7
```

