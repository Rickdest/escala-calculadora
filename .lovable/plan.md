

## Fix: Login funciona no Lovable mas nao em outros dispositivos

### Diagnostico

A Edge Function `check-subscription` tem uma lista de origens CORS permitidas que NAO inclui o dominio customizado `app.richardaragao.com.br`. 

Quando o usuario acessa pelo Lovable preview (`.lovable.app`), a regex aceita. Quando acessa pelo dominio customizado, o CORS bloqueia a resposta da Edge Function, o `checkSubscription` falha, e o fallback seta `status: 'expired'` → mostra o paywall.

### Correcao

**`supabase/functions/check-subscription/index.ts`** — Adicionar o dominio customizado na lista de origens E na regex de fallback:

```typescript
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") || "https://escala-calculadora.lovable.app",
  "https://id-preview--663ad348-e18a-4674-a7c5-186feeae7832.lovable.app",
  "https://app.richardaragao.com.br",
];
```

E atualizar a regex para tambem aceitar `richardaragao.com.br`:

```typescript
(/\.lovableproject\.com$|\.lovable\.app$|\.richardaragao\.com\.br$/.test(...))
```

Tambem atualizar o secret `ALLOWED_ORIGIN` para o dominio principal atual.

### Arquivo alterado
- `supabase/functions/check-subscription/index.ts` — 2 linhas alteradas

