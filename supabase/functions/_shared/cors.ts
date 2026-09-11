// Shared CORS configuration with origin whitelist.
// Falls back to "*" only if ALLOWED_ORIGIN is not configured (dev mode).

const DEFAULT_ALLOWED = [
  "https://app.skalify.com.br",
  "https://escala-calculadora.lovable.app",
  "https://id-preview--663ad348-e18a-4674-a7c5-186feeae7832.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, x-webhook-secret, x-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function getWhitelist(): string[] {
  const fromEnv = (Deno.env.get("ALLOWED_ORIGIN") || "").trim();
  // ALLOWED_ORIGIN can be a single origin or comma-separated list.
  // Ignore malformed values (anything that is not an http(s) origin).
  const extra = fromEnv
    .split(",")
    .map((o) => o.trim())
    .filter((o) => /^https?:\/\/[^\s,]+$/i.test(o));
  return [...new Set([...DEFAULT_ALLOWED, ...extra])];
}

/**
 * Build CORS headers for a request, validating the Origin header against the whitelist.
 * If the origin is not whitelisted, falls back to the first allowed origin (so browsers reject the response).
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const whitelist = getWhitelist();

  // Match exact, or allow Lovable preview subdomains for sandbox testing
  const isAllowed =
    whitelist.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(origin);

  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": isAllowed ? origin : whitelist[0] || "null",
  };
}

/**
 * Static fallback for code paths without access to the Request object.
 * These endpoints authenticate via the Authorization header (never cookies),
 * so a wildcard origin does not expose credentialed data.
 */
export const corsHeadersStatic: Record<string, string> = {
  ...BASE_HEADERS,
  "Access-Control-Allow-Origin": "*",
};
