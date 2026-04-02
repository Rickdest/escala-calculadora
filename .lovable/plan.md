

## Correção: Formato de data errado nas chamadas da API Shopee

### Bug raiz

Linhas 261-262 de `shopee-ads/index.ts`:
```typescript
const startDate = toDateStrBR(startBR);   // "01-01-2026" ← DD-MM-YYYY, errado
const endDate = toDateStrBR(yesterdayBR);  // "31-03-2026" ← DD-MM-YYYY, errado
```

A Shopee API exige `YYYY-MM-DD`. A função `toISODateBR` já existe no código e retorna o formato correto.

### Correção

Trocar `toDateStrBR` por `toISODateBR` nas linhas 261-262:
```typescript
const startDate = toISODateBR(startBR);   // "2026-01-01" ← correto
const endDate = toISODateBR(yesterdayBR);  // "2026-03-31" ← correto
```

**Impacto**: Step 3 (daily shop-level) e Step 4 (per-campaign) vão receber datas válidas e retornar dados reais. Todos os cards de métricas (ROAS, gasto, receita, CTR) vão popular corretamente.

### Arquivos

- `supabase/functions/shopee-ads/index.ts` — 2 linhas alteradas + redeploy da edge function

