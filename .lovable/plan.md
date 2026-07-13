
# Redesenhar aba Lucro no estilo da aba Ads

Vou alinhar visualmente a página **Lucro** (Shopee e Mercado Livre) à linguagem já usada em **Ads** (`RoasAnalysis`, `AdsTab`, `SummaryCards`). Nenhum cálculo, parser, hook de dados ou banco será alterado — só camada de apresentação.

## Linguagem visual a adotar (do módulo Ads)

- Cards `rounded-2xl border border-border bg-card` com padding generoso e sombra sutil.
- Ícone grande e translúcido (`w-9 h-9 text-{cor}/30`) posicionado no canto superior direito de cada KPI.
- Label em `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`.
- Valor principal em `text-3xl font-black font-mono tabular-nums`, colorido por status (success/warning/destructive).
- Sublabel curta em `text-[11px] text-text-3`.
- Barras "termômetro" horizontais finas para margem/ROAS (como no `SummaryCards` do Ads).
- Chips de filtro em pill (`rounded-full`) com estado ativo em accent-orange (padrão da marca).
- Tabelas com linhas mais respiráveis, faixa lateral colorida por status, cabeçalhos ordenáveis (mantém `SortableTh` que já existe).

## Página Shopee (`ProfitAnalysis.tsx`)

1. **Header sticky moderno** no topo: título "Lucro", período detectado como chip, botões `Importar` / `Exportar` / `Salvar` alinhados à direita, mesma cara do header em Ads.
2. **Sub-abas segmentadas** (`Resumo · Produtos · Importar · Histórico`) usando o mesmo padrão de `Tabs` do Ads, com `TabsList` compacta e underline no ativo.
3. **KPIs enxutos (4 cards principais)** — Vendas, Custos totais, Taxas+Impostos, Lucro líquido —, cada um com ícone translúcido, número em fonte mono, sublinha com contagem/percentual. Card de Lucro traz mini barra termômetro de margem (verde/âmbar/vermelho) igual à barra de ROAS.
4. **Chips secundários** (Com lucro / Com prejuízo / Sem custo / Não configurados) em pill clicável abaixo dos KPIs — filtram a tabela.
5. **Accordion** para "Custos adicionais" e "Custos por produto" — recolhidos por padrão.
6. **Banner "sem custo"** substituído por um alerta enxuto no topo da aba Produtos, com botão de filtro rápido.
7. **`ParentSkuProfitTable`**: manter ordenação atual, aumentar padding vertical das linhas, reforçar faixa lateral colorida (verde ≥15% / âmbar 5–15% / vermelho <5% ou prejuízo / cinza sem custo), reduzir badges empilhados para um único status pill.

## Aba Mercado Livre (`MercadoLivreProfitTab.tsx`)

1. Mesmo **header sticky** e mesma família de sub-abas visuais (`Resumo · Importar · Produtos · Taxas · Histórico`).
2. **`MLSummaryCards`** reformulado para 4–5 KPIs no estilo Ads (mesmos tokens, ícone translúcido, número mono, chip de contagem). Card de Lucro ganha barra termômetro de margem.
3. **`MLProductTable`** com linhas mais espaçadas, faixa lateral colorida, badge único de status, colunas essenciais visíveis e drawer para o resto (mantém comportamento atual).
4. **`MLFilters`** transformado em barra de chips em pill (mesma linguagem do `FilterChips` do Ads) + seletor "Ordenar por".
5. **`MLFeeConfigCard`** reagrupado em duas colunas (Comissão · Tarifa fixa) dentro de um card `rounded-2xl` com títulos e helper text.
6. **`MLImportCard`** e **`MLHistoryList`** ganham o mesmo padrão de card com header + ação, empty-state ilustrado (ícone grande translúcido) igual ao empty-state de Ads.

## Componentes novos / reutilizados

- `src/components/profit/ProfitKpiCard.tsx` — card de KPI compartilhado entre Shopee e ML, igual ao usado em `SummaryCards` do Ads (label, ícone translúcido, valor mono, sublinha, barra termômetro opcional).
- `src/components/profit/ProfitHeaderBar.tsx` — header sticky reutilizável (título + período + ações) usado nas duas abas.
- Reutilizar `SortableTh` e `useTableSort` já existentes.

## Arquivos afetados

Editar apenas:
- `src/pages/ProfitAnalysis.tsx`
- `src/components/profit/ParentSkuProfitTable.tsx`
- `src/components/profit/ProfitFilters.tsx`
- `src/components/profit/ml/MercadoLivreProfitTab.tsx`
- `src/components/profit/ml/MLSummaryCards.tsx`
- `src/components/profit/ml/MLProductTable.tsx`
- `src/components/profit/ml/MLFilters.tsx`
- `src/components/profit/ml/MLFeeConfigCard.tsx`
- `src/components/profit/ml/MLImportCard.tsx`
- `src/components/profit/ml/MLHistoryList.tsx`
- `src/components/profit/ml/MLCard.tsx` (ajustar para `rounded-2xl`)

Criar:
- `src/components/profit/ProfitKpiCard.tsx`
- `src/components/profit/ProfitHeaderBar.tsx`

## Fora de escopo

- Toda a lógica de cálculo (`profitAnalysis.ts`, `mercadoLivreCalc.ts`).
- Parsers, hooks de dados (`useMLProducts`, `useProfitAnalysis`, etc.).
- Banco, migrations, `types.ts`.
- Qualquer outra página do app.
