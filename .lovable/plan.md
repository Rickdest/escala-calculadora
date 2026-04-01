

## Plano: Corrigir importação de Ads — usar endpoint alternativo + eliminar conflito de rate limit

### Diagnóstico

O erro `ads_rate_limit_total_api` acontece porque:

1. **`shopee-sync` TAMBÉM chama a mesma API de Ads** (linha 497-504 do shopee-sync), consumindo o rate limit global antes que `shopee-ads` consiga usar
2. O rate limit da Shopee é compartilhado entre TODOS os endpoints de Ads — chamadas em `shopee-sync` + `shopee-ads` competem pelo mesmo quota
3. Os retries dentro do rate limit window só pioram (cada retry conta como nova chamada)

### Solução em 3 partes

**1. Remover chamadas de Ads do `shopee-sync`**
- Remover a seção "4. Ads Performance" (linhas ~497-504) do `shopee-sync/index.ts`
- Remover as funções `fetchAdsChunkWithRetry` e `fetchAdsPerformance` do mesmo arquivo
- O `shopee-sync` passa a fazer APENAS: shop_info, products, orders
- Isso libera o rate limit inteiro para o `shopee-ads`

**2. Usar endpoint alternativo no `shopee-ads`**
- Trocar de `get_all_cpc_ads_daily_performance` para `get_product_campaign_daily_performance`
- Este endpoint busca por campanha individual e pode ter rate limit separado
- Se também falhar, tentar `get_gms_campaign_performance` como fallback
- Usar chunks menores (7 dias) com delays de 5s entre cada
- Adicionar log do response COMPLETO na primeira tentativa para debug

**3. Delay inicial de 2s no `shopee-ads`**
- Antes da primeira chamada, esperar 2s para garantir que não há chamadas concorrentes recentes
- Retries com delays maiores: 10s, 20s, 30s (em vez de 3s, 8s, 15s)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/shopee-sync/index.ts` | Remover toda lógica de Ads (~100 linhas) |
| `supabase/functions/shopee-ads/index.ts` | Trocar endpoint + delays maiores + log completo |

### Detalhes técnicos

Estratégia de endpoints (fallback chain):
```text
1. GET /api/v2/ads/get_product_campaign_daily_performance
   → Params: start_date, end_date (via query string, não POST body)
   → Se retornar dados → usar

2. Se rate_limit → esperar 10s → POST /api/v2/ads/get_all_cpc_ads_daily_performance  
   → Mesma lógica atual mas com 1 chunk único de 30 dias
   
3. Se ambos falharem → retornar ads_rate_limited: true com mensagem clara
```

O `get_total_balance` (GET) continuará funcionando pois tem rate limit separado e já está retornando R$ 891,36 nos logs.

