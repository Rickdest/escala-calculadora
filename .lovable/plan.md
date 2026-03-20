

# Fix: Variation edit save not persisting

## Root Cause

When editing a product with variations, two bugs prevent saving:

1. **Lost DB IDs on regeneration**: The `editInitRef` skips combination regeneration only once. If the user touches anything in the variation blocks (or even if the `attributes` memo recalculates), the `useEffect` fires, regenerates `varRows` with **new random `tempId`s**, and loses the real database UUIDs. When `handleSave` then does `editProduct.variacoes.find(v => v.id === row.tempId)`, it finds nothing because `tempId` is now a random string like `"a3f8b2c1d9e"` instead of the actual UUID.

2. **Duplicate keys**: The combination generator can produce rows with colliding `tempId`s, causing React warnings.

## Fix (single file: `StockWizard.tsx`)

### Change 1: Preserve real IDs during regeneration

In the `useEffect` that regenerates combinations (lines 121-139), when matching existing rows, also try to match by atributos content against the **original** `editProduct.variacoes` to recover real DB IDs:

```typescript
useEffect(() => {
  if (!temVariacoes) return;
  if (editInitRef.current) {
    editInitRef.current = false;
    return;
  }
  const combos = generateVariationCombinations(attributes);
  if (combos.length === 0) { setVarRows([]); return; }
  
  // Build lookup from current varRows by label
  const existingMap = new Map<string, VarRow>();
  for (const v of varRows) existingMap.set(getVariationLabel(v.atributos), v);
  
  // Also build lookup from editProduct variacoes to recover real DB IDs
  const dbMap = new Map<string, string>();
  if (editProduct?.variacoes) {
    for (const v of editProduct.variacoes) {
      dbMap.set(getVariationLabel(v.atributos as Record<string,string>), v.id);
    }
  }
  
  const rows: VarRow[] = combos.map(combo => {
    const label = getVariationLabel(combo);
    const existing = existingMap.get(label);
    if (existing) return { ...existing, atributos: combo };
    // Try to recover DB ID for this combo
    const dbId = dbMap.get(label);
    return {
      tempId: dbId || Math.random().toString(36).substring(2, 15),
      atributos: combo, sku: '', preco_custo: 0, quantidade: 0, quantidade_minima: 5
    };
  });
  setVarRows(rows);
}, [temVariacoes, attributes]);
```

### Change 2: Fix handleSave to match by atributos as fallback

In `handleSave` (line 241-252), if `find(v => v.id === row.tempId)` fails, fall back to matching by atributos:

```typescript
if (temVariacoes) {
  for (const row of varRows) {
    let existing = editProduct.variacoes.find(v => v.id === row.tempId);
    if (!existing) {
      // Fallback: match by atributos content
      existing = editProduct.variacoes.find(v =>
        getVariationLabel(v.atributos as Record<string,string>) === getVariationLabel(row.atributos)
      );
    }
    if (existing) {
      await updateVariacao(existing.id, {
        preco_custo: row.preco_custo,
        quantidade: row.quantidade,
        quantidade_minima: row.quantidade_minima,
        sku: row.sku || null,
        atributos: row.atributos,
      });
    }
  }
}
```

### Change 3: Fix duplicate keys in render

Ensure each `varRow` key uses a unique combination of `tempId + label` to avoid React duplicate key warnings. In the render loop, use `key={row.tempId + '-' + getVariationLabel(row.atributos)}`.

## Summary

- File changed: `src/components/stock/StockWizard.tsx`
- No database changes needed
- No new dependencies

