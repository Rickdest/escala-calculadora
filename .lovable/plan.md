

## Diagnóstico: por que 35 campanhas mas 0 produtos

Analisei os logs da API Shopee e encontrei **2 bugs no parsing da resposta**:

### Bug 1 — `response` é um array, não um objeto

A API `get_all_cpc_ads_daily_performance` retorna:
```json
{"response": [{"date":"10-03-2026","impression":2305,"clicks":46,...}, ...]}
```

O código atual tenta ler `result.response.entry_list` e `result.response.data`, que são `undefined` porque `response` já É o array. Resultado: `allEntries = []` (fallback para array vazio).

### Bug 2 — dados são agregados por dia (shop-level), sem `item_id`

Mesmo corrigindo o Bug 1, os entries são totais diários da loja inteira — não têm `item_id` nem `campaign_id`. O loop de agregação por produto descarta tudo.

**Dados reais nos logs**: há métricas reais (impressions: 2305, clicks: 46, gmv: 49.9, expense: 11.01 no dia 10-03-2026, e valores maiores nos dias seguintes). Os dados existem, só não estão sendo lidos.

### Plano de correção

**1. Corrigir parsing do response (shopee-ads/index.ts)**

```typescript
// De:
allEntries = result?.response?.entry_list || result?.response?.data || [];
// Para:
const resp = result?.response;
allEntries = Array.isArray(resp) ? resp : (resp?.entry_list || resp?.data || []);
```

**2. Mudar a estratégia de agregação**

Como `get_all_cpc_ads_daily_performance` retorna dados shop-level sem `item_id`, precisamos de uma abordagem diferente:

- Usar os dados diários como **totais da loja** (impressions, clicks, expense, gmv por dia)
- Para dados **por produto**, usar o mapa `campaignToItem` que já temos (35 campanhas com nomes e item_ids) e combinar com os totais diários
- Criar um registro "shop_total" com a soma dos 28 dias para que o frontend tenha dados para exibir
- Manter os campaign_details (nome do produto, item_id, status, budget) como informação complementar

**3. Estrutura do retorno atualizado**

```text
ads_performance:
  daily_totals: [...] ← array de {date, impressions, clicks, expense, gmv, orders}
  ads_by_product: [...] ← campanhas ativas com info do campaign_details  
  shop_summary: {impressions, clicks, expense, gmv, orders, roas, ctr} ← soma do período
  campaign_details: [...] ← detalhes das 35 campanhas (nome, item_id, status)
```

**4. Ajustar frontend (AdsTab.tsx)**

- Se `ads_by_product` estiver vazio mas `shop_summary` tiver métricas, exibir resumo da loja com toast de sucesso
- O toast "sem métricas de performance" só aparece quando `shop_summary` também estiver zerado

### Detalhes técnicos

```text
Arquivo: supabase/functions/shopee-ads/index.ts
  - Corrigir leitura: Array.isArray(result.response)
  - Agregar daily totals em shop_summary
  - Enriquecer campaigns com status/budget como "ads_by_product"

Arquivo: src/components/roas/AdsTab.tsx  
  - Aceitar shop_summary como dados válidos para exibição
  - Ajustar condição de "sem dados"
```

Sem mudanças de banco.

