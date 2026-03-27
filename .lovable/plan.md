

## Fix: App Resets State When Switching Browser Tabs

### Root Cause

When you switch browser tabs and return, Supabase silently refreshes the auth token. This changes `session.access_token`, which causes `SubscriptionContext.fetchSubscription` to re-run with `setLoading(true)`. The `ProtectedRoute` component sees `loading === true` and renders a full-page spinner, **unmounting the entire app tree** and destroying all local state (selected ad detail, filters, scroll position, etc.).

### Fix — `src/contexts/SubscriptionContext.tsx`

**Only show loading on the very first check.** Subsequent token refreshes should update subscription status silently without triggering loading state.

1. Add a `hasResolved` ref (starts `false`, set to `true` after first successful fetch)
2. Change `setLoading(true)` to only run when `!hasResolved.current`
3. This way, after initial load, token refreshes update status in the background without unmounting the app

```
Before:
  try {
    setLoading(true);      // ← This kills the UI every time
    ...

After:
  try {
    if (!hasResolved.current) setLoading(true);  // ← Only on first load
    ...
  } finally {
    hasResolved.current = true;
    setLoading(false);
  }
```

### File modified
- `src/contexts/SubscriptionContext.tsx` (3 lines changed)

### What does NOT change
- Auth logic, token refresh, session handling
- Subscription check still runs on every token refresh (just silently)
- ProtectedRoute logic unchanged
- All other components untouched

