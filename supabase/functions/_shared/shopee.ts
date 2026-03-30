// Shared Shopee configuration and HMAC signing logic
// Official Shopee API v2 signing spec

export const SHOPEE_HOST = Deno.env.get("SHOPEE_ENV") === "production"
  ? "https://partner.shopeemobile.com"
  : "https://openplatform.sandbox.test-stable.shopee.io";

export const PARTNER_ID: number = (() => {
  const envId = (Deno.env.get("SHOPEE_PARTNER_ID") || "").trim();
  if (envId && /^\d+$/.test(envId)) {
    console.log(`[SHOPEE] partner_id source=env, value=${envId}`);
    return Number(envId);
  }
  console.log(`[SHOPEE] partner_id source=SANDBOX_FALLBACK, value=1231044`);
  return 1231044;
})();

// Alias for backward compat
export const SHOPEE_PARTNER_ID = PARTNER_ID;

function getPartnerKey(): string {
  const key = (Deno.env.get("SHOPEE_KEY") || "").trim();
  if (key && key.length >= 20) {
    console.log(`[SHOPEE] partner_key source=SHOPEE_KEY, length=${key.length}`);
    return key;
  }
  const keyOld = (Deno.env.get("SHOPEE_PARTNER_KEY") || "").trim();
  if (keyOld && keyOld.length >= 20) {
    console.log(`[SHOPEE] partner_key source=SHOPEE_PARTNER_KEY, length=${keyOld.length}`);
    return keyOld;
  }
  throw new Error("SHOPEE_KEY secret não configurado ou inválido. Configure no Supabase.");
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Official Shopee API v2 HMAC-SHA256 signing.
 *
 * Auth URL (no access_token):
 *   base_string = partner_id + path + timestamp
 *
 * Authenticated calls:
 *   base_string = partner_id + path + timestamp + access_token + shop_id
 */
export async function generateSign(
  path: string,
  timestamp: number,
  accessToken?: string,
  shopId?: number | string
): Promise<string> {
  const partnerKey = getPartnerKey();

  let baseString = `${PARTNER_ID}${path}${timestamp}`;
  if (accessToken && shopId) {
    baseString += `${accessToken}${shopId}`;
  }

  console.log("[SHOPEE DEBUG] path:", path);
  console.log("[SHOPEE DEBUG] timestamp:", timestamp);
  console.log("[SHOPEE DEBUG] base_string:", baseString);
  console.log("[SHOPEE DEBUG] base_string_length:", baseString.length);
  console.log("[SHOPEE DEBUG] key_length:", partnerKey.length);
  console.log("[SHOPEE DEBUG] key_prefix:", partnerKey.substring(0, 8) + "***");

  const keyData = new TextEncoder().encode(partnerKey);
  const msgData = new TextEncoder().encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sign = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("[SHOPEE DEBUG] sign:", sign);
  return sign;
}

// Legacy aliases
export const hmacSign = generateSign;

/**
 * Build the Shopee OAuth authorization URL.
 * base_string for auth_partner = partner_id + path + timestamp (NO access_token)
 */
export async function getAuthUrl(redirectUrl: string): Promise<string> {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSign(path, timestamp);

  const params = new URLSearchParams({
    partner_id: String(PARTNER_ID),
    timestamp: String(timestamp),
    sign,
    redirect: redirectUrl,
  });

  return `${SHOPEE_HOST}${path}?${params.toString()}`;
}

/**
 * Make a GET request to a Shopee API endpoint with proper signing.
 */
export async function shopeeGet(
  path: string,
  accessToken: string,
  shopId: string | number,
  extraParams: Record<string, string> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSign(path, timestamp, accessToken, Number(shopId));

  const params = new URLSearchParams({
    partner_id: String(PARTNER_ID),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: String(shopId),
    ...extraParams,
  });

  const url = `${SHOPEE_HOST}${path}?${params.toString()}`;
  const res = await fetch(url);
  return res.json();
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
