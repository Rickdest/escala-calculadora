

## Plano: Melhorar tooltip do gráfico de Vendas diárias

### O que corrigir
O tooltip atual ao passar o mouse mostra apenas "X un. / Vendas". O usuário quer ver também o faturamento estimado por dia.

### Solução

**Arquivo: `src/pages/PerformanceProductDetail.tsx`**

1. **Adicionar campo `revenue` no `dailyData`**: Calcular o faturamento diário multiplicando a quantidade do dia pelo ticket médio do produto (`total_revenue / total_qty`). Para dados estimados, mesma lógica.

2. **Melhorar o Tooltip**: Usar um `content` customizado no Recharts Tooltip que mostre:
   - Data formatada (ex: "29 mar")
   - Vendas: X un.
   - Faturamento: R$ X,XX
   - Estilo visual limpo com fundo escuro e texto legível

3. **Tooltip customizado**: Componente inline com fundo `hsl(var(--card))`, borda arredondada, exibindo as duas linhas de dados de forma clara.

### Resultado
Ao passar o mouse sobre qualquer barra do gráfico, aparece a data, quantidade vendida e faturamento estimado daquele dia.

