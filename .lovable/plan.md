

## Plano: Corrigir importação dos 3 arquivos na aba Ads

### Diagnóstico (via session replay)

Os erros reais capturados foram:

1. **Product CSV** (`Product-Ad-Data...csv`) → Erro: **"Este CSV não é um log de operações válido"**
   - O usuário clicou no botão **"Importar CSV de Operações"** (dentro do `OperationLogTimeline`), mas o arquivo é um CSV de performance de produto. O handler `handleImportLog` detecta corretamente que o tipo é `performance` (não `operation_log`) e rejeita.
   - **Causa**: O botão correto ("Importar CSV do Produto") está em outro local da interface, e o componente não redireciona automaticamente.

2. **Excel** (`parentskudetail...xlsx`) → Erro: **"Cabeçalhos de dados diários não encontrados."**
   - O `handleExcelUpload` usa o parser `parseShopeeExcel` que espera o formato "Performance do Produto" (dados diários com coluna "Data"). O arquivo enviado é o formato **"parentskudetail"** (detalhamento por SKU/variação) — formato completamente diferente, com colunas `ID do Item | Produto | Status Atual do Item | ID da Variação...`
   - **Causa**: O parser Excel da aba Ads só aceita um formato, mas o usuário está subindo o outro formato que já é suportado em `parseProductPerformanceExcel.ts` (usado na aba Performance).

3. **Operation Log CSV** → Este arquivo provavelmente funciona se colocado no botão certo, mas o usuário pode estar confundindo os botões de upload.

### Mudanças

#### 1. `OperationLogTimeline` — aceitar CSV de produto automaticamente
**Arquivo:** `src/components/roas/AdsDetailFullView.tsx`

No `handleImportLog`, quando `detected.type === 'performance'`:
- Em vez de mostrar erro, disparar o fluxo de importação de posição automaticamente
- Chamar o `onImportPosition` callback com o conteúdo do CSV, ou salvar diretamente no `product_ads_metrics`
- Mostrar toast informativo: "CSV de produto detectado — dados de posição importados"

Alternativa mais simples: aceitar ambos os tipos no mesmo handler. Se o tipo detectado for `performance`, extrair os dados de posição/métricas e salvar no `product_ads_metrics` da mesma forma que `importProductCSV` faria.

#### 2. Excel parser — suportar formato "parentskudetail" 
**Arquivo:** `src/components/roas/AdsDetailFullView.tsx`

No `handleExcelUpload`, adicionar fallback:
- Se `parseShopeeExcel` falhar (throw), tentar `parseProductPerformanceExcel` 
- Se o segundo parser funcionar, converter os dados para o formato esperado pela UI (`ExcelPerformanceData`)
- Mapear os campos: `vendas_pago` → `vendasBrl`, `impressoes` → `impressoes`, `compradores_pagos` → `compradores`, etc.
- Criar `dadosDiarios` como um único ponto (totais do período) já que este formato não tem breakdown diário
- Persistir no banco normalmente

#### 3. Aceitar `.xlsx` no input do Excel (já funciona)
O input já tem `accept=".xlsx"` — isso está correto.

#### 4. Mudar `accept` do `OperationLogTimeline` para aceitar ambos
Alterar `accept=".csv"` para `accept=".csv,.xlsx"` não é necessário aqui (log de operações é sempre CSV). Mas garantir que o CSV de produto seja redirecionado automaticamente.

### Arquivos modificados
- `src/components/roas/AdsDetailFullView.tsx` — `handleImportLog` aceita CSV de produto + `handleExcelUpload` aceita parentskudetail

