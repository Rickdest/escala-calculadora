

## Plano: Corrigir header mobile saindo da margem

### Problema
No viewport 390px, o título + subtítulo + seletor de loja competem pelo espaço horizontal. O subtítulo empurra o seletor de loja para fora da tela, cortando o texto "Minha Loja".

### Mudança

**Arquivo: `src/components/layout/PageHeader.tsx`**

1. **Título e subtítulo em linhas separadas** — Trocar de `flex items-baseline gap-2` (lado a lado) para empilhamento vertical (`flex-col`), com o subtítulo abaixo do título em `text-xs`
2. **Seletor de loja com `flex-shrink-0`** — Garantir que o botão do seletor nunca seja comprimido
3. **Reduzir `max-w` do nome da loja** — De `max-w-[100px]` para `max-w-[80px]` para caber melhor em telas estreitas
4. **Adicionar `overflow-hidden`** no container principal para evitar qualquer transbordamento

### Resultado
Título na primeira linha, subtítulo abaixo em tamanho menor, seletor de loja sempre visível e alinhado à direita sem sair da tela.

