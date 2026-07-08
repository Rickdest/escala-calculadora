## Objetivo

Nova página **"Análise de Lucro"** (rota `/lucro`) onde você sobe relatórios da Shopee e vê quanto sobrou depois das taxas, por dia/semana/mês **e** por produto (quando o export permitir).

---

## Descoberta com os arquivos enviados

- `productoverview...xlsx` → totais **por dia** da loja (visitantes, pedidos pagos, vendas em BRL). **Sem quebra por SKU.**
- `shop-stats...xlsx` → totais do **período inteiro** (pedidos, cancelados, reembolsados). **Sem quebra por SKU.**
- `Parent SKU Detail` (usado na Performance) → totais **por produto** no período. **Tem SKU e vendas por item.**

A página precisa aceitar os três e adaptar a UI ao que vier.

---

## 1. Página `/lucro` — "Análise de Lucro"

- Item novo no menu lateral (`DollarSign`).
- Seletor de loja + badge do período detectado no nome do arquivo.
- Botão único **"Enviar relatório da Shopee"** — detecta automaticamente qual dos três é (product overview / shop stats / parent SKU) pelo cabeçalho.
- Sidebar interna com análises salvas anteriormente (reabrir dia/semana/mês passado).

## 2. Dois modos de exibição

**Modo A — Loja no tempo** (quando o arquivo é `productoverview` ou `shop-stats`):

- Toggle **Diário | Semanal | Mensal** (agrupa as linhas do productoverview).
- Um único campo global **"Custo médio dos produtos vendidos (% do preço)"** ou **"Custo médio por unidade"** — porque o arquivo não tem SKU.
  - Ex.: se informar 40%, aplicamos 40% de COGS em cima da receita.
  - Alternativa: puxar o custo médio ponderado do cadastro de produtos da loja (média dos `costPrice / salePrice`).
- Cards: **Vendas · Taxas Shopee estimadas · Custo estimado · Impostos · Lucro · Margem %**
- Gráfico de barras: lucro por dia/semana/mês.
- Tabela com uma linha por período (data, vendas, taxa, custo, lucro, margem).

**Modo B — Por produto** (quando o arquivo é `Parent SKU Detail`):

- Cards de totais iguais ao modo A, mas com valores exatos.
- Tabela produto a produto com **input de custo unitário** editável (pré-preenchido do cadastro quando o `shopeeItemId` bate).
- Botão por linha: **Salvar custo no cadastro**.
- Botão: **Vincular produto** (reaproveita fluxo já existente na Performance).

Ambos modos usam a mesma paleta de status já do app (verde ≥ alvo, amarelo perto, vermelho abaixo).

## 3. Cálculo

- Taxa Shopee: `getShopeeFeeForPrice(precoMedio)` → percentual + fixa por faixa, aplicada em cima da receita da linha/produto.
- Impostos: `storeConfig.taxes` × vendas.
- **Modo A** (loja): `custo = vendas × %COGS` OU `custo = unidades × custoMédioUn`.
- **Modo B** (por produto): `custo = unidades × custoUnitário` (por linha).
- Lucro = `vendas − taxa − impostos − custo`.
- Margem = `lucro / vendas`.

Helper novo `src/lib/profitAnalysis.ts` reutilizando `getShopeeFeeForPrice`.

## 4. Persistência

Nova tabela `profit_analyses`:
- `id`, `user_id`, `store_id`, `period_start`, `period_end`
- `report_type` (`product_overview` | `shop_stats` | `parent_sku`)
- `granularity` (`day` | `week` | `month` | `custom`)
- `avg_cost_pct` (nullable, usado no Modo A)
- `total_revenue`, `total_fees`, `total_cost`, `total_profit`, `margin_pct`
- `raw_rows jsonb` (linhas + custos preenchidos)

RLS por `auth.uid()`, GRANTs pra `authenticated` e `service_role`.

## 5. Parsers

- Reaproveitar `parseProductPerformanceExcel.ts` (Parent SKU).
- Novo `parseShopeeProductOverview.ts` — lê as linhas diárias, colunas "Data", "Vendas (Pedido pago) (BRL)", "Unidades (Pedido pago)", "Compradores (Pedidos pago)".
- Novo `parseShopeeShopStats.ts` — lê a linha única de período das abas "Pedido Feito" e "Produto Pago".
- Detecção automática pelo cabeçalho da primeira aba.

## 6. Fora de escopo

- Frete real por pedido (precisa relatório de Rendimento).
- Custo de ads no lucro (Performance já cobre).
- Export PDF.
- Comparativo automático entre períodos salvos.

---

## Arquivos afetados

- Migração: `profit_analyses` (tabela + RLS + GRANTs)
- `src/pages/ProfitAnalysis.tsx`
- `src/components/profit/ProfitUploader.tsx`, `ProfitSummaryCards.tsx`, `ProfitTimeChart.tsx`, `ProfitTable.tsx`, `CostInput.tsx`, `AvgCostControl.tsx`
- `src/lib/profitAnalysis.ts`, `src/lib/parsers/parseShopeeProductOverview.ts`, `src/lib/parsers/parseShopeeShopStats.ts`
- `src/hooks/useProfitAnalysis.ts`
- `src/App.tsx` + `src/components/layout/Sidebar.tsx` + `BottomNavigation.tsx` (rota + item de menu)
