import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPEE_PARTNER_ID = 1231044;

async function hmacSign(path: string, timestamp: number, accessToken = "", shopId = ""): Promise<string> {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    if (!code || !shopId) {
      return new Response("Missing code or shop_id", { status: 400, headers: corsHeaders });
    }

    const partnerId = getPartnerId();
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await hmacSign(path, timestamp);

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        shop_id: Number(shopId),
        partner_id: partnerId,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Shopee token error:", tokenData);
      const appUrl = Deno.env.get("APP_URL") || "https://escala-calculadora.lovable.app";
      return Response.redirect(`${appUrl}/roas?shopee_error=token_failed`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    const adminUserId = adminRoles?.[0]?.user_id;
    if (!adminUserId) {
      const appUrl = Deno.env.get("APP_URL") || "https://escala-calculadora.lovable.app";
      return Response.redirect(`${appUrl}/roas?shopee_error=no_admin`, 302);
    }

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(
        {
          user_id: adminUserId,
          shop_id: Number(shopId),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expire_in: tokenData.expire_in || 0,
          token_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,shop_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    const appUrl = Deno.env.get("APP_URL") || "https://escala-calculadora.lovable.app";
    return Response.redirect(`${appUrl}/roas?shopee_connected=true`, 302);
  } catch (e) {
    console.error("Callback error:", e);
    const appUrl = Deno.env.get("APP_URL") || "https://escala-calculadora.lovable.app";
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
