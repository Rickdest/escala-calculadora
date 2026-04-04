

## Plano: "Atualizar Dados" só do produto + buscar posição

### Problemas atuais

1. **Step 5 (avg_position) ignora filterItemId**: quando clica "Atualizar Dados" de um produto específico, o Step 5 busca posição de TODAS as campanhas ativas em vez de só do item clicado
2. **Step 5 só roda para campanhas `active`**: campanhas `ended` nunca recebem posição, mesmo que tenham dados recentes
3. **Step 6 (keywords) também ignora filterItemId**: busca keywords de todos os itens ativos

### Correções no `shopee-ads/index.ts`

#### Step 5 — filtrar por itemId e incluir campanhas com dados
- Quando `filterItemId` está definido, filtrar `activeCampaignsWithData` para incluir apenas campanhas daquele item
- Relaxar o filtro: incluir campanhas com `expense > 0` (não só `active`), para que ended recentes também recebam posição
- Isso garante que ao clicar "Atualizar Dados", só busca a posição daquele produto

#### Step 6 — keywords só do item filtrado
- Quando `filterItemId` está definido, filtrar `activeCampaignsForKw` para apenas aquele item
- Pular chamadas de shop-level (hourly_performance, recommended_items, shop_toggles) quando é refresh individual — são irrelevantes e gastam quota da API

### Arquivo modificado
```
supabase/functions/shopee-ads/index.ts
```

### Resultado
"Atualizar Dados" no detalhe do produto busca apenas as campanhas, posição e keywords daquele item — mais rápido, sem gastar quota, e a posição passa a aparecer se a API retornar.

