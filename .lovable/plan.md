

## Fix: Ads Tab Resets When Switching Browser Tabs

### Root Cause

Two layers of the same bug:

1. **`useAdsData.ts`** — `fetchData` depends on `user` (full object reference). When Supabase refreshes the token on tab switch, `user` gets a new reference → `fetchData` recreates → `useEffect` fires → **`setLoading(true)`**.

2. **`AdsTab.tsx` line 146** — When `loading` is true, the component returns a spinner, **unmounting the entire detail view** and all local state (selected product, filters, scroll position).

### Fix

**File 1: `src/hooks/useAdsData.ts`**

Same pattern as the SubscriptionContext fix — only show loading on first fetch:

- Add a `hasResolved` ref
- Change `setLoading(true)` in `fetchData` to `if (!hasResolved.current) setLoading(true)`
- Set `hasResolved.current = true` after first fetch completes
- Change `fetchData` dependencies from `user` to `user?.id` to avoid unnecessary recreations on token refresh (the full `user` object changes reference, but `user.id` stays the same)

**File 2: `src/components/roas/AdsTab.tsx`**

As a safety net, don't unmount the detail view during loading:

- Change the early return on `loading` (line 146-152) to only show spinner when there's no data yet (`loading && !hasData`)
- This way, subsequent refetches show existing data while updating silently

### What does NOT change
- All calculation logic, import logic, CSV parsing
- UI components, detail view, filters
- SubscriptionContext (already fixed)

