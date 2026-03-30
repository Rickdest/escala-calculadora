import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getPartnerId(): number {
  const raw = (Deno.env.get("SHOPEE_PARTNER_ID") || "").trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`SHOPEE_PARTNER_ID is not a valid integer: "${raw}"`);
  }
  const id = parseInt(raw, 10);
  if (id < 0 || id > 4294967295) {
    throw new Error(`SHOPEE_PARTNER_ID out of range: ${id}`);
  }
  return id;
}

async function hmacSign(path: string, timestamp: number, accessToken: string, shopId: string): Promise<string> {
  const partnerId = getPartnerId();
  const partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY")!;
  const baseStr = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(partnerKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseStr));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function shopeeGet(path: string, accessToken: string, shopId: string, extraParams: Record<string, string> = {}) {
  const partnerId = getPartnerId();
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await hmacSign(path, timestamp, accessToken, shopId);

  let url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;
  for (const [k, v] of Object.entries(extraParams)) {
    url += `&${k}=${encodeURIComponent(v)}`;
  }

  const res = await fetch(url);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const userId = user.id;

    const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { data: tokens } = await supabase
      .from("shopee_tokens")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "No Shopee token found. Connect your shop first." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const shopeeToken = tokens[0];
    const shopId = String(shopeeToken.shop_id);
    const accessToken = shopeeToken.access_token;

    const tokenAge = (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;
    let currentAccessToken = accessToken;

    if (tokenAge > (shopeeToken.expire_in - 300)) {
      const partnerId = getPartnerId();
      const partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY")!;
      const refreshPath = "/api/v2/auth/access_token/get";
      const timestamp = Math.floor(Date.now() / 1000);
      const baseStr = `${partnerId}${refreshPath}${timestamp}`;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(partnerKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseStr));
      const sign = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const refreshUrl = `${SHOPEE_HOST}${refreshPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: shopeeToken.refresh_token,
          shop_id: Number(shopId),
          partner_id: partnerId,
        }),
      });

      const refreshData = await refreshRes.json();
      if (refreshData.access_token) {
        currentAccessToken = refreshData.access_token;

        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
      }
    }

    const adsData = await shopeeGet(
      "/api/v2/marketing/get_shop_campaigns",
      currentAccessToken,
      shopId
    );

    return new Response(
      JSON.stringify({
        success: true,
        shop_id: shopId,
        ads_response: adsData,
        message: "Sync completed. Check ads_response for raw data from Shopee API.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
