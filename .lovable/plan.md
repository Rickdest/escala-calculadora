

## Plano: Adicionar Ads ao `shopee-sync` com endpoints corretos

### O que muda

O `shopee-sync` atualmente NÃO busca dados de Ads. Vamos adicionar uma seção "4. Ads" com os 3 endpoints corretos, e também atualizar o `shopee-ads` para usar a mesma lógica.

### Alterações

**1. `supabase/functions/shopee-sync/index.ts`** — Adicionar função `fetchAdsData`:

- **Passo 1**: `GET /api/v2/ads/get_product_level_campaign_id_list` → lista de campaign_ids
- **Passo 2**: `GET /api/v2/ads/get_product_level_campaign_setting_info` com `campaign_id_list` → detalhes de cada campanha
- **Passo 3**: `GET /api/v2/ads/get_all_cpc_ads_daily_performance` com `start_date` (30 dias atrás) e `end_date` (hoje) → performance diária
- Logar resposta completa de cada endpoint (primeiros 3000 chars)
- Adicionar seção "4. Ads" no handler principal, salvando em `results.ads_campaigns`, `results.ads_campaign_details`, `results.ads_performance`
- Nenhum endpoint antigo existe no arquivo atual (já foram removidos antes)

**2. `supabase/functions/shopee-ads/index.ts`** — Substituir lógica:

- Remover `tryProductCampaignAds` (endpoint inexistente `get_product_campaign_daily_performance`)
- Atualizar `fetchAdsPerformance` para usar os mesmos 3 endpoints:
  1. `get_product_level_campaign_id_list`
  2. `get_product_level_campaign_setting_info`
  3. `get_all_cpc_ads_daily_performance`
- Manter aggregação por item_id e balance

### Detalhes técnicos

Formato das datas: `YYYY-MM-DD` (string). Exemplo: `2026-03-03` a `2026-04-02`.

Para `get_product_level_campaign_setting_info`, o parâmetro `campaign_id_list` é passado como string de IDs separados por vírgula no query string (via `shopeeGet`).

Para `get_all_cpc_ads_daily_performance`, os parâmetros `start_date` e `end_date` são passados como query string params (via `shopeeGet`, não POST).

Todos os responses serão logados com `JSON.stringify(result).substring(0, 3000)` para debug.

