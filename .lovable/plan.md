

## Grid 2 colunas na lista de produtos (desktop)

### Mudança
Alterar o container da lista de produtos de `space-y-3` (empilhado) para um grid responsivo com 2 colunas no desktop.

### Arquivo: `src/pages/Products.tsx` (linha 216)

```tsx
// De:
<div className="space-y-3">

// Para:
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

Uma única linha alterada. Mobile continua 1 coluna.

