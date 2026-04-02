

## Plano: Integrar dados extras da API Shopee (keywords, horários, recomendações)

### Contexto

O Discovery confirmou 5 endpoints úteis que retornam dados. Vou remover o Step 6 Discovery (temporário) e substituir por chamadas permanentes que alimentam o dashboard.

### Alterações

#### 1. `supabase/functions/shopee-ads/index.ts` — substituir Discovery por dados permanentes

Remover todo o bloco de Discovery (Step 6, ~100 linhas). Substituir por 3 chamadas permanentes:

**A) Palavras-chave recomendadas** — para cada campanha ativa com item_id, chamar `get_recommended_keyword_list` (batch de 3, delay 1s). Salvar top 10 keywords no campo `keywords` de cada entrada em `adsByCampaign`.

**B) Performance por hora da loja** — chamar `get_all_cpc_ads_hourly_performance` com `performance_date` = ontem. Retornar no resultado como `hourly_performance`.

**C) Produtos recomendados para Ads** — chamar `get_recommended_item_list`. Retornar como `recommended_items`.

**D) Shop toggle info** — chamar `get_shop_toggle_info`. Retornar como `shop_toggles`.

Adicionar esses campos ao retorno da função:
```typescript
return {
  ...existingFields,
  hourly_performance: [...],
  recommended_items: [...],
  shop_toggles: { auto_top_up, campaign_surge },
};
```

Palavras-chave ficam dentro de cada campanha em `adsByCampaign[].keywords`.

#### 2. `src/components/roas/ApiAdsDashboard.tsx` — exibir novos dados

**A) Seção "Melhores Horários"** — após o gráfico diário, mostrar um mini heatmap/grid 24h com intensidade de cliques/conversões por hora baseado em `hourly_performance`.

**B) Seção "Produtos Recomendados"** — card simples listando itens que a Shopee recomenda anunciar, com nome e item_id.

**C) Keywords no CampaignDetail** — quando abrir detalhe de campanha, mostrar lista de keywords recomendadas com volume de busca e bid sugerido.

**D) Shop toggles** — badge no topo mostrando se auto_top_up está ativo e se campaign_surge está ativo.

#### 3. Interfaces — atualizar `ApiAdsData` e `CampaignAds`

Adicionar campos opcionais:
```typescript
interface CampaignAds {
  ...existing,
  keywords?: Array<{ keyword: string; search_volume: number; suggested_bid: number; quality_score?: number }>;
}
interface ApiAdsData {
  ...existing,
  hourly_performance?: Array<{ hour: number; impressions: number; clicks: number; expense: number; gmv: number }>;
  recommended_items?: Array<{ item_id: number; item_name: string }>;
  shop_toggles?: { auto_top_up: boolean; campaign_surge: boolean };
}
```

### Rate limit

- Keywords: batch de 3 com 2s delay (máx ~7 chamadas para 21 campanhas ativas)
- Hourly + recommended + toggles: 3 chamadas fixas com 500ms delay
- Total extra: ~10 chamadas, dentro do limite

### Arquivos alterados

```text
supabase/functions/shopee-ads/index.ts     — remover Discovery, adicionar keywords/hourly/recommended/toggles permanentes
src/components/roas/ApiAdsDashboard.tsx     — exibir horários, recomendações, keywords, toggles
```

