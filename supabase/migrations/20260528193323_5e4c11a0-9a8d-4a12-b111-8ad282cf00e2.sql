-- Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon, grant only what the app needs

-- Trigger-only functions: no direct execute needed
REVOKE EXECUTE ON FUNCTION public.reconcile_subscription_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_shopee_states() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_store_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_trial() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_subscription_to_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Privileged write function: only service role should call
REVOKE EXECUTE ON FUNCTION public.update_subscription_status(uuid, text, timestamptz, text, text) FROM PUBLIC, anon, authenticated;

-- User-callable helpers: restrict to authenticated only (no anon)
REVOKE EXECUTE ON FUNCTION public.has_role(app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_own_profile_protected() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_shopee_token_metadata(text, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_profile_protected() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shopee_token_metadata(text, uuid) TO authenticated;