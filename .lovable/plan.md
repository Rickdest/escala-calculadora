

## Plano: Corrigir importação dos 3 arquivos na aba Ads

### Problema

1. **Product Ads CSV**: Quando importado pelo botão "Importar CSV de Operações" (o único botão CSV visível no detalhe), é rejeitado com "Este CSV não é um log de operações válido" — porque `handleImportLog` só aceita `type === 'operation_log'`.

2. **Operation Log CSV**: Funciona no parser, mas o botão pode confundir o usuário.

3. **Excel parentskudetail**: `handleExcelUpload` usa `parseShopeeExcel` que espera formato diário. O parentskudetail não tem coluna "Data", então lança "Cabeçalhos de dados diários não encontrados".

### Mudanças

#### `src/components/roas/AdsDetailFullView.tsx`

**1. `handleImportLog` → handler unificado de CSV**

Quando `detectAndParseCSV` retorna `type === 'performance'`, em vez de mostrar erro, salvar os dados de posição/métricas no `product_ads_metrics` (posição média, impressões, etc.) e mostrar toast de sucesso. Reutilizar a lógica de upsert que já existe.

Fluxo:
- Se `type === 'operation_log'` → salvar log (como hoje)
- Se `type === 'performance'` → extrair `avgPosition`, métricas, salvar no `product_ads_metrics` com upsert
- Se `type === 'unknown'` → toast de erro

**2. `handleExcelUpload` → fallback para parentskudetail**

Envolver `parseShopeeExcel` em try/catch. Se falhar, tentar `parseProductPerformanceExcel` como fallback. Se o segundo parser funcionar, converter os dados para um formato resumido (sem breakdown diário) e salvar no banco. Toast informando que os dados são agregados.

**3. Renomear label do botão CSV**

Mudar de "Importar CSV de Operações" para "Importar CSV" com helper text: "Aceita relatório de produto ou log de operações"

**4. Adicionar import do parser de fallback**

Importar `parseProductPerformanceExcel` no componente.

### Arquivos modificados
- `src/components/roas/AdsDetailFullView.tsx` — handler CSV unificado + fallback Excel

