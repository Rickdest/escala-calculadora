

## Plano: Corrigir erros da API de Ads (3 bugs nos logs)

### Diagnóstico dos logs

Os logs confirmam que a função está rodando e encontrou **35 campanhas**, mas falha nos passos seguintes:

1. **Step 2** (`get_product_level_campaign_setting_info`): erro `"Wrong parameters. info_type_list: InfoTypeList is required;"` — falta o parâmetro obrigatório `info_type_list`
2. **Step 3** (`get_all_cpc_ads_daily_performance`): erro `"Date range can't be longer than 1 month."` — o intervalo 03-03-2026 → 02-04-2026 cruza 2 meses calendário, a API rejeita
3. **Resultado**: 35 campaigns, 0 details, 0 entries, 0 products

### Correções em `supabase/functions/shopee-ads/index.ts`

**Fix 1 — Step 2**: Adicionar `info_type_list` ao request de `get_product_level_campaign_setting_info`. Valor: `"1"` (basic campaign info — inclui item_id, status, título).

```typescript
// De:
{ campaign_id_list: batch.join(",") }
// Para:
{ campaign_id_list: batch.join(","), info_type_list: "1" }
```

**Fix 2 — Step 3**: Reduzir intervalo de 30 para 28 dias (garante nunca cruzar 2 meses):

```typescript
// De:
const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
// Para:
const twentyEightDaysAgo = now - 28 * 24 * 60 * 60;
```

**Fix 3 — Extrair item_id dos campaign_details**: Como o Step 2 agora vai retornar dados, usar os `campaign_details` para enriquecer os entries (associar campaign_id → item_id). Os entries do daily performance podem não ter `item_id` diretamente — precisamos cruzar com os detalhes da campanha.

### Sem alteração no frontend

O frontend (`AdsTab.tsx`) já está correto — ele chama `syncAdsOnly()` e processa `ads_by_product`. O problema é puramente backend.

### Detalhes técnicos

```text
Fluxo corrigido:
  Step 1: get_product_level_campaign_id_list → 35 IDs ✓ (já funciona)
  Step 2: get_product_level_campaign_setting_info + info_type_list=1 → detalhes com item_id
  Step 3: get_all_cpc_ads_daily_performance (28 dias) → entries com métricas
  Step 4: get_total_balance → saldo ✓ (já funciona)
  
  Cruzamento: campaign_id dos entries → item_id dos details → aggregação por produto
```

