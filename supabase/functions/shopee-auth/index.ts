import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  SHOPEE_PARTNER_ID,
  corsHeaders,
  hmacSign,
  errorResponse,
  jsonResponse,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _role: "admin",
    });
    if (!isAdmin) {
      return errorResponse("Admin only", 403);
    }

    const { redirect_url } = await req.json();
    if (!redirect_url) {
      return errorResponse("redirect_url required");
    }

    const path = "/api/v2/shop/auth_partner";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await hmacSign(path, timestamp);

    const authUrl = `${SHOPEE_HOST}${path}?partner_id=${SHOPEE_PARTNER_ID}&redirect=${encodeURIComponent(redirect_url)}&timestamp=${timestamp}&sign=${sign}`;

    console.log("Generated auth_url with partner_id:", SHOPEE_PARTNER_ID);

    return jsonResponse({ auth_url: authUrl });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
