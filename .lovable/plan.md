

## Auditoria: Cálculos, Taxas e Bugs

Analisei todos os arquivos de cálculo do projeto. Aqui estão os problemas encontrados:

---

### BUG 1 — ROAS Empate na QuickCalculator está ERRADO

**Arquivo:** `src/components/home/QuickCalculator.tsx` (linha 54)

A fórmula usada é:
```
roasEmpate = sp / (sp - totalCosts)
```
Isso calcula `preço / lucro`, que é o inverso do correto.

Na `RoasAnalysis.tsx`, a fórmula correta é:
```
roasEmpate = precoVenda / lucroBruto
```
Onde `lucroBruto = valorRecebido - custoP` (preço menos taxa Shopee menos custo).

O problema: **a QuickCalculator inclui TODOS os custos** (embalagem, impostos, afiliados, campanhas, acelera) no denominador, enquanto o `calcRoasFromValues` do ROAS só subtrai taxa Shopee e custo do produto. São fórmulas diferentes para a mesma métrica — o ROAS Empate mostrado na Home será diferente do mostrado na aba ROAS para o mesmo produto.

**Correção:** Unificar a fórmula. O cálculo correto de ROAS Empate deve considerar o lucro bruto = preço venda - taxa Shopee - custo produto (sem embalagem/impostos no denominador do ROAS).

---

### BUG 2 — `calcRoasFromValues` NÃO considera custos globais

**Arquivo:** `src/components/charts/RoasAnalysis.tsx` (linha 40-53)

A função `calcRoasFromValues` calcula lucro bruto como:
```
lucroBruto = valorRecebido - custoP
```
Onde `valorRecebido = precoVenda - taxaShopee`.

Mas ignora completamente: impostos, embalagem, afiliados, campanhas, Shopee Acelera e adicional CPF. Isso significa que o ROAS Empate mostrado na aba ROAS é **otimista demais** — não considera todos os custos reais que o `calculateProduct` do StoreContext considera.

**Correção:** `calcRoasFromValues` deveria receber o `StoreConfig` e o `Product` completo para calcular todos os custos, igual ao `calculateProduct`.

---

### BUG 3 — Margem vs Ads ignora custos globais

**Arquivo:** `src/components/roas/AdsTab.tsx` (linhas 338-341)

A `MarginSection` calcula margem como:
```
margin = (salePrice - taxaShopee - costPrice) / salePrice * 100
```
Ignora: embalagem, impostos, afiliados, campanhas, Shopee Acelera, CPF adicional. O `calculateProduct` no StoreContext soma tudo isso. A margem mostrada aqui será **maior que a real**.

**Correção:** Usar o `calculateProduct` do StoreContext (já disponível via `useStore()`) para obter a margem real.

---

### BUG 4 — RoasBar usa constantes hardcoded (empate=2, ideal=5)

**Arquivo:** `src/components/roas/AdsTab.tsx` (linhas 234-253)

A `RoasBar` no Ranking da aba Shopee Ads usa `empate=2` e `ideal=5` fixos. Esses valores deveriam ser calculados dinamicamente por produto (baseados no lucro bruto real), como é feito no `calcRoasFromValues`.

**Correção:** Receber `empate` e `ideal` como props calculados por produto.

---

### BUG 5 — `handleCreate` nunca vincula o produto criado

**Arquivo:** `src/components/roas/AdsTab.tsx` (linhas 511-533)

Ao criar produto novo no fluxo de importação:
1. `addProduct` cria o produto sem `shopeeProductId` (não é passado no objeto)
2. Logo depois tenta `find` pelo `shopeeProductId` — nunca encontra
3. `saveMetricToDB` é chamado sem `productId`

O produto é criado mas nunca vinculado às métricas.

**Correção:** Passar `shopeeProductId` no objeto de criação e usar o retorno de `addProduct` (que retorna o produto criado) ao invés de buscar no store.

---

### BUG 6 — Donut de Composição ignora custos globais

**Arquivo:** `src/components/charts/RoasAnalysis.tsx` (linhas 87-115)

O `CostBreakdownChart` mostra apenas 3 fatias: Custo Produto, Taxa Shopee e Lucro. Ignora embalagem, impostos, afiliados, campanhas e Shopee Acelera. A visualização é enganosa pois sugere que o lucro é maior do que realmente é.

**Correção:** Adicionar todas as fatias de custo relevantes (condicional aos toggles do config).

---

### BUG 7 — `convRate` calculado com conversions=0 no parser product format

**Arquivo:** `src/lib/shopeeAdsParser.ts` (linha 302)

No `parseProductFormatCSV`, `totalConversions` é declarado mas nunca incrementado no loop (linhas 257-293). Os dados de conversões não são somados. Resultado: `convRate` e `costPerConv` são sempre 0 no formato "Por Produto".

**Correção:** Adicionar parsing e soma de conversões no loop de dados.

---

### Problema Menor — Consistência de terminologia

Na QuickCalculator, os labels ROAS usam "Lucro Médio" e "Lucrativo", enquanto na RoasAnalysis usam "Saudável" e "Ideal". Deveria ser consistente em todo o app.

---

### Plano de Correção (por prioridade)

1. **Unificar cálculo de ROAS** — Criar função `calcFullRoas(product, config)` que usa a mesma lógica do `calculateProduct` para derivar lucro bruto e ROAS Empate/Saudável/Ideal. Usar em: RoasAnalysis, QuickCalculator, AdsTab MarginSection, RoasBar.

2. **Fix handleCreate** — Usar retorno de `addProduct` e passar `shopeeProductId`.

3. **Fix convRate parser** — Incrementar `totalConversions` no loop do formato produto.

4. **Donut completo** — Adicionar fatias de impostos, embalagem, afiliados, campanhas, acelera.

5. **RoasBar dinâmico** — Calcular empate/ideal por produto ao invés de hardcoded.

6. **Terminologia** — Padronizar para "Saudável" e "Ideal" em todo o app.

Nenhuma taxa Shopee será alterada. Nenhuma outra tela será afetada.

