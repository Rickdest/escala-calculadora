// Shared Shopee configuration and HMAC signing logic
// Used by shopee-auth, shopee-callback, and shopee-sync

export const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";
export const SHOPEE_PARTNER_ID = 1231044;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function getPartnerKey(): string {
  // Try SHOPEE_KEY first, fall back to SHOPEE_PARTNER_KEY for backward compat
  const rawNew = Deno.env.get("SHOPEE_KEY") || "";
  const rawOld = Deno.env.get("SHOPEE_PARTNER_KEY") || "";
  const raw = rawNew || rawOld;
  const key = raw.trim();
  const source = rawNew ? "SHOPEE_KEY" : "SHOPEE_PARTNER_KEY";
  console.log(`getPartnerKey: source=${source}, length=${key.length}, prefix=${key.substring(0, 6)}***`);
  if (!key) {
    throw new Error("SHOPEE_KEY/SHOPEE_PARTNER_KEY is empty or not set");
  }
  if (key.length < 20) {
    throw new Error(
      `${source} looks invalid (length=${key.length}). Expected 30+ chars. Please re-save the correct key from Shopee Open Platform.`
    );
  }
  return key;
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
