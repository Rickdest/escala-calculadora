

## Plano: Reduzir verbosidade de logs, expandir janela e pular campanhas antigas

### Problema

Os 8 `console.log` em `generateSign` (linhas 55-61 e 79 de `_shared/shopee.ts`) consomem ~8 linhas por chamada de API. Com ~35 campanhas x ~5 estratégias = ~175 chamadas, gera ~1400 linhas de log SIGN que estouram o buffer do Supabase e escondem os `[DEBUG]` importantes.

### Mudanças

#### 1. `_shared/shopee.ts` — Reduzir logs do SIGN (linhas 55-61)

Remover as 7 linhas de log individuais (PARTNER_ID, path, timestamp, accessToken, shopId, baseString, key length). Manter apenas a linha final `console.log('[SHOPEE SIGN] sign:', hex)` na linha 79.

#### 2. `shopee-ads/index.ts` linha 23 — Expandir janela para 365 dias

```
const ADS_LOOKBACK_DAYS = 365;
```

#### 3. `shopee-ads/index.ts` — Pular campanhas ended antigas no Step 4

No filtro `campaignsForStep4` (linha 341-344), adicionar condição: se `status === "ended"` e `campaign_id < 50000000`, excluir (não fazer request). Logar quantas foram puladas.

```typescript
const campaignsForStep4 = campaignDetails.filter(c => {
  if (filterItemId && c.item_id !== filterItemId) return false;
  if (!c.item_id) return false;
  if (c.status === "ended" && c.campaign_id < 50000000) return false;
  return true;
});
const skippedOld = campaignDetails.filter(c => c.status === "ended" && c.campaign_id < 50000000).length;
if (skippedOld > 0) console.log(`[SHOPEE ADS] Skipped ${skippedOld} old ended campaigns (id < 50M)`);
```

### Arquivos

```text
supabase/functions/_shared/shopee.ts       — remover 7 linhas de log verbose
supabase/functions/shopee-ads/index.ts     — ADS_LOOKBACK_DAYS=365, filtro campanhas antigas
```

