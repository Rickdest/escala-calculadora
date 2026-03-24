

## 3 Corrections for Ads Detail View

### Correction 1: "Atualizar CSV" Button in Detail Header

**File: `src/components/roas/AdsDetailFullView.tsx`**
- Add `onReimport: () => void` prop to the component
- In the header section (line ~406, after the status badges), add an "Atualizar CSV" button with Upload icon
- Style: `variant="outline" size="sm"` matching existing badge row

**File: `src/components/roas/AdsTab.tsx`**
- Add `onReimport` prop to `AdsDetailFullView` that:
  1. Sets `positionTarget` to the current ad's ID
  2. Opens the position file picker (`positionFileRef.current?.click()`)
- In `handlePositionFile`, after successful import, reload data and reopen the detail with updated data (find the ad by ID in refreshed data)

### Correction 2: Swap Inverted conversoes/itens_vendidos

**File: `src/lib/shopeeAdsParser.ts`**
- In `parseGeneralFormatCSV`, after building each product's aggregated data, add validation before creating the metric:
```typescript
if (data.conversions > data.itemsSold && data.itemsSold > 0) {
  const temp = data.conversions;
  data.conversions = data.itemsSold;
  data.itemsSold = temp;
}
```
- Same validation in `parseProductFormatCSV` after aggregation loop:
```typescript
if (totalConversions > totalItemsSold && totalItemsSold > 0) {
  const temp = totalConversions;
  totalConversions = totalItemsSold;
  totalItemsSold = temp;
}
```

### Correction 3: Always Show Both Cost Lines

**File: `src/components/roas/AdsDetailFullView.tsx`**
- Lines 200-210: Remove the conditional `ad.itens_vendidos !== (ad.conversoes || 0)` that hides "Custo por unidade"
- Always show both lines:
  - "Custo por pedido: R$ X,XX (N pedidos)"
  - "Custo por unidade: R$ X,XX (N unidades · media X.X/pedido)"
- Calculate `mediaPorPedido = ad.itens_vendidos / ad.conversoes`
- If `mediaPorPedido > 1`, add highlight tip: "Cada pedido tem em media X.X unidades — custo real por unidade e menor."

### Files Changed
- `src/components/roas/AdsDetailFullView.tsx` — add onReimport prop + button, fix cost card display
- `src/components/roas/AdsTab.tsx` — pass onReimport handler, refresh detail after reimport
- `src/lib/shopeeAdsParser.ts` — add swap validation in both parsers

