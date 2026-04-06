

## Plano: Destacar produtos sem custo configurado

### Mudança

**Arquivo: `src/components/cards/ProductCard.tsx`**

1. **Borda amarela condicional** — quando `product.costPrice <= 0`, trocar a classe de borda do card de `border-border` para `border-warning/50` (amarelo)

2. **Banner de aviso** — logo após o `cardHeader`, se `costPrice <= 0`, mostrar uma linha com fundo `bg-warning/10`, borda `border-warning/20`, texto 11px amarelo: `"⚠ Custo não informado — preencha para calcular margem real"`

### Lógica
```typescript
const missingCost = !product.costPrice || product.costPrice <= 0;

// No className do card wrapper:
className={cn(
  "rounded-card border bg-card p-4 ...",
  missingCost ? "border-warning/50" : "border-border hover:border-primary/30"
)}

// Após cardHeader:
{missingCost && (
  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1">
    ⚠ Custo não informado — preencha para calcular margem real
  </div>
)}
```

### Arquivo modificado
- `src/components/cards/ProductCard.tsx` — borda condicional + banner de aviso

