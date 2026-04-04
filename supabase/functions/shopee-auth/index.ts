import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  getAuthUrl,
  getCredentialsForAppType,
  getCredentialsDiagnostics,
} from "../_shared/shopee.ts";

type AuthUrlValidationResult =
  | { ok: true; status: number; contentType: string; location?: string | null }
  | { ok: false; status: number; code: string; message: string };

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function getFriendlyAuthError(appType: string, code: string) {
  const appLabel = appType === "ads" ? "Ads" : "Seller";

  if (code === "error_sign" || code === "wrong_sign") {
    return `A chave da Shopee ${appLabel} está inválida ou não corresponde ao app configurado.`;
  }

  if (code === "auth_url_unavailable" || code === "auth_preflight_failed") {
    return `A Shopee não aceitou iniciar a autorização de ${appLabel}. Tente novamente em instantes.`;
  }

  return `A Shopee rejeitou a autorização de ${appLabel}.`;
}

async function validateAuthUrl(authUrl: string): Promise<AuthUrlValidationResult> {
  const res = await fetch(authUrl, {
    method: "GET",
    redirect: "manual",
  });
  const contentType = res.headers.get("content-type") || "";
  const location = res.headers.get("location");
  const bodyText = await res.text();
  const looksJson = contentType.includes("application/json") || bodyText.trim().startsWith("{");

  if (location || REDIRECT_STATUSES.has(res.status)) {
    return { ok: true, status: res.status, contentType, location };
  }

  if (looksJson) {
    try {
      const payload = JSON.parse(bodyText) as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string") {
        return {
          ok: false,
          status: res.status || 400,
          code: payload.error,
          message: typeof payload.message === "string" ? payload.message : "Shopee auth error",
        };
      }
    } catch {
      // ignore malformed JSON and fall through to generic handling
    }
  }

  if (res.ok && (contentType.includes("text/html") || bodyText.toLowerCase().includes("<html"))) {
    return { ok: true, status: res.status, contentType, location };
  }

  return {
    ok: false,
    status: res.status || 502,
    code: "auth_url_unavailable",
    message: bodyText.slice(0, 200) || `Unexpected Shopee auth response (${res.status})`,
  };
}

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

    // Read app_type from body (default: 'seller')
    let appType = 'seller';
    try {
      if (req.method === "POST" || req.headers.get("content-type")?.includes("json")) {
        const body = await req.json().catch(() => ({}));
        if (body?.app_type === 'ads' || body?.app_type === 'seller') {
          appType = body.app_type;
        }
      }
    } catch { /* ignore */ }

    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      return errorResponse("APP_URL not configured", 500);
    }

    // Generate a state token and save it linked to this user + app_type
    const state = crypto.randomUUID();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: stateError } = await supabaseAdmin
      .from("shopee_auth_states")
      .insert({ user_id: user.id, state, app_type: appType });

    if (stateError) {
      console.error("[SHOPEE AUTH] State insert error:", stateError);
      return errorResponse("Failed to create auth state", 500);
    }

    // Use credentials for the correct app type
    let creds;
    try {
      creds = getCredentialsForAppType(appType);
    } catch (credErr) {
      console.error(`[SHOPEE AUTH] Credential error for app_type=${appType}:`, (credErr as Error).message);
      return errorResponse(`Erro de configuração: ${(credErr as Error).message}`, 500);
    }
    const callbackWithState = `${appUrl}/shopee-callback?state=${state}`;
    const authUrl = await getAuthUrl(callbackWithState, creds.partnerId, creds.partnerKey);
    const diagnostics = await getCredentialsDiagnostics(appType, creds);
    let authCheck: AuthUrlValidationResult;

    try {
      authCheck = await validateAuthUrl(authUrl);
    } catch (authErr) {
      console.error(
        "[SHOPEE AUTH] Preflight request failed:",
        JSON.stringify({
          ...diagnostics,
          error: (authErr as Error).message,
        })
      );

      return jsonResponse(
        {
          error: "auth_preflight_failed",
          message: getFriendlyAuthError(appType, "auth_preflight_failed"),
        },
        502
      );
    }

    if (!authCheck.ok) {
      console.error(
        "[SHOPEE AUTH] Auth URL rejected:",
        JSON.stringify({
          ...diagnostics,
          shopee_error: authCheck.code,
          shopee_message: authCheck.message,
          status: authCheck.status,
        })
      );

      return jsonResponse(
        {
          error: authCheck.code,
          message: getFriendlyAuthError(appType, authCheck.code),
        },
        400
      );
    }

    console.log(`[SHOPEE AUTH] Generated auth URL for app_type=${appType}, partner_id=${creds.partnerId}`);
    console.log(
      "[SHOPEE AUTH] Diagnostics:",
      JSON.stringify({
        ...diagnostics,
        validation_status: authCheck.status,
        validation_content_type: authCheck.contentType || null,
      })
    );

    return jsonResponse({ auth_url: authUrl });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
