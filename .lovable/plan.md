

## Problemas Encontrados na Analise de Produto (AdsDetailView)

### Diagnostico

Analisei o codigo, os dados do banco e os logs do console. Encontrei 4 problemas:

**1. `roas_direto` = 0 quebra a logica de classificacao**
Na DB, os rows do "Cropped Corset" tem `roas_direto: 0.00`. No codigo, `row.roas_direto || row.roas` retorna `row.roas` (10.49) — isso funciona para display. Mas no `importProductCSV` (useAdsData.ts), novos inserts salvam `roas_direto: 0` sem calcular `roas_empate` nem `classificacao`. Resultado: o card aparece como "Nao vinculado" mesmo com produto vinculado, e o detalhe nao mostra status.

**2. `importProductCSV` nao calcula metricas derivadas**
Quando importa CSV individual, o codigo insere na DB sem calcular `roas_empate`, `margem_contribuicao`, `classificacao` — diferente do `importGeneralCSV` que faz esse calculo. O enrichment no `fetchData` corrige isso no front, mas so se `products` ja carregou — race condition.

**3. Duplicatas: cada import cria um novo row**
A cada click em "Importar CSV do Produto", um novo row e criado sem deduplicar por `product_id` + periodo. O usuario ja tem 3 rows identicos para o mesmo produto.

**4. Warning de forwardRef no console**
`ByProductContent` e usado como children de `TabsContent` (Radix) que tenta passar ref, mas e um function component sem forwardRef.

### Plano de Correcao

#### Arquivo: `src/hooks/useAdsData.ts`

**Fix importProductCSV** (linhas ~130-170):
- Antes de inserir, verificar se ja existe um row com mesmo `product_id` + periodo. Se existir, fazer `update` em vez de `insert`.
- Calcular `roas_empate`, `margem_contribuicao`, `classificacao` quando o produto esta vinculado (mesmo padrao do `importGeneralCSV`).

**Fix fetchData enrichment** — adicionar fallback: se `products` esta vazio mas `row.roas_empate` ja existe no DB, usar o valor do DB para classificacao no front.

#### Arquivo: `src/components/roas/AdsTab.tsx`

**Fix forwardRef** — Wrap `ByProductContent` com `React.forwardRef` para eliminar o warning do console.

#### Arquivo: `src/components/roas/AdsDetailView.tsx`

**Fix dead code** — Remover o bloco "Lucro/und legacy" (linhas 514-530) que nunca renderiza e contem acesso a `empateResult!` que seria null.

### Nao altera
- Logica de calculo em `adsLogic.ts`
- Design/layout dos componentes
- Nenhum componente externo

