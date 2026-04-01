

## Plano: Integração Ads via API Shopee (substituir CSV)

### Contexto
As 25 APIs de Ads estão aprovadas no app Shopee. As mais relevantes para o Skalify:

```text
v2.ads.get_all_cpc_ads_daily_performance  → Performance diária de todos os anúncios
v2.ads.get_product_campaign_daily_performance → Performance por campanha de produto
v2.ads.get_total_balance → Saldo de Ads
v2.ads.get_shop_toggle_info → Status do Ads na loja
v2.ads.get_product_level_campaign_id_list → Listar campanhas por produto
```

### O que fazer

**1. Expandir a Edge Function `shopee-sync`**
- Adicionar seção "4. Ads" que chama:
  - `v2.ads.get_all_cpc_ads_daily_performance` (últimos 30 dias)
  - `v2.ads.get_total_balance` (saldo)
- Agregar dados diários em métricas por produto (impressões, cliques, GMV, spend, ROAS)
- Retornar no campo `results.ads_performance`

**2. Adicionar helper `shopeePost` no `_shared/shopee.ts`**
- Algumas APIs de Ads usam POST (body JSON). Criar `shopeePost(path, accessToken, shopId, body)` com mesma lógica de signing

**3. Processar resposta no frontend (`useAdsData` ou `AdsTab`)**
- Quando o botão "Sincronizar" é clicado e `SHOPEE_ADS_API_READY === true`:
  - Chamar `shopee-sync` (já existente)
  - Extrair `results.ads_performance` da resposta
  - Converter para o formato `ads_data` existente
  - Fazer upsert no banco com auto-link por `shopee_item_id`
  - Recarregar a aba

**4. Auto-link com produtos existentes**
- Usar mesma lógica já implementada: match por `shopee_item_id` → link direto, senão cria draft

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/shopee.ts` | Adicionar `shopeePost` |
| `supabase/functions/shopee-sync/index.ts` | Adicionar `fetchAdsPerformance()` |
| `src/hooks/useAdsData.ts` | Adicionar `importFromApi(apiResponse)` |
| `src/components/roas/AdsTab.tsx` | Botão "Sincronizar" chama API real |

### Detalhes técnicos

**API de Ads — request format:**
```text
POST /api/v2/ads/get_all_cpc_ads_daily_performance
Body: { start_date, end_date }
Sign: partner_id + path + timestamp + access_token + shop_id
```

**Response contém por anúncio:**
- `item_id`, `campaign_id`, `impressions`, `clicks`, `expense`, `gmv`, `orders`, `ctr`, `roas`

**Mapeamento para `ads_data`:**
- `expense` → `despesas`
- `gmv` → `gmv`  
- `orders` → `itens_vendidos`
- `item_id` → `shopee_item_id` (para auto-link)

### Fluxo do usuário
1. Clica "Sincronizar" na aba Ads
2. Edge function busca performance dos últimos 30 dias
3. Dados são processados e salvos em `ads_data` com link automático
4. Toast: "X anúncios sincronizados via API"
5. Se houver produtos novos, toast info com link para completar custo

