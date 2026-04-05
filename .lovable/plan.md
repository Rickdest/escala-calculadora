

## Diagnóstico

O código **já constrói a URL corretamente** com `partner.shopeemobile.com/api/v2/shop/auth_partner` — não está chamando nenhum endpoint da Shopee para "gerar" a URL. A URL é montada localmente com `partner_id`, `timestamp`, `sign` e `redirect`.

O problema real é o **preflight validation** (`validateAuthUrl`): antes de entregar a URL ao usuário, o backend faz um `GET` na URL de OAuth. Isso:
1. Consome a sessão/estado no lado da Shopee antes do browser do usuário chegar lá
2. Pode invalidar o `sign`/`timestamp` porque a Shopee registra o primeiro acesso
3. Explica porque Ads funciona (por acidente, reutiliza sessão existente) e Seller não (precisa de sessão limpa que já foi "gasta" pelo preflight)

## Plano

### 1. Remover o preflight validation do `shopee-auth`
Eliminar a chamada `validateAuthUrl` que faz GET na URL antes de entregá-la ao usuário. A URL é construída localmente com HMAC válido — não precisa de validação prévia. Se der erro, o usuário verá na Shopee e pode tentar de novo.

### 2. Simplificar o retorno
Após construir a URL com `getAuthUrl`, retornar diretamente `{ auth_url }` sem o passo de verificação. Manter apenas o log de diagnóstico.

### 3. Limpar código morto
Remover a função `validateAuthUrl`, o type `AuthUrlValidationResult`, e a função `getFriendlyAuthError` que só eram usadas pelo preflight.

## Arquivo modificado
- `supabase/functions/shopee-auth/index.ts` — remover preflight, simplificar fluxo

## Sem migration

