

## Plano: Melhorar contraste do botão "Minha Loja" no header

### Problema
O texto e borda do seletor de loja estão muito apagados (`text-muted-foreground`, `border-border`, `text-text-3`).

### Mudança em `src/components/layout/PageHeader.tsx`

1. **Texto da loja**: `text-muted-foreground` → `text-foreground/70` (mais visível sem ser branco puro)
2. **Borda do botão**: `border-border` → `border-border/80` (sutil melhoria)
3. **Ícone chevron**: `text-text-3` → `text-muted-foreground` (acompanha o texto)
4. **Dot indicador**: manter `bg-primary` (já tem contraste)

Resultado: botão mais legível sem chamar atenção excessiva — meio termo entre apagado e destacado.

