

## Plano: Esconder comparativo de canais quando não preenchido

### Problema
O card do produto sempre mostra a seção "Margem em outras plataformas" com cálculos genéricos, mesmo quando o usuário não preencheu dados de outros canais no produto. Isso é confuso e mostra valores imprecisos.

### Solução
Condicionar a exibição da seção ao produto ter pelo menos um canal preenchido em `product.outrosCanais`.

### Mudança em `src/components/cards/ProductCard.tsx`

Na linha 210, trocar:
```tsx
{config && (
```
por:
```tsx
{config && product.outrosCanais && Object.keys(product.outrosCanais).length > 0 && (
```

Isso garante que a seção só aparece quando o usuário efetivamente configurou canais extras para aquele produto.

### Arquivo modificado
- `src/components/cards/ProductCard.tsx` (1 linha)

