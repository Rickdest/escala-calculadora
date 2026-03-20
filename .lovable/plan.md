

## Bug Fixes for ROAS Page

### Problem 1: Text overflow in KPI cards
The 3-column grid (`grid-cols-3`) for ROAS Empate/Saudável/Ideal is too cramped on mobile (390px viewport). Labels and values get cut off. The `KpiCard` component has icon + text side by side which doesn't fit in ~110px columns.

**Fix:** On mobile, simplify the KPI cards layout — remove the icon box, center-align text, and reduce padding. Use a more compact mobile-specific rendering inside the 3-col grid.

Changes in `RoasAnalysis.tsx`:
- Replace the 3x `KpiCard` usage (lines 582-586) with a custom compact inline layout for mobile that shows label + value centered, no icon container
- Keep desktop layout with icons via responsive classes

### Problem 2: Remove "Meus Produtos Salvos" section
The `SavedProducts` component (lines 692-704) is not useful. Remove it entirely from the render.

**Files to edit:**
- `src/components/charts/RoasAnalysis.tsx` — remove SavedProducts usage (lines 692-704), remove import (line 27), and fix the KPI cards mobile layout (lines 582-586)

