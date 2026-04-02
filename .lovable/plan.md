

## Plano: Deduplicar campanhas, persistir dados, corrigir refresh individual

### Diagnóstico dos logs

**API está funcionando** — os dados gerais estão chegando corretamente (28 dias, ROAS 10.07, R$23.244 GMV). Os problemas são no frontend e na persistência:

1. **Campanhas duplicadas**: React warning "two children with same key `67478404`". O upsert no DB usa chave `(user_id, campaign_id, period_start)` — se o período muda entre imports, cria linhas duplicadas para o mesmo campaign_id. O `buildApiAdsDataFromRows` não deduplica.

2. **Dados não persistem**: `useApiAdsData` carrega do DB mas `buildApiAdsDataFromRows` não deduplica por campaign_id, gerando cards repetidos e potencialmente sobrescrevendo o summary.

3. **Refresh individual falha**: O request com `item_id: 58255919585` retorna `ads_by_campaign: []` porque nenhuma campanha no Step 4 gerou entries. Isso acontece porque `get_product_campaign_daily_performance` pode exigir `campaign_id_list` (array) em vez de `campaign_id` (singular). Além disso, quando o refresh retorna vazio mas os dados gerais existem, o toast mostra "nenhum dado" incorretamente.

### Correções

#### 1. `src/hooks/useApiAdsData.ts` — Deduplicar por campaign_id

Em `buildApiAdsDataFromRows`, antes de construir o resultado, deduplicar rows por `campaign_id`, mantendo apenas a row com `updated_at` mais recente:

```typescript
// Deduplicate by campaign_id, keep most recent
const deduped = new Map<string, any>();
for (const r of rows) {
  const key = String(r.campaign_id);
  const existing = deduped.get(key);
  if (!existing || r.updated_at > existing.updated_at) {
    deduped.set(key, r);
  }
}
const uniqueRows = Array.from(deduped.values());
// Use uniqueRows instead of rows for all calculations
```

#### 2. `shopee-ads/index.ts` — Limpar dados antigos antes do upsert

Antes de fazer upsert das campanhas, deletar registros antigos do mesmo user_id que NÃO correspondem ao período atual. Isso evita acúmulo de períodos antigos:

```typescript
// Delete old period data for this user before upserting
await supabaseAdmin
  .from("shopee_ads_by_product")
  .delete()
  .eq("user_id", user.id)
  .neq("period_start", adsPerformance.period_start);
```

#### 3. `shopee-ads/index.ts` — Corrigir parâmetro Step 4

Testar com `campaign_id_list` como array em vez de `campaign_id` singular, pois a API pode exigir esse formato:

```typescript
// POST body
{ campaign_id_list: [campaignId], start_date: chunk.startAPI, end_date: chunk.endAPI }

// GET params  
{ campaign_id_list: String(campaignId), start_date: chunk.startAPI, end_date: chunk.endAPI }
```

Se falhar, fallback para formato singular.

#### 4. `AdsTab.tsx` — Melhorar feedback do refresh individual

Quando o refresh individual retorna `ads_by_campaign` vazio, verificar se há dados no summary antes de mostrar "nenhum dado". Também invalidar o cache do DB para recarregar dados persistidos.

### Arquivos alterados

```text
src/hooks/useApiAdsData.ts                — deduplicar por campaign_id
supabase/functions/shopee-ads/index.ts     — limpar períodos antigos, testar campaign_id_list
src/components/roas/AdsTab.tsx             — melhorar feedback do refresh
```

