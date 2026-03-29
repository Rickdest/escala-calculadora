

## Destaque das abas Produtos/Análise — estilo igual ao Ads

### Problema
As abas "Produtos" e "Análise" usam estilo apagado (`bg-surface-2`, `data-[state=active]:bg-surface`, `text-text-2`) enquanto as abas do Ads usam estilo com destaque forte (`data-[state=active]:bg-primary`, `data-[state=active]:text-primary-foreground`, `data-[state=active]:shadow-md`).

### Correção

**Arquivo: `src/pages/Products.tsx` (linhas 162-168)**

Atualizar o `TabsList` e os dois `TabsTrigger` para usar o mesmo padrão visual do Ads:

- `TabsList`: trocar `h-9 bg-surface-2 p-0.5` por `h-11 bg-secondary/80 border border-border rounded-xl p-1`
- Ambos `TabsTrigger`: trocar classes por `flex-1 h-9 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70`

O texto e contagem `({stats?.totalProducts || 0})` permanecem iguais — só muda o estilo visual.

### Resultado
As abas de Produtos ficam com o mesmo destaque laranja forte do Ads (aba ativa com fundo `bg-primary` e texto branco).

