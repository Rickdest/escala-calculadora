

## Remover Truncamento dos Valores KPI

### Problema
Os valores nos KPIs estão sendo cortados com "..." pelo CSS `truncate`, mesmo quando já usam abreviação `k`. Isso acontece porque o `text-2xl md:text-3xl` com `truncate` corta o texto quando a célula do grid é estreita.

### Solução

**Arquivo: `src/components/roas/AdsDetailFullView.tsx`**

1. **Remover `truncate` do valor principal** no `KpiCard` (linha 41) — os valores já estão abreviados com `k`/`M`, não precisam de truncamento
2. **Reduzir tamanho da fonte** de `text-2xl md:text-3xl` para `text-xl md:text-2xl` para garantir que valores como `R$ 5.9k` ou `10.49` caibam sem corte
3. **Manter `truncate` apenas no sub-label** (linha 42) que é menos crítico

Resultado: números sempre visíveis por completo, usando abreviação `k` para grandes valores em vez de corte CSS.

