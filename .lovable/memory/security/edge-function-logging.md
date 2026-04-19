---
name: Edge Function Structured Logging
description: Logger compartilhado supabase/functions/_shared/logger.ts com redaction automática de tokens, segredos e emails
type: preference
---

Edge Functions devem usar `createLogger("SCOPE")` de `supabase/functions/_shared/logger.ts` em vez de `console.log/error` diretos.

O logger:
- Redige automaticamente: `access_token`, `refresh_token`, `partner_key`, `shopee_key`, `shopee_ads_key`, `cakto_webhook_secret`, `secret`, `password`, `authorization`, `token`.
- Mascara emails (em campos `email` e dentro de strings).
- Emite linhas estruturadas: `[SCOPE] LEVEL event {ctx_json}`.

**Why:** evitar vazamento acidental de credenciais em logs do Lovable Cloud.
**How to apply:** ao criar/editar edge function, importar o logger; nunca passar payloads de API completos sem revisar os campos sensíveis.
