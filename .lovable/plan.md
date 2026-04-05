

## Plano: Corrigir importação de CSV na aba Ads

### Problemas identificados

1. **Falha silenciosa quando `currentStore` é null**: Em `importGeneralCSV`, a linha `if (!user || !currentStore) return;` faz a função retornar sem nenhum feedback. Se o contexto da loja não carregou ou o usuário não tem loja, o import simplesmente não acontece — sem erro, sem toast.

2. **Multi-line quoted fields não tratados no parser geral**: O `parseGeneralFormatCSV` faz `csvContent.split('\n')` direto, sem usar `mergeMultiLineQuotedFields`. Se algum nome de produto no CSV tiver quebra de linha dentro de aspas, as linhas ficam partidas e são descartadas (check `cols.length < 20`).

3. **Lock não liberado em early returns**: Dentro do `try` block, o `return` nas linhas 195-197 (CSV inválido) não chama `releaseLock()` explicitamente — depende do `finally`. Porém o `finally` existe, então isso funciona. Mas a combinação de erros silenciosos + lock travado pode causar "Operação em andamento" em tentativas subsequentes se houver um bug no fluxo.

### Mudanças

#### `src/hooks/useAdsData.ts`

**importGeneralCSV:**
- Adicionar toast de erro quando `!currentStore`: `toast.error('Selecione uma loja primeiro')` + return
- Usar `mergeMultiLineQuotedFields` no `parseGeneralFormatCSV` (no parser)

**importProductCSV:**
- Adicionar toast de erro quando `!user`: `toast.error('Faça login para importar')`

#### `src/lib/shopeeAdsParser.ts`

**parseGeneralFormatCSV:**
- Aplicar `mergeMultiLineQuotedFields` nas linhas do CSV antes de processar, igual já é feito no `parseOperationLogCSV`

### Arquivos modificados
- `src/hooks/useAdsData.ts` — feedback de erro para guards silenciosos
- `src/lib/shopeeAdsParser.ts` — merge de campos multi-linha no parser geral

