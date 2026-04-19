// Shared structured logger with automatic redaction for Edge Functions.
// Usage: const log = createLogger("SHOPEE CALLBACK"); log.info("event", { ... });

const REDACT_KEYS = new Set([
  "access_token",
  "refresh_token",
  "partner_key",
  "shopee_key",
  "shopee_ads_key",
  "cakto_webhook_secret",
  "secret",
  "password",
  "authorization",
  "token",
]);

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  return `${value[0]}***${value.slice(at)}`;
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    // Mask emails embedded in plain strings
    return value.replace(/[\w.+-]+@[\w.-]+/g, (m) => maskEmail(m));
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (REDACT_KEYS.has(lower)) {
        out[k] = "[REDACTED]";
      } else if (lower === "email" && typeof v === "string") {
        out[k] = maskEmail(v);
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

export type Logger = {
  info: (event: string, ctx?: Record<string, unknown>) => void;
  warn: (event: string, ctx?: Record<string, unknown>) => void;
  error: (event: string, ctx?: Record<string, unknown>) => void;
};

export function createLogger(scope: string): Logger {
  const emit = (level: "INFO" | "WARN" | "ERROR", event: string, ctx?: Record<string, unknown>) => {
    const payload = ctx ? ` ${JSON.stringify(redact(ctx))}` : "";
    const line = `[${scope}] ${level} ${event}${payload}`;
    if (level === "ERROR") console.error(line);
    else if (level === "WARN") console.warn(line);
    else console.log(line);
  };
  return {
    info: (event, ctx) => emit("INFO", event, ctx),
    warn: (event, ctx) => emit("WARN", event, ctx),
    error: (event, ctx) => emit("ERROR", event, ctx),
  };
}
