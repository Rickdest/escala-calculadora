

## Plano: Corrigir importação dos 3 arquivos na aba Ads

### Bugs encontrados

**1. CSV de Posicionamento (Product-Ad-Data) — "importa mas não atualiza"**

O parser `parseProductFormatCSV` funciona e extrai os dados corretamente. O problema está no `upsertMetrics`: quando o produto vem da API, `ad.product_id` pode ser `null` (não tem vínculo com tabela `products`). O `UPDATE` não encontra nenhuma row e o `INSERT` cria uma row nova com `period_start: today` — desconectada dos dados existentes. Resultado: dados salvos mas nunca carregados de volta na UI.

**Correção**: No `upsertMetrics`, quando ambos `product_id` e `shopee_product_id` estão presentes, priorizar busca por `shopee_product_id`. Após o INSERT, forçar reload dos dados na UI.

**2. CSV de Operações (Operation-Log) — timestamps não reconhecidos**

O parser `parseOperationLogCSV` (linha 653) valida timestamps com regex `!/^\d{4}-\d{2}-\d{2}/`. Mas os timestamps reais do CSV da Shopee são no formato `Fri Apr 03 2026 13:40:54 GMT+0000 (Coordinated Universal Time)` — formato JavaScript Date string, NÃO ISO. Resultado: zero entradas parseadas, log sempre vazio.

**Correção**: Adicionar conversão de `new Date(rawTimestamp).toISOString()` antes da validação. Aceitar tanto ISO quanto formato Date string.

**3. Excel (parentskudetail) — sheet name errado + dados incompletos**

O `parseProductPerformanceExcel` espera a aba `'Produtos com Melhor Desempenho'` (hardcoded). O parentskudetail provavelmente tem outro nome de aba. Depois, o fallback no `handleExcelUpload` agrega TODOS os produtos em um único ponto de dados, perdendo o detalhamento por produto.

**Correção**: No parser, se a aba nomeada não existir, usar a primeira aba do workbook. No fallback do Excel handler, preservar dados por produto em vez de agregar tudo.

### Arquivos modificados

#### `src/lib/shopeeAdsParser.ts`
- Na função `parseOperationLogCSV`, converter timestamps tipo `Fri Apr 03 2026...` para ISO usando `new Date(rawTimestamp)` antes da regex check

#### `src/lib/parsers/parseProductPerformanceExcel.ts`
- Se aba `'Produtos com Melhor Desempenho'` não existir, usar a primeira aba disponível

#### `src/components/roas/AdsDetailFullView.tsx`
- `upsertMetrics`: melhorar lógica de busca para usar `shopee_product_id` quando `product_id` não encontra resultados
- `handleExcelUpload` fallback: preservar dados individuais por produto no `dadosDiarios` em vez de agregar tudo em um ponto

