// Shared Shopee configuration and HMAC signing logic
// Used by shopee-auth, shopee-callback, and shopee-sync

export const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";

const SANDBOX_PARTNER_ID = 1231044;
const SANDBOX_PARTNER_KEY = "shpk764a7272526b4d7a5664794d744a57494d485650664e5a6778635968514d";

export function getPartnerId(): number {
  const envId = (Deno.env.get("SHOPEE_PARTNER_ID") || "").trim();
  if (envId && /^\d+$/.test(envId)) {
    console.log(`getPartnerId: source=env, value=${envId}`);
    return Number(envId);
  }
  console.log(`getPartnerId: source=SANDBOX_FALLBACK, value=${SANDBOX_PARTNER_ID}`);
  return SANDBOX_PARTNER_ID;
}

export const SHOPEE_PARTNER_ID = getPartnerId();

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  console.log(`getPartnerKey: source=SANDBOX_FALLBACK, length=${SANDBOX_PARTNER_KEY.length}`);
  return SANDBOX_PARTNER_KEY;
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign for /api/v2/shop/auth_partner — base string: partnerId + path + timestamp
 * Note: Shopee docs say auth_partner uses the SAME format as other endpoints.
 */
export async function hmacSign(
  path: string,
  timestamp: number,
  accessToken = "",
  shopId = ""
): Promise<string> {
  const partnerKey = getPartnerKey();
  const partnerId = SHOPEE_PARTNER_ID;
  const baseStr = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;

  console.log("HMAC sign:", {
    path,
    timestamp,
    baseStrLength: baseStr.length,
    keyLength: partnerKey.length,
    keyPrefix: partnerKey.substring(0, 8) + "***",
    hasAccessToken: !!accessToken,
    hasShopId: !!shopId,
  });

  return hmacSha256(partnerKey, baseStr);
}

/**
 * Special signing for auth_partner: partnerId + path + timestamp
 * Some sandbox environments need only partnerId + timestamp (no path).
 * We try BOTH and return two URLs so the caller can pick.
 */
export async function signAuthPartner(timestamp: number): Promise<{ withPath: string; withoutPath: string }> {
  const partnerKey = getPartnerKey();
  const partnerId = SHOPEE_PARTNER_ID;

  const baseWithPath = `${partnerId}/api/v2/shop/auth_partner${timestamp}`;
  const baseWithoutPath = `${partnerId}${timestamp}`;

  console.log("signAuthPartner:", {
    timestamp,
    partnerId,
    baseWithPathLen: baseWithPath.length,
    baseWithoutPathLen: baseWithoutPath.length,
    keyPrefix: partnerKey.substring(0, 8) + "***",
  });

  const [signWithPath, signWithoutPath] = await Promise.all([
    hmacSha256(partnerKey, baseWithPath),
    hmacSha256(partnerKey, baseWithoutPath),
  ]);

  return { withPath: signWithPath, withoutPath: signWithoutPath };
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
