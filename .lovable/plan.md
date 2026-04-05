
## Diagnóstico completo

### O filtro de datas pode esconder dados?
**Sim, parcialmente.** O filtro padrão é "últimos 28 dias" (8 de março → 5 de abril). Os dados salvos vão de 7 de março a 3 de abril. Dois problemas:

1. **Campanhas com `daily_data` vazia** (que usaram `summary_metrics` como fallback) — quando o filtro de datas está ativo, o frontend recalcula TUDO a partir de `daily_data`. Se `daily_data` está vazia, as métricas viram zero e o item é removido da lista.

2. **Campo `orders` faltando no `daily_data`** — o backend salva `{date, impressions, clicks, expense, gmv, roas}` mas NÃO salva `orders`. Quando o filtro recalcula, `orders` fica sempre 0.

### Outros problemas encontrados

3. **Cache não recarrega após importação** — Quando o job termina como "done", `invalidatePersistedAds()` é chamada, mas o react-query pode não refazer a busca imediatamente se a aba estava em estado de loading/transição.

4. **Dados existem mas `effectiveApiData` pode ser null** — Se `buildApiAdsDataFromRows` retorna `null` (todos os itens filtrados), a UI mostra "Nenhum dado no período" mesmo com dados reais no banco.

## Plano de correção

### 1. Preservar métricas originais quando `daily_data` está vazia
Em `buildApiAdsDataFromRows`, se um item tem `daily_data` vazia ou ausente, **não recalcular** — manter as métricas salvas no nível da row (`r.impressions, r.expense, r.gmv`).

### 2. Incluir `orders` no `daily_data` do backend
Em `processCampaignEntries`, adicionar `orders` ao objeto `daily`:
```
daily.push({
  date, impressions, clicks, expense, gmv, roas,
  orders: e.orders  // ← campo faltando
});
```

### 3. Forçar refetch após job "done"
No `useEffect` que detecta `importJob.status === 'done'`, adicionar um pequeno delay antes de invalidar para garantir que o banco já processou o upsert.

### 4. Remover filtro padrão restritivo
Inicializar `dateFrom` e `dateTo` como `undefined` (sem filtro) quando não há dados ainda. Após carregar dados, usar o período real dos dados como range padrão.

## Arquivos modificados
- `src/hooks/useApiAdsData.ts` — preservar métricas quando daily_data vazia
- `supabase/functions/shopee-ads/index.ts` — incluir `orders` no daily_data
- `src/components/roas/AdsTab.tsx` — inicialização do filtro + refetch robusto
