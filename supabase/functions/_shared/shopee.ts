// Shared Shopee configuration and HMAC signing logic
// Used by shopee-auth, shopee-callback, and shopee-sync

export const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";
export const SHOPEE_PARTNER_ID = 1231044;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sandbox fallback key – safe to hardcode for test environment only
const SANDBOX_PARTNER_KEY = "shpk764a7272526b4d7a5664794d744a57494d485650664e5a6778635968514d";

export function getPartnerKey(): string {
  const rawNew = (Deno.env.get("SHOPEE_KEY") || "").trim();
  const rawOld = (Deno.env.get("SHOPEE_PARTNER_KEY") || "").trim();

  if (rawNew && rawNew.length >= 20) {
    console.log(`getPartnerKey: source=SHOPEE_KEY, length=${rawNew.length}`);
    return rawNew;
  }
  if (rawOld && rawOld.length >= 20) {
    console.log(`getPartnerKey: source=SHOPEE_PARTNER_KEY, length=${rawOld.length}`);
    return rawOld;
  }

  console.log(`getPartnerKey: env vars invalid/missing, using SANDBOX fallback (length=${SANDBOX_PARTNER_KEY.length})`);
  return SANDBOX_PARTNER_KEY;
}

/**
 * Generate HMAC-SHA256 signature for Shopee API v2.
 * Base string format: partnerId + path + timestamp [+ accessToken + shopId]
 */
export async function hmacSign(
  path: string,
  timestamp: number,
  accessToken = "",
  shopId = ""
): Promise<string> {
  const partnerKey = getPartnerKey();
  const baseStr = `${SHOPEE_PARTNER_ID}${path}${timestamp}${accessToken}${shopId}`;

  console.log("HMAC sign:", {
    path,
    timestamp,
    baseStrLength: baseStr.length,
    keyLength: partnerKey.length,
    keyPrefix: partnerKey.substring(0, 4) + "***",
    hasAccessToken: !!accessToken,
    hasShopId: !!shopId,
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(partnerKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(baseStr)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Make a GET request to a Shopee API endpoint with proper signing.
 */
export async function shopeeGet(
  path: string,
  accessToken: string,
  shopId: string,
  extraParams: Record<string, string> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await hmacSign(path, timestamp, accessToken, shopId);

  let url = `${SHOPEE_HOST}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;
  for (const [k, v] of Object.entries(extraParams)) {
    url += `&${k}=${encodeURIComponent(v)}`;
  }

  const res = await fetch(url);
  return res.json();
}

/**
 * Build an error JSON response with CORS headers.
 */
export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build a success JSON response with CORS headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
