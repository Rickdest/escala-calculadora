

## Reduzir Margem Entre Cabeçalho e Conteúdo do Detalhe

### Causa

1. **`src/pages/Roas.tsx` linha 9**: `py-4` adiciona 16px de padding-top entre o PageHeader e o conteúdo
2. **`src/components/roas/AdsDetailFullView.tsx` linha 537**: O container tem `bg-background min-h-screen` mas não elimina o padding herdado do pai
3. **Breadcrumb (linha 539)**: `mb-2` adiciona espaço extra abaixo do "Voltar"

### Mudanças

**Arquivo 1: `src/pages/Roas.tsx`**
- Reduzir `py-4` para `py-2` no mobile: `py-2 md:py-8`

**Arquivo 2: `src/components/roas/AdsDetailFullView.tsx`**
- Linha 537: Adicionar `-mt-2` ao container principal para compensar o padding do pai quando o detalhe está aberto
- Linha 539 (breadcrumb): Reduzir `mb-2` para `mb-1`
- Linha 556 (header card): Reduzir `mb-2` para `mb-1.5`

Resultado: o "Voltar" fica praticamente colado ao PageHeader, sem espaço desperdiçado.

### O que NÃO muda
- Nenhuma lógica, cálculos, ou outros componentes

