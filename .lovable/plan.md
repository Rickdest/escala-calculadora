

## Plano: Corrigir falso positivo de token expirado

### Causa raiz
1. **Backend**: margem de refresh de 24h (86400s) é maior que o tempo de vida do access token (14400s = 4h), então a condição `tokenAge <= expire_in - 86400` nunca é satisfeita → sempre tenta refresh → se falha = `needs_reauth: true`
2. **Frontend**: checagem local `tokenAge > expire_in` marca "Expirado" após 4h, ignorando que o backend renova automaticamente

### Correções

#### 1. Backend: margem de refresh correta
Em `shopee-ads/index.ts` e `shopee-sync/index.ts`, trocar a margem de 24h para 5 minutos (300s):
```
// ANTES (bugado):
if (tokenAge <= shopeeToken.expire_in - 86400)

// DEPOIS:
if (tokenAge <= shopeeToken.expire_in - 300)
```
Isso faz o refresh acontecer só nos últimos 5 minutos de vida do access token — silencioso e automático.

#### 2. Frontend: remover checagem local de expiração
Em `useShopeeToken.ts`, remover o cálculo de `tokenAge` e basear `isExpired` **apenas** no flag `needsReauth` (que só é setado quando o backend realmente falha ao renovar):
```typescript
// ANTES:
const tokenAge = (Date.now() - new Date(token.token_created_at).getTime()) / 1000;
return tokenAge > (token.expire_in || 14400);

// DEPOIS:
return false; // só needsReauth (vindo do backend) importa
```

### Arquivos modificados
```
supabase/functions/shopee-ads/index.ts    — margem 300s
supabase/functions/shopee-sync/index.ts   — mesma correção
src/hooks/useShopeeToken.ts               — remover checagem local
```

### Resultado
- O refresh automático funciona silenciosamente a cada ~4h
- O alerta "Expirado / Reconectar" só aparece quando o refresh token de 365 dias realmente expira
- O usuário não precisa reconectar manualmente no uso normal

