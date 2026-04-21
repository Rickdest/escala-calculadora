

## Diagnóstico definitivo (com evidência)

Verifiquei o banco e os logs do servidor:

**Banco:** Todos os 3 usuários (Richard, Pedro, Junior) têm `status=active` corretamente.

**Logs do servidor:** Os últimos 50 requests à edge `check-subscription` são **todos OPTIONS** (preflight CORS) com URLs como `?_t=1776788856429`. **Zero POSTs chegaram nas últimas 4 horas.** O último POST bem-sucedido foi do `junior_rsmf@icloud.com`, que provavelmente está rodando uma versão sem o cache-buster ou tem cache local persistente.

**Causa raiz**: na correção anterior, mudei `supabase.functions.invoke('check-subscription?_t=12345')`. O SDK do Supabase **não aceita query strings dentro do nome da função** — ele faz o preflight OPTIONS na URL com `?_t=...` (servidor responde 200), mas o POST seguinte fica malformado e nunca chega ao servidor. O cliente recebe `error` → vai pro retry → todos retries falham → status vira `expired` → paywall.

**Resultado**: 100% dos usuários (incluindo admin) caem no paywall por bug do client.

## Plano de correção

### 1. Reverter o cache-buster por query string

**`src/services/billing.service.ts`**:
- Remover `?_t=${Date.now()}` do path do `invoke`. O SDK não suporta isso — ele já faz o request POST direto sem precisar de cache-buster, porque é um POST com `Authorization` único por sessão.
- Para forçar bypass de cache quando `noCache=true`, usar a API nativa `fetch` direto pra URL da edge function (não pelo `invoke`), com `cache: 'no-store'` na opção do fetch — isso é seguro pra CORS porque é opção do client, não header.

### 2. Substituir `supabase.functions.invoke` por `fetch` direto

**`src/services/billing.service.ts`**:
- Construir a URL: `${VITE_SUPABASE_URL}/functions/v1/check-subscription`
- Fazer `fetch(url, { method: 'POST', headers: { Authorization: 'Bearer <token>', apikey: <publishable_key>, 'Content-Type': 'application/json' }, body: '{}', signal, cache: noCache ? 'no-store' : 'default' })`.
- Isso elimina a camada do SDK que estava quebrando, e dá controle total sobre o request. O preflight CORS continua funcionando (já está configurado no servidor).
- Tratar `response.status` diretamente: 401/403 → retorna `expired`; 5xx/network → throw para retry.

### 3. Manter o restante do `SubscriptionContext` como está

- `AbortController`, cache local, retries, fail-safe pra `expired` — tudo isso já está correto e foi validado.
- A única mudança é o `billing.service.ts`.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/services/billing.service.ts` | Trocar `supabase.functions.invoke(path, ...)` por `fetch` nativo direto na URL da edge function. Remover o cache-buster de query string. Usar `cache: 'no-store'` quando `noCache=true`. |

### Por que isso resolve

- ✅ Elimina o bug do query string no `invoke`
- ✅ POST chega ao servidor com payload correto
- ✅ Servidor responde `active` → cliente recebe → user vai pro app
- ✅ Pedro, Richard e qualquer usuário ativo deixam de cair no paywall

### Trade-offs

- ⚠️ Não usa mais o helper `invoke` nessa função, mas isso é OK — outras funções continuam usando normalmente
- ⚠️ Precisa importar a `VITE_SUPABASE_PUBLISHABLE_KEY` (já disponível em `import.meta.env`)

