

## Substituir loop manual por `crypto.subtle.timingSafeEqual`

### Arquivo: `supabase/functions/cakto-webhook/index.ts`

**Linhas 55-61** — Substituir o bloco de comparação manual:

```typescript
// ANTES (loop manual)
const encoder = new TextEncoder();
const a = encoder.encode(String(secret));
const b = encoder.encode(CAKTO_WEBHOOK_SECRET);
let match = a.length === b.length;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if ((a[i] ?? 0) !== (b[i] ?? 0)) match = false;
}
if (!match) { ...

// DEPOIS (nativo Deno)
const encoder = new TextEncoder();
const receivedBytes = encoder.encode(String(secret));
const expectedBytes = encoder.encode(CAKTO_WEBHOOK_SECRET);
const isValid = receivedBytes.length === expectedBytes.length &&
  crypto.subtle.timingSafeEqual(receivedBytes, expectedBytes);
if (!isValid) { ...
```

Nenhuma outra alteração — CORS, maskEmail, logs, lógica de eventos e audit log permanecem idênticos.

### Sobre o alerta do scanner
Após deploy, ignorar o alerta "Webhook Secret Validated via Body-Embedded Shared Secret" no painel — é limitação da Cakto, não do código.

