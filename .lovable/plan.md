

## Plan: Add profiles fallback to check-subscription edge function

### What changes
**Single file**: `supabase/functions/check-subscription/index.ts`

Replace lines 101-102 (the "No subscription record found" block) with a fallback that queries `profiles` for trial/active status before returning expired.

### Logic
1. Query `profiles` table for `status, trial_fim, trial_inicio` where `user_id = userId`
2. If profile found with `status = 'trial'`, validate trial is legitimate (started within last 8 days) and not expired
3. If profile found with `status = 'ativo'`, return active
4. Otherwise return expired

### No other files touched

