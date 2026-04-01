

## Plano: Corrigir assinatura do token/get da Shopee

### Causa raiz

O erro `error_sign` (Wrong sign) acontece porque o `shopee-callback` está incluindo o `shop_id` no cálculo da assinatura para o endpoint `/api/v2/auth/token/get`.

Segundo a documentação da Shopee, o endpoint de troca de token (`/api/v2/auth/token/get`) **não inclui** `shop_id` nem `access_token` na base string da assinatura. A base string correta é apenas:

```text
partner_id + path + timestamp
```

Hoje o código faz:
```typescript
const sign = await generateSign(path, timestamp, undefined, Number(shopId));
// Gera: 2032223/api/v2/auth/token/get1775008945438579808  ← ERRADO
```

O correto é:
```typescript
const sign = await generateSign(path, timestamp);
// Gera: 2032223/api/v2/auth/token/get1775008945  ← CORRETO
```

### Alteração

**Arquivo:** `supabase/functions/shopee-callback/index.ts`

Remover o `shopId` da chamada `generateSign` na linha do token exchange. Mudar de:
```typescript
const sign = await generateSign(path, timestamp, undefined, Number(shopId));
```
Para:
```typescript
const sign = await generateSign(path, timestamp);
```

O `shop_id` continua sendo enviado no **body** do POST (isso está correto), apenas não participa da assinatura neste endpoint específico.

### Nenhuma outra alteração necessária

- O `shopee-auth` (auth_partner) já assina corretamente sem shop_id
- O `shopee-sync` (refresh + get_shop_campaigns) usa shop_id na assinatura corretamente, pois são endpoints autenticados

