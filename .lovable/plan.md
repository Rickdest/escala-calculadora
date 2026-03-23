

## Diagnosis

All three fixes requested are **already present** in the current codebase:

1. **Footer z-index**: `z-[70]` on the modal overlay (line 153-154), `z-[60]` on the footer (line 476), and `pb-6` on the form (line 164) — all correct.

2. **outros_canais persistence chain**: Complete and working:
   - `handleSubmit` includes `outrosCanais` (line 125)
   - `updateProduct` maps `outrosCanais → outros_canais` (line 360)
   - `mapDbProduct` reads `(p as any).outros_canais` (line 68)
   - `addProduct` and `duplicateProduct` also include it (lines 322, 421)

3. **Form state initialization**: `outrosCanais` state initializes from `(product as any)?.outrosCanais ?? {}` (line 37), and the `Product` type includes `outrosCanais?: OutrosCanais` (line 144 of store.ts).

## One Subtle Bug Found

When the user **removes all channels** (deactivates all toggles), the form sends `outrosCanais: undefined` (line 125: `Object.keys(outrosCanais).length > 0 ? outrosCanais : undefined`). In `updateProduct`, the check `updates.outrosCanais !== undefined` then **skips** the DB update — so previously saved channel data can never be cleared.

## Plan

**Single fix** in `src/components/forms/ProductForm.tsx`, line 125:

Change:
```ts
outrosCanais: Object.keys(outrosCanais).length > 0 ? outrosCanais : undefined,
```
To:
```ts
outrosCanais: Object.keys(outrosCanais).length > 0 ? outrosCanais : null,
```

And in `src/contexts/StoreContext.tsx`, line 360, the existing code `updates.outrosCanais !== undefined` will now correctly trigger when `null` is passed (since `null !== undefined`), writing `null` to the DB.

No other changes needed — everything else is already correctly implemented.

