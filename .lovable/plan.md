

## Plano: Corrigir importação de CSV/Excel na aba Ads para campanhas da API

### Problema raiz

Quando os dados vêm da API (prefixo `api-campaign-`), três importações falham:

1. **CSV do Produto (posição)**: Bloqueado explicitamente no `AdsTab.tsx` pelo guard `if (!selectedDetail.id.startsWith('api-campaign-'))` — o botão não faz nada.

2. **CSV de Operações**: O `OperationLogTimeline` tenta `UPDATE product_ads_metrics` usando `product_id` ou `shopee_product_id`, mas não existe linha nessa tabela para campanhas da API. O update afeta 0 rows — falha silenciosa.

3. **Excel (.xlsx)**: Mesmo problema — `handleExcelUpload` faz `UPDATE product_ads_metrics` sem linha correspondente.

### Mudanças

#### 1. `src/components/roas/AdsTab.tsx` — Permitir import de CSV para campanhas API

Remover o guard `api-campaign-` nas funções `onImportPosition`, `onReimport`, `onLink`, `onQuickRegister`, `onUnlink`, `onChangeLink`. Para campanhas API, o fluxo de posição precisa:
- Criar uma entrada temporária em `ads_data` a partir dos dados da API antes de importar o CSV
- Ou usar `importProductCSV` diretamente sem `targetAdsDataId`, deixando o parser encontrar por `shopee_product_id`

A abordagem mais simples: para campanhas API, chamar `importProductCSV(text)` sem target ID, permitindo que o sistema crie/atualize o registro automaticamente.

#### 2. `src/components/roas/AdsDetailFullView.tsx` — Upsert em vez de Update

Nas funções `handleExcelUpload` e `handleImportLog` do `OperationLogTimeline`:
- Trocar `.update()` por `.upsert()` com a chave `user_id + shopee_product_id`
- Isso garante que se não existir linha em `product_ads_metrics`, ela será criada automaticamente

Detalhes:
- `handleImportLog`: Se não existe row em `product_ads_metrics`, fazer `INSERT` com os campos `user_id`, `shopee_product_id`, `product_id`, `operation_log`
- `handleExcelUpload`: Se o `UPDATE` retorna 0 rows afetadas, fazer `INSERT` com `user_id`, `shopee_product_id`, `product_id`, `excel_daily_data`, `excel_summary`

#### 3. Verificar schema `product_ads_metrics`

Confirmar que a tabela aceita `INSERT` sem campos obrigatórios faltando (verificar constraints).

### Arquivos modificados
- `src/components/roas/AdsTab.tsx` — remover guards `api-campaign-` para imports
- `src/components/roas/AdsDetailFullView.tsx` — upsert em `OperationLogTimeline` e `handleExcelUpload`

