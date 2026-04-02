

## Correção: Dados zerados nos Ads e botão "Atualizar Dados" não funciona

### Diagnóstico

**3 problemas confirmados nos logs:**

1. **`console.log('[SHOPEE SIGN]')` na linha 72 de `_shared/shopee.ts` ainda existe** — cada chamada de API gera 1 log de sign. Com 5 estratégias × 21 campanhas = 105+ chamadas = 105+ linhas de SIGN que estouram o buffer de 100 linhas do Supabase, escondendo TODOS os logs `[DEBUG]`, `Step 1/2/3/4` e erros.

2. **Datas com janela de 365 dias provavelmente causam rejeição silenciosa** — a Shopee API de performance diária normalmente aceita no máximo 30 dias por request. Enviar `2025-04-02 → 2026-04-01` (365 dias) faz a API retornar vazio sem erro.

3. **Botão "Atualizar Dados"** chama `syncAdsOnly(itemId)`, que roda Steps 1-3 inteiros antes de filtrar no Step 4 — desperdiça tempo. Além disso, o resultado atualiza `apiAdsData` mas NÃO atualiza o `selectedDetail` (o `EnrichedAdsData` que o detail view está mostrando), então a UI permanece com os dados antigos.

### Plano de correção

#### 1. `_shared/shopee.ts` — Remover log do SIGN completamente

Linha 72: remover `console.log('[SHOPEE SIGN] generated sign: ${hex}')`. Isso libera ~100% do buffer para logs úteis.

#### 2. `shopee-ads/index.ts` — Dividir janela de datas em chunks de 30 dias

Em vez de enviar 365 dias de uma vez (que a Shopee rejeita silenciosamente), dividir em blocos de 30 dias e concatenar os resultados. Isso se aplica ao Step 3 (shop-level daily) e Step 4 (per-campaign daily).

```text
Antes: 1 request com 365 dias → vazio
Depois: ~12 requests de 30 dias cada → dados reais
```

Também: reduzir `ADS_LOOKBACK_DAYS` de 365 para 90 (máximo útil), e no Step 3 e `fetchCampaignDaily`, fazer chunks de 30 dias.

#### 3. `shopee-ads/index.ts` — Reduzir estratégias de fallback

Atualmente são 5 estratégias por campanha (POST daily, GET daily, Unix TS, hourly, GMS). Cada uma gera 1+ chamadas de API. Com 21 campanhas, são ~100+ chamadas desnecessárias.

Simplificar para: POST daily (chunks de 30d). Se falhar, GET daily (chunks de 30d). Remover unix-ts, hourly e GMS como estratégias padrão — são experimentais e nenhuma retornou dados nos logs.

#### 4. `AdsTab.tsx` — Atualizar detail view após refresh

No `handleRefreshProduct`, após atualizar `apiAdsData`, também atualizar o `selectedDetail` com os novos dados da campanha correspondente.

```typescript
// Após atualizar apiAdsData, atualizar detail view
const updatedCampaign = adsPerfData.ads_by_campaign?.find(
  (c: any) => String(c.item_id) === String(itemId)
);
if (updatedCampaign) {
  setSelectedDetail(campaignToEnrichedAds(updatedCampaign));
}
```

#### 5. `shopee-ads/index.ts` — Usar summary metrics do Step 2 como dados do produto

O Step 2 já extrai métricas via `extractCampaignSummaryMetrics` (impressions, clicks, expense, gmv, etc). Quando o Step 4 retorna entries vazias, essas métricas do summary JÁ são usadas como fallback (`processCampaignEntries` linha 404). Porém, se `hasData` é false, nada é salvo. Garantir que campanhas com `summary_metrics.hasData === true` sejam incluídas no resultado mesmo com entries vazias (já faz isso, mas confirmar que `info_type_list: "1,2"` retorna performance).

### Arquivos alterados

```text
supabase/functions/_shared/shopee.ts       — remover console.log do SIGN (1 linha)
supabase/functions/shopee-ads/index.ts     — chunks de 30d, reduzir strategies, ADS_LOOKBACK_DAYS=90
src/components/roas/AdsTab.tsx             — atualizar selectedDetail após refresh
```

