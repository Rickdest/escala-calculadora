

## Plano: Corrigir merge CSV orgânico + API Ads na Performance

### Problema raiz
O upsert usa a chave `store_id,item_id,period_start,period_end`. Os dados da API Ads têm período diferente do Excel (ex: API = `2026-02-23 a 2026-03-23`, Excel = `2026-03-06 a 2026-04-04`). Como os períodos não batem, o upsert cria linhas novas em vez de atualizar as existentes. Os dados nunca se complementam.

### Solução
Mudar a estratégia de merge no `importExcel()`:

1. Para cada produto do Excel, verificar se já existe um registro `ads_api` na `product_performance` com o mesmo `item_id` e `store_id` (ignorando período)
2. Se existir: fazer UPDATE no registro existente, preenchendo os campos orgânicos e atualizando período/source para `'excel'`
3. Se não existir: fazer INSERT normal (produto sem Ads)
4. Produtos que só têm Ads (não aparecem no Excel) permanecem intactos

### Mudanças

#### `src/hooks/useProductPerformance.ts` — `importExcel()`

Substituir a lógica de upsert por:
1. Buscar todos os registros existentes de `product_performance` da loja atual
2. Para cada produto do Excel:
   - Se tem registro existente (mesmo `item_id`): usar `.update()` com os campos orgânicos + ads do `adsMap` + `source: 'excel'`
   - Se não tem: usar `.insert()` com todos os campos
3. Isso garante que o registro da API seja enriquecido em vez de duplicado

O `importFromAdsApi()` também precisa de ajuste simétrico:
- Antes de inserir, verificar se já existe registro `excel` para o mesmo `item_id`
- Se existir: atualizar apenas os campos `ads_*` sem sobrescrever orgânicos

### Arquivos modificados
- `src/hooks/useProductPerformance.ts` — lógica de merge bidirecional

