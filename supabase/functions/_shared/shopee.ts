// Shared Shopee configuration and HMAC signing logic
// Official Shopee API v2 signing spec — supports dual apps (Seller + Ads)

export const SHOPEE_HOST = Deno.env.get("SHOPEE_ENV") === "production"
  ? "https://partner.shopeemobile.com"
  : "https://partner.test-stable.shopeemobile.com";

export const PARTNER_ID: number = (() => {
  const envId = (Deno.env.get("SHOPEE_PARTNER_ID") || "").trim();
  if (envId && /^\d+$/.test(envId)) {
    return Number(envId);
  }
  throw new Error("SHOPEE_PARTNER_ID secret não configurado. Configure no backend.");
})();

export const SHOPEE_PARTNER_ID = PARTNER_ID;

export type ShopeeCredentials = { partnerId: number; partnerKey: string };

async function getSecretFingerprint(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret.trim())
  );

  return Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getPartnerKey(): string {
  const key = (Deno.env.get("SHOPEE_KEY") || "").trim();
  if (key && key.length >= 20) {
    return key;
  }
  const keyOld = (Deno.env.get("SHOPEE_PARTNER_KEY") || "").trim();
  if (keyOld && keyOld.length >= 20) {
    return keyOld;
  }
  throw new Error("SHOPEE_KEY secret não configurado ou inválido.");
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Parameterized helpers (for dual-app support) ────────────────────

/**
 * HMAC-SHA256 signing with explicit credentials.
 */
export async function generateSignWith(
  partnerId: number,
  partnerKey: string,
  path: string,
  timestamp: number,
  accessToken?: string,
  shopId?: number | string
): Promise<string> {
  let baseString = `${partnerId}${path}${timestamp}`;
  if (accessToken) baseString += `${accessToken}`;
  if (shopId) baseString += `${shopId}`;

  const keyData = new TextEncoder().encode(partnerKey);
  const msgData = new TextEncoder().encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * GET request with explicit credentials.
 */
export async function shopeeGetWith(
  partnerId: number,
  partnerKey: string,
  path: string,
  accessToken: string,
  shopId: string | number,
  extraParams: Record<string, string> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSignWith(partnerId, partnerKey, path, timestamp, accessToken, Number(shopId));

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: String(shopId),
    ...extraParams,
  });

  const url = `${SHOPEE_HOST}${path}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[SHOPEE HTTP] ${res.status} ${res.statusText} — ${path} — body: ${text.substring(0, 500)}`);
    return { error: `HTTP ${res.status}`, message: text.substring(0, 200) };
  }
  return res.json();
}

/**
 * POST request with explicit credentials.
 */
export async function shopeePostWith(
  partnerId: number,
  partnerKey: string,
  path: string,
  accessToken: string,
  shopId: string | number,
  body: Record<string, unknown> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSignWith(partnerId, partnerKey, path, timestamp, accessToken, Number(shopId));

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: String(shopId),
  });

  const url = `${SHOPEE_HOST}${path}?${params.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[SHOPEE HTTP] ${res.status} ${res.statusText} — ${path} — body: ${text.substring(0, 500)}`);
    return { error: `HTTP ${res.status}`, message: text.substring(0, 200) };
  }
  return res.json();
}

// ─── Ads app credentials ─────────────────────────────────────────────

export function getAdsCredentials(): ShopeeCredentials {
  const envId = (Deno.env.get("SHOPEE_ADS_PARTNER_ID") || "").trim();
  const envKey = (Deno.env.get("SHOPEE_ADS_KEY") || "").trim();
  if (!envId || !/^\d+$/.test(envId)) {
    throw new Error("SHOPEE_ADS_PARTNER_ID não configurado ou inválido.");
  }
  if (!envKey || envKey.length < 20) {
    throw new Error("SHOPEE_ADS_KEY não configurado ou inválido.");
  }
  const adsId = Number(envId);
  // Cross-validate: Ads Partner ID must differ from Seller Partner ID
  const sellerId = Number((Deno.env.get("SHOPEE_PARTNER_ID") || "").trim());
  if (adsId === sellerId) {
    throw new Error(`SHOPEE_ADS_PARTNER_ID (${adsId}) é igual ao SHOPEE_PARTNER_ID (${sellerId}). Configure o Partner ID correto do app de Ads.`);
  }
  return { partnerId: adsId, partnerKey: envKey };
}

export function getSellerCredentials(): ShopeeCredentials {
  return { partnerId: PARTNER_ID, partnerKey: getPartnerKey() };
}

export function getCredentialsForAppType(appType: string): ShopeeCredentials {
  return appType === 'ads' ? getAdsCredentials() : getSellerCredentials();
}

export async function getCredentialsDiagnostics(
  appType: string,
  creds?: ShopeeCredentials
) {
  const resolved = creds ?? getCredentialsForAppType(appType);

  return {
    app_type: appType === 'ads' ? 'ads' : 'seller',
    host: SHOPEE_HOST,
    partner_id: resolved.partnerId,
    key_fingerprint: await getSecretFingerprint(resolved.partnerKey),
    key_length: resolved.partnerKey.trim().length,
  };
}

// ─── Original helpers (default to seller credentials) ────────────────

/**
 * Official Shopee API v2 HMAC-SHA256 signing.
 */
export async function generateSign(
  path: string,
  timestamp: number,
  accessToken?: string,
  shopId?: number | string
): Promise<string> {
  return generateSignWith(PARTNER_ID, getPartnerKey(), path, timestamp, accessToken, shopId);
}

export const hmacSign = generateSign;

/**
 * Build the Shopee OAuth authorization URL.
 */
export async function getAuthUrl(redirectUrl: string, partnerId?: number, partnerKey?: string): Promise<string> {
  const pid = partnerId ?? PARTNER_ID;
  const pkey = partnerKey ?? getPartnerKey();
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSignWith(pid, pkey, path, timestamp);

  const params = new URLSearchParams({
    partner_id: String(pid),
    timestamp: String(timestamp),
    sign,
    redirect: redirectUrl,
  });

  return `${SHOPEE_HOST}${path}?${params.toString()}`;
}

/**
 * Make a GET request to a Shopee API endpoint with proper signing (seller credentials).
 */
export async function shopeeGet(
  path: string,
  accessToken: string,
  shopId: string | number,
  extraParams: Record<string, string> = {}
) {
  return shopeeGetWith(PARTNER_ID, getPartnerKey(), path, accessToken, shopId, extraParams);
}

/**
 * Make a POST request to a Shopee API endpoint with proper signing (seller credentials).
 */
export async function shopeePost(
  path: string,
  accessToken: string,
  shopId: string | number,
  body: Record<string, unknown> = {}
) {
  return shopeePostWith(PARTNER_ID, getPartnerKey(), path, accessToken, shopId, body);
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
