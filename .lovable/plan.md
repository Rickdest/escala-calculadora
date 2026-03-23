

## Diagnosis

**ProductCard.tsx** — Already correct. The comparison panel (lines 181-203) already uses `grid grid-cols-2 gap-2` with the proper card layout. No changes needed here.

**Products.tsx** — Lines 213-237 render a simple `<button>` with `ProductThumbnail` instead of using `ProductCard`. This is why "Comparar canais" never appears.

## Plan

**Single change in `src/pages/Products.tsx`** (lines 213-237):

Replace the `<div className="surface-card divide-y divide-border">` block containing the button-based product list with `ProductCard` components:

```tsx
// Replace lines 214-237
<div className="space-y-3">
  {products.map(({ product, calc }) => (
    <ProductCard
      key={product.id}
      product={product}
      calculation={calc}
      onEdit={handleEdit}
      onDuplicate={async (id) => { await duplicateProduct(id); }}
      onDelete={async (id) => { await deleteProduct(id); }}
    />
  ))}
</div>
```

`ProductCard` is already imported (line 7) and includes edit/duplicate/delete via its dropdown menu. No other files need changes.

