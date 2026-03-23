

## Diagnóstico e Correções — Aba Análise de Ads

### Problemas Encontrados

Analisando o banco de dados, o código e os logs do console, encontrei **7 problemas concretos**:

**1. Duplicatas massivas** — O "Cropped Corset" tem 3 rows idênticos (ids `7df7cb3e`, `057fac85`, `85eb82e4`) com mesmo `nome_produto_csv`, período e dados. O `importProductCSV` com `targetAdsDataId` cria dedup por `nome_produto_csv + periodo`, mas quando chamado sem target, a dedup falha se o produto já tem `posicao_importada: true` (os rows existentes vieram de product CSV, não do general). Além disso, o `importGeneralCSV` deleta apenas rows com `posicao_importada: false`, então rows importados via product CSV nunca são limpos.

**2. `roas_direto = 0` e `roas_empate = null`** — Todos os 5 rows têm `roas_direto: 0.00` e `gmv_direto: 0.00`. O parser de product CSV (`parseProductFormatCSV`) seta `directRoas: 0` e nunca extrai `directRevenue`. No general CSV, o fallback `gmv_direto: (m as any).directGmv || (m as any).directRevenue || m.gmv` deveria funcionar, mas os rows atuais vieram do product CSV que não calcula esses campos. Resultado: sem `roas_direto` real, a classificação não funciona e o enrichment falha.

**3. `classificacao = null` em 4 de 5 rows** — Porque `roas_empate` é null. O `importProductCSV` calcula `calcDerived()` que chama `calcularRoasEmpate`, mas o resultado não é salvo quando o product tem `costPrice: 0` (produto id `6df24a20` tem `cost_price: 0`, `sale_price: 0`). Para o "Cropped Corset" (product `ec2e92df`), o produto existe mas os rows importados via product CSV não rodaram `calcDerived` corretamente.

**4. `nome_produto_csv` vazio** — Rows `a749d5d1` e `c4522bfb` têm `nome_produto_csv: ""`. Isso vem do parser quando o campo "Nome do Produto" está em branco no CSV do produto.

**5. `posicao_media = null` mesmo com `posicao_importada = true`** — Todos os rows com `posicao_importada: true` têm `posicao_media: null`. O parser extrai `avgPosition` mas o CSV provavelmente não tem coluna de posição, retornando `null`. O flag `posicao_importada` deveria só ser `true` se `posicao_media` realmente existe.

**6. Botão "Vincular" não aparece** — No card state 1 (unlinked), o botão existe e funciona. Mas como os rows duplicados do Cropped Corset têm `product_id` preenchido, eles aparecem como state 2/3 onde não há botão de vincular. O problema real é que todos os rows aparecem como "vinculados" quando na verdade a classificação está quebrada, dando a impressão de que não funciona.

**7. forwardRef warning** — `Stat` component no `AdsDetailView` é function component sem forwardRef, mas é usado num contexto onde Radix tenta passar ref.

### Plano de Correções

#### Arquivo 1: `src/hooks/useAdsData.ts`

**Fix importGeneralCSV:**
- Antes de inserir, deletar TODOS os rows antigos do usuário que não têm posição real (`posicao_media IS NULL`), não apenas `posicao_importada = false`
- Adicionar deduplicação por `shopee_product_id` ou `nome_produto_csv` nos rows parseados antes de inserir (o parser já agrega, mas o import não verifica duplicatas)

**Fix importProductCSV:**
- Quando `targetAdsDataId` é fornecido: só setar `posicao_importada = true` se `avgPos !== null`
- Quando sem target: buscar duplicata por `nome_produto_csv + periodo` E `shopee_product_id + periodo`, ignorando `posicao_importada`
- Sempre calcular `roas_empate` e `classificacao` via `calcDerived`, usando `roas` como fallback quando `roas_direto = 0`

**Fix fetchData enrichment:**
- Na classificação, quando `row.roas_direto === 0`, usar `row.roas` como o valor para classificar (já faz `row.roas_direto || row.roas` mas precisa garantir que isso propague pro `classificacaoResult`)

**Fix importProductCSV — gmv_direto:**
- No `rowData`, usar `m.gmv` como fallback para `gmv_direto` quando `directGmv` é 0 (o product CSV não tem esse campo separado)

#### Arquivo 2: `src/lib/shopeeAdsParser.ts`

**Fix parseProductFormatCSV:**
- Extrair `directRevenue` e `directItemsSold` das colunas corretas quando disponíveis
- Se não disponíveis, usar `gmv` e `itemsSold` como fallback (product CSV geralmente representa vendas diretas)
- Garantir que `shopeeProductName` nunca seja string vazia — se o metadata não tiver nome, usar `"Produto " + productId`

#### Arquivo 3: `src/components/roas/AdsDetailView.tsx`

**Fix forwardRef warning:**
- Não é o `Stat` que precisa de forwardRef — o warning acontece porque `AdsDetailView` é renderizado dentro de `TabsContent` do Radix. Mas na verdade, `AdsTab` que é filho de `TabsContent`, não `AdsDetailView`. O `Stat` function component recebe ref implicitamente do Radix tooltip? Não — o stack trace mostra que é o `Stat` dentro de `AdsDetailView`. Como `Stat` não precisa de ref, basta não renderizá-lo com um component que passe ref. Na verdade o warning é inofensivo mas pode ser corrigido removendo a possibilidade de ref leak.

#### Arquivo 4: `src/components/roas/AdsProductCard.tsx`

**Fix card display:**
- Quando `classificacao` é null mas `product_id` existe, mostrar badge "Classificação pendente" em vez de "Não vinculado"
- Mostrar ROAS (geral, não direto) quando `roas_direto` é 0 como valor principal

#### Arquivo 5: `src/components/roas/AdsTab.tsx`

**Melhorias de layout desktop:**
- Import button: reduzir padding no desktop, tornar mais compacto
- Cards grid: garantir `md:grid-cols-2` funciona com gap adequado
- AlertsSection sidebar: sticky no desktop para acompanhar scroll

**Fix CSV detection:**
- Melhorar heurística de detecção: checar por `Nome do Produto` nos primeiros 10 linhas (metadata do product CSV) além dos headers existentes

### Não altera
- Lógica de cálculo em `adsLogic.ts` (funções já estão corretas)
- Design system / tokens CSS
- QuickRegisterModal, AdsLinkModal, FilterChips, SummaryCards (funcionam corretamente)
- Nenhuma funcionalidade removida

