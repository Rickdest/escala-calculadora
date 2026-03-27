

## Padronizar métricas secundárias (Posição, Vendas, Custo/un) nos cards de Ads

### Problema
A linha de Posição, Vendas e Custo/un usa layout `flex` com ícones pequenos e texto `text-sm`/`text-xs`, ficando muito menor e desalinhada comparada à linha de ROAS/GMV/GASTO que usa `text-center` com valores grandes.

### Mudança em `src/components/roas/AdsProductCard.tsx`

Substituir a seção "SECONDARY METRICS" (linhas 119-133) por um grid idêntico ao das métricas primárias:

- Mesmo layout: `grid grid-cols-3 gap-3` com `text-center`
- Valores centralizados com tipografia `font-mono text-lg font-extrabold` (mesmo tamanho que GMV/GASTO)
- Posição: `text-lg` com `#` prefixo e cor semafórica (já existe via `getPositionColor`)
- Vendas: `text-lg` com valor + label "un" abaixo
- Custo/un: `text-lg` com valor formatado
- Labels `text-[10px] font-medium text-muted-foreground` abaixo (mesmo padrão dos primários)
- Remover ícones laterais (MapPin, ShoppingCart, DollarSign) — o label já identifica cada métrica
- Manter `border-t border-border/40 pt-2.5` como separador

### Resultado
As 6 métricas (ROAS, GMV, GASTO, Posição, Vendas, Custo/un) ficam em 2 linhas de 3 colunas com mesmo estilo visual centralizado.

