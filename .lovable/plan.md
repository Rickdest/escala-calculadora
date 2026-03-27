

## Posição como KpiCard no Grid + Fix Mobile Overflow

### Arquivo: `src/components/roas/AdsDetailFullView.tsx`

**1. Transformar Posição em KpiCard dentro do grid (linhas 574-619)**

- Remover o bloco separado do card de posição (linhas 584-619)
- Adicionar a Posição como primeiro item do grid de KPIs, antes de Impressões
- Usar o mesmo estilo de `KpiCard` mas com cor semântica (success/warning/destructive) como já faz o ROAS highlight
- O grid passa de 6 para 7 KPIs quando há posição

Novo layout do grid:
```
Posição | Impressões | Cliques | CTR | Vendas | GMV | ROAS
```

A Posição usará as mesmas cores semânticas (success ≤8, warning ≤20, destructive >20) e mostrará o `pageLabel` como `sub`.

**2. Fix mobile overflow no grid de KPIs (linha 575)**

- Mudar de `grid-cols-3 md:grid-cols-6` para `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7`
- Adicionar `overflow-hidden` ao container para evitar que cards saiam da tela
- Reduzir padding interno dos KpiCards no mobile: `p-2 md:p-3`

### O que NÃO muda
- Lógica de cálculo, hints, cores semânticas
- Tabs, diagnóstico, métricas
- Outros componentes

