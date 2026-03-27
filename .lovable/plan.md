
## Corrigir importação do CSV de Operation Log + garantir gráfico funcional

### Problemas identificados

1. **Security validation quebra em CSV com campos quoted multi-line**: O "Create Campaign" no CSV tem detalhes entre aspas com quebras de linha internas. A validação de segurança faz `line.split(',')` sem respeitar aspas — campos internos com vírgulas são tratados como campos separados, podendo falhar na checagem de `field.length > 500`.

2. **Parser não lida com campos multi-line**: `parseOperationLogCSV` faz `split('\n')` e processa linha a linha. O "Create Campaign" tem um campo com `\n` dentro de aspas — isso quebra a linha em múltiplas, e o parser não reconhece como uma entrada válida.

3. **Sem botão de importação do log na tela de detalhe de Ads**: O `OperationLogTimeline` mostra "Importe o log de operações" mas não tem botão de importação. O usuário precisa ir até o produto para importar.

### Correções

**1. `src/lib/shopeeAdsParser.ts` — Security validation e parser**

- `validateCSVSecurity`: substituir o loop naive `line.split(',')` por um check que respeita campos entre aspas, ou simplesmente remover a checagem de campo individual e manter apenas o check de tamanho total do arquivo (5MB) e extensão — que já são suficientes.

- `parseOperationLogCSV`: reescrever para lidar com campos quoted multi-line. Antes de fazer `split('\n')`, pré-processar o conteúdo para juntar linhas que estão dentro de aspas abertas. Isso garante que "Create Campaign" com detalhes multi-line vire uma única linha lógica.

**2. `src/components/roas/AdsDetailFullView.tsx` — Botão de importação no timeline**

- Adicionar um `<input type="file" ref>` e botão "Importar Log" no empty state do `OperationLogTimeline`
- Ao selecionar arquivo, usar `detectAndParseCSV`, validar, e salvar no `product_ads_metrics.operation_log` via `product_id` do ad
- Após salvar, recarregar o log

**3. `src/components/roas/AdsDetailFullView.tsx` — Busca do log também por `shopee_product_id`**

- O `OperationLogTimeline` busca por `product_id`, mas o operation log pode estar vinculado via `shopee_product_id` (que vem do CSV). Adicionar fallback de busca.

### Arquivos modificados
1. `src/lib/shopeeAdsParser.ts` — fix security validation + multi-line CSV handling
2. `src/components/roas/AdsDetailFullView.tsx` — botão import no timeline + busca por shopee_product_id
