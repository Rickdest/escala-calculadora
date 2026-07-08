## Melhorias na página Análise de Lucro

### 1. Visualização por produto (dois modos)
- **Modo SKU (quando subir Parent SKU Detail):** cada produto vira uma linha editável com custo unitário pré-preenchido do cadastro quando o SKU bater; lucro e margem calculados linha a linha.
- **Modo Manual (quando subir só Shop Stats / Product Overview):** painel "Produtos do período" onde o usuário adiciona produtos (busca no catálogo salvo → pré-preenche custo, ou entrada manual), informa unidades vendidas e custo unitário. Sistema soma custos e distribui proporcionalmente na timeline.
- Detecção automática do modo baseada no tipo de arquivo já implementada continua valendo.

### 2. Gráfico de linha (Vendas × Lucro)
- Novo componente com duas linhas (Receita e Lucro Líquido) usando Recharts.
- Cores: receita em `hsl(var(--primary))` (laranja Skalify), lucro em verde/vermelho conforme sinal.
- Tooltip mostrando Vendas, Custo, Taxa Shopee, Impostos, Lucro e Margem % do ponto.
- Aparece tanto no modo timeline (evolução por período) quanto no modo SKU (top N produtos por receita).

### 3. Filtros de período e agrupamento
Barra de filtros acima do gráfico e da tabela:
- **Agrupamento:** botões `Dia | Semana | Mês` (reagrupa gráfico + tabela usando `groupDaily` já existente).
- **Intervalo:** presets `Últimos 7 dias | 30 dias | Este mês | Personalizado` (personalizado abre date range picker).
- Filtros operam sobre os dados já carregados da análise (client-side, sem re-upload).

### 4. Layout da página
```text
[Header + Upload]
[Cards de resumo (Vendas, Taxas, Impostos, Custo, Lucro)]
[Filtros: Agrupamento | Intervalo de datas]
[Gráfico de linha Vendas × Lucro]
[Painel "Custos por produto" (modo timeline) OU tabela editável (modo SKU)]
[Tabela detalhada por período/produto]
```

### Detalhes técnicos
- **Novo componente:** `src/components/profit/ProfitLineChart.tsx` (Recharts, responsivo).
- **Novo componente:** `src/components/profit/ProfitFilters.tsx` (agrupamento + date range).
- **Atualizar `src/pages/ProfitAnalysis.tsx`:**
  - Adicionar estado `granularity`, `dateRange`, filtragem client-side das linhas.
  - Reagrupar via `groupDaily(filteredRows, granularity)` já existente em `profitAnalysis.ts`.
  - Renderizar gráfico acima da tabela.
- **Sem mudanças no banco** — os dados brutos em `raw_rows` já suportam refiltragem/regrupamento.
- **Parsers permanecem como estão** — modo dual (SKU vs manual) já foi implementado no turno anterior.

### Fora de escopo
- Detalhamento venda-a-venda (a Shopee não fornece isso nos relatórios agregados; exigiria a API de Orders, que é outra frente).