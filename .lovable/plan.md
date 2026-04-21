

## Diagnóstico definitivo

Comparando logs do servidor com o comportamento do cliente:

- **Banco está perfeito**: `pedro.altoson@gmail.com` → `status=active, plan=yearly, válido até 21/abr/2027`
- **Edge function responde corretamente** quando recebe POST: log mostra `Found by user_id: active yearly`
- **MAS**: nas últimas dezenas de invocações, o servidor recebeu **só requests OPTIONS** (preflight CORS) — nenhum POST. O cliente faz o preflight, ele responde 200, mas o POST seguinte **nunca chega** ao servidor.

**Causa raiz**: o `SubscriptionContext` tem 3 problemas combinados que se manifestam principalmente em **PWA/mobile/cold start**:

1. **Header `Cache-Control: no-cache` no body do request** (não no preflight). Em iOS Safari/PWA, isso força o navegador a refazer o preflight a cada chamada — e quando o `Promise.race` com timeout 15s rejeita antes do POST sair, o request é descartado pelo navegador mas o servidor já recebeu o OPTIONS.

2. **`Promise.race` com timeout** que rejeita o `fetch` mas não o aborta de verdade. Quando a função é re-chamada (por mudança de `accessToken` ou re-render), o request anterior fica órfão e o novo entra em race condition.

3. **Recriação do `fetchSubscription` callback** a cada mudança de dependência — em sessões PWA com refresh de token, isso dispara múltiplas chamadas concorrentes que cancelam umas às outras.

O resultado: usuário **com assinatura ativa válida no banco** cai no paywall porque o cliente nunca consegue receber a resposta `active`.

## Plano de correção

### 1. Reescrever `fetchSubscription` com `AbortController` real

**`src/contexts/SubscriptionContext.tsx`**:
- Substituir `Promise.race + setTimeout` por `AbortController` com `signal` passado pro fetch (aborta o request de verdade, não fica órfão).
- Manter ref do controller anterior — antes de iniciar nova chamada, abortar a anterior. Elimina race conditions.
- Aumentar timeout pra **20s** (cold start de PWA mobile pode passar de 15s).

### 2. Remover header problemático `Cache-Control: no-cache`

**`src/services/billing.service.ts`**:
- Remover o header `Cache-Control: no-cache` quando `noCache=true`.
- Substituir por **query param** `?_t=${Date.now()}` que invalida cache HTTP do browser sem afetar CORS preflight.
- O servidor já responde com `Cache-Control: private, max-age=15` — basta o cache-buster pra forçar revalidação.

### 3. Adicionar logs de diagnóstico no client

**`src/contexts/SubscriptionContext.tsx`**:
- Logar (via `console.log`) cada decisão crítica: início da chamada, sucesso (com status retornado), erro (com mensagem), retry, fallback final.
- Esses logs ficam visíveis pro usuário no DevTools — e eu consigo lê-los na próxima rodada se o problema persistir.

### 4. Cache local persistente como rede de segurança

**`src/contexts/SubscriptionContext.tsx`**:
- Quando receber `status=active`, salvar `{ userId, status, plan, ts }` em `localStorage` (TTL de 1 hora).
- No início do `fetchSubscription`, ler o cache local. Se for válido **e do mesmo `userId`**, definir `status=active` **imediatamente** enquanto a chamada acontece em background.
- Isso elimina o "fica no paywall enquanto espera o servidor" pra usuário recorrente.

### 5. Tratar `error` retornado pelo `supabase.functions.invoke`

**`src/services/billing.service.ts`**:
- O `supabase.functions.invoke` retorna `{ data, error }` — atualmente jogamos uma exception genérica em qualquer `error`.
- Diferenciar: se `error.context?.status === 401/403` → token inválido, retorna `expired`; se `error` por timeout/network → re-throw para retry; se `data` chegou mas é vazio → tratar como `expired`.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/contexts/SubscriptionContext.tsx` | Substituir Promise.race por AbortController; cache em localStorage; logs de diagnóstico; aumentar timeout pra 20s |
| `src/services/billing.service.ts` | Remover header Cache-Control; usar cache-buster em query param; tratar error.context para 401 vs network |

### Trade-offs

- ✅ Elimina race condition que está causando o request POST nunca chegar
- ✅ Cache local resolve o problema "instantaneamente" pra usuários recorrentes (PWA mobile)
- ✅ Logs vão revelar exatamente o que está acontecendo se ainda persistir
- ✅ Não muda nada no servidor — fix puro no cliente
- ⚠️ Cache local de 1h significa que se o admin cancelar uma assinatura, o usuário pode ter até 1h de acesso "fantasma" — aceitável (o backend ainda valida em todas as escritas via RLS `has_active_subscription()`)
- ⚠️ Não resolve o caso do servidor estar genuinamente fora — mas aí o paywall já é a UX correta

