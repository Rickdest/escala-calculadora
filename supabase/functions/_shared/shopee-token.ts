// Unified Shopee token refresh logic — shared by shopee-sync, shopee-ads, shopee-seller-discovery.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  generateSignWith,
  getCredentialsForAppType,
} from "./shopee.ts";
import { createLogger } from "./logger.ts";

export interface ShopeeTokenRow {
  id: string;
  access_token: string;
  refresh_token: string;
  shop_id: number | string;
  expire_in: number;
  token_created_at: string;
  app_type?: string;
}

export interface RefreshResult {
  token: string;
  needs_reauth: boolean;
  refreshed: boolean;
}

/**
 * Refresh a Shopee access token if it's near expiry (5 min safety margin).
 * Uses credentials matching `appType` ('seller' | 'ads').
 *
 * @returns { token, needs_reauth, refreshed }
 *  - token: current valid token (refreshed if needed)
 *  - needs_reauth: true when refresh failed (refresh_token expired or revoked)
 *  - refreshed: true when a new token was actually issued
 */
export async function refreshShopeeTokenIfNeeded(
  shopeeToken: ShopeeTokenRow,
  appType: "seller" | "ads" = "seller",
): Promise<RefreshResult> {
  const log = createLogger(`SHOPEE TOKEN ${appType.toUpperCase()}`);

  const tokenAge =
    (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;

  if (tokenAge <= shopeeToken.expire_in - 300) {
    return { token: shopeeToken.access_token, needs_reauth: false, refreshed: false };
  }

  log.info("refresh_start", { token_id: shopeeToken.id, age_seconds: Math.round(tokenAge) });

  const creds = getCredentialsForAppType(appType);
  const refreshPath = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSignWith(creds.partnerId, creds.partnerKey, refreshPath, timestamp);
  const refreshUrl = `${SHOPEE_HOST}${refreshPath}?partner_id=${creds.partnerId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: shopeeToken.refresh_token,
        shop_id: Number(shopeeToken.shop_id),
        partner_id: creds.partnerId,
      }),
    });

    const refreshData = await refreshRes.json();

    if (refreshData?.access_token) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      await supabaseAdmin
        .from("shopee_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expire_in: refreshData.expire_in || 0,
          token_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopeeToken.id);

      log.info("refresh_ok", { token_id: shopeeToken.id });
      return { token: refreshData.access_token, needs_reauth: false, refreshed: true };
    }

    log.error("refresh_failed", {
      token_id: shopeeToken.id,
      error_code: refreshData?.error,
      message: typeof refreshData?.message === "string" ? refreshData.message.slice(0, 200) : undefined,
    });
    return { token: shopeeToken.access_token, needs_reauth: true, refreshed: false };
  } catch (e) {
    log.error("refresh_exception", { error: e instanceof Error ? e.message : String(e) });
    return { token: shopeeToken.access_token, needs_reauth: true, refreshed: false };
  }
}
