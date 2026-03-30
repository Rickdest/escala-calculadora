

## Fix: Shopee API usando URL de sandbox para credenciais de teste

### Problema
As credenciais fornecidas são **Test Partner ID** e **Test Partner Key** da Shopee. O ambiente de teste exige o host `partner.test-stable.shopeemobile.com`, mas as Edge Functions estão usando o host de produção `partner.shopeemobile.com`.

### Solução
Atualizar as 3 Edge Functions para usar o host correto de sandbox:

**1. `shopee-auth/index.ts`**
- Trocar `https://partner.shopeemobile.com` por `https://partner.test-stable.shopeemobile.com`

**2. `shopee-callback/index.ts`**  
- Trocar o host na chamada de token (`/api/v2/auth/token/get`)

**3. `shopee-sync/index.ts`**
- Trocar o host na função `shopeeGet` e no refresh de token

### Também corrigir: método `getClaims`
O método `supabase.auth.getClaims()` não existe no supabase-js v2. Substituir por `supabase.auth.getUser()` nas funções `shopee-auth` e `shopee-sync` para evitar erros silenciosos.

### Arquivos modificados
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`
- `supabase/functions/shopee-sync/index.ts`

### Nota futura
Quando a integração for aprovada para produção, basta trocar o host de volta para `partner.shopeemobile.com`.

