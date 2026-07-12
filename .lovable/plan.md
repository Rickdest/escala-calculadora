
# Melhorar UX/Layout da página Lucro

Objetivo: deixar a aba **Lucro** com a mesma linguagem visual das outras páginas do app (Performance, ROAS, Estoque) — hoje ela está densa, com muitos cards empilhados, tabelas com 20 colunas e sem hierarquia. Vou reorganizar **somente** essa página (Shopee + Mercado Livre), sem alterar cálculos, parsers, hooks, banco ou qualquer outra área.

## Referência dos concorrentes (Nubimetrics, Real Trends, Koncilia, Shopee Seller Center)
Padrão comum que vou aplicar:
- Header com filtros de período + botão de importar sempre visível.
- Barra de KPIs enxuta (5-6 cards principais), com "ver detalhes" para desdobrar.
- Sub-abas dentro do marketplace: **Resumo · Produtos · Importar · Configurações · Histórico**.
- Tabela de produtos com colunas essenciais visíveis + **ordenação clicável em cada cabeçalho** (maior→menor, menor→maior) e edição avançada em drawer lateral.
- Linhas com destaque de status (lucro/prejuízo/sem custo) via faixa colorida à esquerda, não badges espalhados.

## Mudanças de layout — Shopee (`ProfitAnalysis.tsx`)

1. **Sub-abas internas** iguais às da aba ML: `Resumo · Produtos/Timeline · Importar · Histórico`. O seletor "Loja no tempo × Por produto" vira um segmented control dentro de "Resumo".
2. **Header sticky**: título + período detectado + botões `Importar`, `Exportar`, `Salvar` sempre visíveis no topo.
3. **KPIs**: reduzir de 7 cards para 5 principais (`Vendas`, `Custos`, `Taxas Shopee`, `Impostos`, `Lucro líquido/Margem`). Contadores secundários (com lucro / com prejuízo / sem custo) viram chips pequenos abaixo dos KPIs.
4. **Card de "Custos adicionais"** e **"Custos por produto"**: colapsáveis (accordion) para não competir com a tabela.
5. **Alerta "sem custo"**: transformar em banner discreto no topo da aba Produtos, com botão "Filtrar somente sem custo".
6. **Tabela Parent SKU**: cabeçalhos clicáveis para ordenar (Vendas, Unidades, Custo, Lucro, Margem, etc.), com ícone ↑/↓. Colunas raramente usadas escondidas atrás de "Colunas" (popover de toggle). Linha ganha faixa lateral colorida conforme status (verde/âmbar/vermelho).

## Mudanças de layout — Mercado Livre

1. Manter as sub-abas atuais (`Resumo · Importar · Produtos · Taxas · Histórico`) mas com o mesmo header sticky e mesma linguagem visual do Shopee.
2. **`MLSummaryCards`**: reduzir para 5 cards principais (Vendas · Custos · Comissão+Tarifa · Frete+Imposto · Lucro/Margem). Contadores viram chips ("3 com prejuízo", "5 não configurados") clicáveis que aplicam filtro na aba Produtos.
3. **`MLProductTable`**: hoje tem 20 colunas — reduzir visíveis para 8 essenciais (Produto, Tipo, Un., Vendas brutas, Custo un., Comissão, Lucro, Margem). Restantes (embalagem, frete, taxa %, tarifa fixa, imposto, lucro/un., situação) ficam no drawer de edição já existente (`MLProductEditDrawer`) e num popover "Colunas".
4. **Ordenação clicável em todos os cabeçalhos numéricos** (asc/desc), com estado local `sortBy/sortDir`.
5. **Filtros ML**: adicionar um seletor "Ordenar por" (Vendas, Lucro, Margem, Unidades, Custo) além dos filtros atuais, para uso rápido em mobile.
6. **Linhas**: faixa lateral colorida (verde=lucro saudável, âmbar=margem baixa, vermelho=prejuízo, cinza=inativo) em vez de múltiplos badges empilhados.
7. **Card de "Taxas"**: reagrupar campos em duas colunas (Comissão · Tarifa fixa) com títulos claros e helper text.

## Ordenação por coluna — implementação

Um pequeno hook local `useTableSort<T>(rows, defaultKey, defaultDir)` compartilhado entre `ParentSkuProfitTable` e `MLProductTable`:
- Estado: `{ key, dir }`.
- Cabeçalho vira `<button>` acessível com ícone `ArrowUpDown` / `ArrowUp` / `ArrowDown`.
- Clique alterna `desc → asc → limpar` (volta à ordem original).
- Também usado para a tabela de timeline (data, vendas, lucro).

## Arquivos afetados

Editar apenas:
- `src/pages/ProfitAnalysis.tsx` — reorganizar aba Shopee em sub-abas, header sticky, KPIs enxutos, accordions.
- `src/components/profit/ParentSkuProfitTable.tsx` — cabeçalhos ordenáveis, faixa de status, popover de colunas.
- `src/components/profit/ProfitFilters.tsx` — pequenos ajustes visuais para casar com o novo header.
- `src/components/profit/ml/MercadoLivreProfitTab.tsx` — header sticky, chips clicáveis, mesma linguagem visual.
- `src/components/profit/ml/MLSummaryCards.tsx` — reduzir para 5 cards + chips secundários.
- `src/components/profit/ml/MLProductTable.tsx` — colunas essenciais + ordenação + faixa de status.
- `src/components/profit/ml/MLFilters.tsx` — adicionar "Ordenar por".
- `src/components/profit/ml/MLFeeConfigCard.tsx` — reagrupar visualmente.

Criar:
- `src/components/profit/useTableSort.ts` — hook genérico de ordenação de tabelas.
- `src/components/profit/SortableTh.tsx` — componente de cabeçalho clicável reutilizável.

Não vou tocar em: parsers, `mercadoLivreCalc.ts`, `profitAnalysis.ts`, hooks de dados, migrations, `types.ts`, outras páginas.

## Fora de escopo
- Cálculos de lucro, comissão, taxas, impostos (mantidos como estão).
- Estrutura do banco / migrations.
- Qualquer outra aba do app.
