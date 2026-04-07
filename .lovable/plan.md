

## Plano: Toggle laranja no Paywall

Alterar o toggle Mensal/Anual para que o botão selecionado tenha fundo laranja (`bg-primary`) com texto branco, em vez do estilo atual com `bg-card` e borda.

### Mudança em `src/pages/Paywall.tsx`

No toggle, trocar as classes do botão ativo:
- **Antes**: `bg-card text-foreground border border-border/60 shadow-sm`
- **Depois**: `bg-primary text-primary-foreground shadow-sm`

E o botão inativo mantém o estilo transparente atual.

### Arquivo modificado
- `src/pages/Paywall.tsx` (apenas as classes CSS do toggle)

