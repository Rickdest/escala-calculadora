

## Reverter ProductPicker para lista vertical com 4 produtos visíveis

### Problema
Os chips horizontais ficaram ruins no mobile. O usuário quer voltar ao estilo de container com lista de produtos visíveis para ir selecionando.

### Mudança em `src/components/charts/RoasAnalysis.tsx` — refatorar `ProductPicker`

**Substituir chips horizontais por lista vertical compacta:**

1. Container com `rounded-xl border bg-card` mostrando até **4 produtos** visíveis como botões clicáveis empilhados verticalmente
2. Cada item: imagem (`w-8 h-8`) + nome truncado + preço + badge ROAS — layout `flex items-center gap-2.5 px-3 py-2`
3. Produto selecionado: `bg-primary/10 border-l-2 border-l-primary` (destaque lateral)
4. Se >4 produtos: botão "Ver todos" no final que abre o modal de busca (reaproveitando o modal existente)
5. Manter auto-seleção do primeiro produto por `updatedAt`
6. Remover: scroll horizontal de chips, info bar duplicada abaixo

### Arquivo modificado
- `src/components/charts/RoasAnalysis.tsx` (apenas `ProductPicker`)

