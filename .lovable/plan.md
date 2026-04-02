

## Correção: Mapeamento de campos e reordenação de estratégias no Step 4

### Problema

1. **Campos errados no `processCampaignEntries`**: A API retorna `broad_gmv` para GMV e `broad_roi` para ROAS, mas o código lê `broad_order_amount` primeiro (que é valor total de pedidos, não GMV). Resultado: métricas incorretas nos cards individuais.

2. **Ordem das estratégias desperdiça chamadas**: S1-POST-singular e S3-POST-list nunca funcionam e consomem rate limit antes de chegar à S4-GET-list que é a que retorna dados.

### Correções

#### 1. `processCampaignEntries` — corrigir ordem de leitura dos campos (linha 406-413)

```typescript
// GMV: broad_gmv primeiro, broad_order_amount como fallback
const gm = Number(e.broad_gmv || e.broad_order_amount || e.gmv || 0);
// Direct GMV: direct_gmv primeiro
const dgm = Number(e.direct_gmv || e.direct_order_amount || 0);
// Pedidos: broad_order primeiro (campo real da API)
const ord = Number(e.broad_order || e.broad_order_num || e.orders || 0);
const dord = Number(e.direct_order || e.direct_order_num || e.direct_orders || 0);
```

Também capturar `broad_roi` da API quando disponível e usar no cálculo de ROAS do card (linhas 437-438):
```typescript
// Se a API fornece broad_roi, usar diretamente
const apiRoas = Number(e.broad_roi || 0);
// Acumular para usar como fallback se calculado dá zero
```

#### 2. `extractCampaignSummaryMetrics` — mesma correção de prioridade (linha 66-68)

```typescript
// GMV: broad_gmv antes de broad_order_amount
const gmv = toFiniteNumber(perf?.broad_gmv, perf?.broad_order_amount, ...);
const directGmv = toFiniteNumber(perf?.direct_gmv, perf?.direct_order_amount, ...);
const orders = toFiniteNumber(perf?.broad_order, perf?.broad_order_num, ...);
```

#### 3. `fetchCampaignDaily` — reordenar estratégias (linhas 187-227)

Remover S1-POST-singular e S3-POST-list. Nova ordem:
1. **S1-GET-list** (antigo S4) — a que funciona
2. **S2-GET-singular** (antigo S2) — fallback
3. **S3-GMS** (antigo S5) — fallback final

Isso reduz de 5 para 3 tentativas, cortando ~40% das chamadas e evitando rate limit.

#### 4. Step 3 `dailyEntries` — mesma correção de campos (linhas 310-314)

```typescript
gmv: Number(e.broad_gmv || e.broad_order_amount || e.gmv || 0),
orders: Number(e.broad_order || e.broad_order_num || e.orders || 0),
```

### Arquivos alterados

```text
supabase/functions/shopee-ads/index.ts
  - processCampaignEntries: reordenar broad_gmv antes de broad_order_amount
  - extractCampaignSummaryMetrics: mesma reordenação
  - fetchCampaignDaily: remover POST strategies, GET-list primeiro
  - Step 3 dailyEntries: reordenar campos
```

