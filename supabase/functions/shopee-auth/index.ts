import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHOPEE_HOST = "https://partner.test-stable.shopeemobile.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPEE_PARTNER_ID = 1231044;

async function hmacSign(path: string, timestamp: number): Promise<string> {
  const partnerId = SHOPEE_PARTNER_ID;
  const partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY")!;
  const baseStr = `${partnerId}${path}${timestamp}`;
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

    const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const partnerId = SHOPEE_PARTNER_ID;
    const { redirect_url } = await req.json();
    if (!redirect_url) {
      return new Response(JSON.stringify({ error: "redirect_url required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const path = "/api/v2/shop/auth_partner";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await hmacSign(path, timestamp);

    const authUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&redirect=${encodeURIComponent(redirect_url)}&timestamp=${timestamp}&sign=${sign}`;

    console.log("Generated auth_url with partner_id:", partnerId);

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
