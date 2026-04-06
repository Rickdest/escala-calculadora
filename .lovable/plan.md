

## Plano: Melhorar contraste dos textos na Calculadora Rápida (Home)

### Problema
Os labels e textos da calculadora rápida estão usando `text-text-3` e `section-label` que resultam em cinza muito apagado (#444 ou 60% lightness), dificultando a leitura no tema escuro.

### Mudanças no arquivo `src/components/home/QuickCalculator.tsx`

1. **Labels dos campos (CUSTO, PREÇO DE VENDA, EMBALAGEM)** — trocar de `section-label` para classe com `text-muted-foreground font-semibold` e cor mais clara
2. **Prefixo "R$"** — trocar `text-text-3` por `text-muted-foreground` (mais visível)
3. **Título "CALCULADORA RÁPIDA"** — adicionar `text-foreground` ou `text-muted-foreground` com `font-semibold`
4. **Labels das métricas ("Margem real", "Lucro líquido", etc.)** — trocar `text-text-3` por `text-muted-foreground`
5. **Textos da análise completa** — mesma melhoria em `text-text-2` → `text-foreground/80` e `text-text-3` → `text-muted-foreground`

### Resultado
Textos levemente mais grossos (font-semibold onde cabe) e mais brancos/claros, sem perder hierarquia visual. Melhor legibilidade no tema escuro mantendo a identidade do app.

### Arquivo modificado
- `src/components/home/QuickCalculator.tsx`

