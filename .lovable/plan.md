

# Rewrite StockWizard.tsx — Shopee Seller Center Layout

## Overview
Complete rewrite of `StockWizard.tsx` from a multi-step wizard to a single scrollable form mimicking Shopee's Seller Center product creation page. Same Props (`onClose`, `editProduct`) and same hooks (`useEstoque`, `compressImage`, `generateVariationCombinations`, etc.).

## Architecture

```text
┌─────────────────────────────┐  ← Fixed header: X | "Novo Produto" | Salvar (orange, disabled if no name)
│                             │
│  ┌── Informações Básicas ──┐│
│  │ [80x80 photo]           ││
│  │ Nome *                  ││
│  │ Categoria (select)      ││
│  │ SKU Base (optional)     ││
│  │ + Adicionar descrição   ││
│  └─────────────────────────┘│
│                             │
│  ┌── Info de Vendas ───────┐│
│  │ Variações ● [+ Habilitar]│
│  │                         ││
│  │ IF no variations:       ││
│  │   Preço Custo R$ *      ││
│  │   Estoque *             ││
│  │   Estoque mínimo        ││
│  │   SKU                   ││
│  │                         ││
│  │ IF variations enabled:  ││
│  │   Variação1 block       ││
│  │     - type input+dropdown│
│  │     - option grid 2-col ││
│  │     - auto-add row      ││
│  │   + Adicionar Variação2 ││
│  │   Variação2 block       ││
│  └─────────────────────────┘│
│                             │
│  ┌── Lista de Variações ───┐│  ← Only when combinations exist
│  │ Bulk: R$ | Qtd | SKU    ││
│  │ [Aplicar a todos]       ││
│  │                         ││
│  │ Table with rowspan      ││
│  │ grouped by Var1 value   ││
│  │ + image per group       ││
│  │ alternating rows        ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤  ← Fixed footer
│  [████ Salvar Produto ████] │  ← Orange, full width, h-[52px]
└─────────────────────────────┘
```

## Key Changes

1. **Remove step system** — single scrollable view, no `step` state, no progress dots
2. **Fixed header** — X button left, title center, "Salvar" button right (orange, disabled when `nome` empty)
3. **Variation blocks** — type name input with dropdown suggestions (Cor, Tamanho, Modelo, Material, Volume, Sabor), free text accepted. Options as 2-col grid with drag icon ⠿, trash icon, optional "explanation" field. Auto-add empty row at bottom.
4. **Combination table** — grouped by Variação1 with rowspan, image upload per group, bulk apply row at top, alternating row backgrounds, horizontal scroll on mobile
5. **Auto-regenerate combinations** when options change (useEffect on attributes)
6. **Fixed footer** — "Salvar Produto" orange button, 52px height, full width
7. **Same save logic** — `addProduto`/`updateProduto` unchanged

## Technical Details

- **Single file change**: only `src/components/stock/StockWizard.tsx`
- **Same imports**: `useEstoque`, `compressImage`, `generateVariationCombinations`, `getVariationLabel`, `ProductAttribute`, all UI components
- **New state for variation options**: each option has `value` and optional `explanation` string
- **Dropdown suggestions**: filtered list shown below type input on focus/typing, hidden on blur/selection
- **Combination regeneration**: `useEffect` watching `attributes` array to rebuild `varRows`, preserving existing data by matching attribute combos
- **Table rowspan**: implemented via conditional rendering — first row of each Var1 group renders the Var1 cell with `rowSpan`, subsequent rows skip it
- **Group images**: stored in a `Record<string, string>` state mapping Var1 value to compressed dataUrl

