

## Diagnóstico definitivo (com evidência atualizada)

Cruzei logs do servidor com o código atual:

1. **Banco está perfeito** para os 3 testers: Richard (`active pro`), Pedro (`active yearly`, válido até abr/2027), Junior (`active pro`).
2. **O servidor responde corretamente quando recebe POST**: log único confirmado às 16:32 — `POST | 200 | execution_time_ms: 1231` retornando `active pro`.
3. **Os logs mostram que requisições do cliente em produção AINDA estão indo com `?_t=...` na URL**, o que prova que a versão publicada ainda é a antiga (com `supabase.functions.invoke('check-subscription?_t=...')` que quebra o POST). A correção em `billing.service.ts` foi feita no código mas **nunca chegou em `app.skalify.com.br`**.
4. **Mesmo após publicar**, o `SubscriptionContext` tem 2 bugs latentes que podem prender o usuário em loading/paywall:
   - **Re-render por `accessToken`** dispara nova chamada que aborta a anterior antes do POST sair, e o `useEffect` reage a cada nova referência do `fetchSubscription` (recriado pelo `useCallback` quando `accessToken` muda — o que acontece em refresh silencioso de token do Supabase, comum em PWA/mobile).
   - **`finally` roda mesmo em chamadas abortadas/superseded**, setando `setLoading(false)` e `hasResolved = true` enquanto o `status` continua `'loading'`. O `ProtectedRoute` vê `subLoading=false, status='loading'` e fica num PageLoader silencioso ou cai pro paywall na próxima reação.

## Plano de correção

### 1. Publicar o build atual (pré-requisito)

A correção crítica do `billing.service.ts` (fetch nativo sem `?_t=`) já está em código. Ela só vai resolver os usuários quando for publicada em `app.skalify.com.br` e os celulares forem recarregados (PWA cache).

### 2. Corrigir race condition no `SubscriptionContext`

**`src/contexts/SubscriptionContext.tsx`** — duas mudanças cirúrgicas:

**a) Estabilizar `fetchSubscription` por refs.**
- Trocar `useCallback` que depende de `accessToken/userId` por uma função que **lê os valores via `useRef`**. A função em si fica estável (zero dependências) e nunca é recriada.
- O `useEffect` passa a depender de `[userId, accessToken, authReady, authLoading]` diretamente, **não da referência da função**. Assim a chamada só dispara quando uma dessas coisas realmente mudar de valor — não a cada render.
- Resultado: refresh silencioso de token NÃO dispara nova chamada que aborta a anterior. A subscription é resolvida uma vez por sessão e fica estável.

**b) Não tocar em `loading`/`hasResolved` em chamadas abortadas-superseded.**
- No `finally`, **só** rodar `setLoading(false); hasResolved=true` se `inflightController.current === controller` (ou seja, esta chamada ainda é a vigente).
- Se a chamada foi superseded, sair do `finally` sem mexer em nenhum estado React. A nova chamada cuida de finalizar.

### 3. Logs visíveis no console

Os logs com prefixo `[subscription]` já estão no código. Manter — vão revelar exatamente o caminho percorrido caso ainda haja problema após o publish.

### 4. Botão "Verificar acesso" no paywall

Já existe (`refreshSubscription` no `Paywall.tsx`). Como rede de segurança, garantir que ele force `noCache=true` (já está). Sem mudança necessária.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/contexts/SubscriptionContext.tsx` | Estabilizar `fetchSubscription` via refs; corrigir `finally` para não tocar em estado quando a chamada foi abortada/superseded |

### Por que isso resolve

- ✅ Após **publicar**, o POST chega ao servidor e retorna `active` em ~1.2s (já validado nos logs).
- ✅ Sem race condition, o cliente recebe e seta `status='active'` de forma estável.
- ✅ Cache local de 1h (já implementado) garante que mesmo se houver hiccup de rede futuro, o usuário não vê paywall.
- ✅ Logs de console permitem diagnóstico imediato se surgir caso edge.

### O que o usuário precisa fazer após a correção

1. Eu aplico o fix no `SubscriptionContext.tsx`.
2. **Publicar a versão** (botão Publish).
3. No celular: **fechar totalmente o app** (force quit), abrir novamente. O Service Worker vai pegar o novo build.
4. Em desktop: hard refresh (Ctrl+Shift+R / Cmd+Shift+R) ou abrir em aba anônima para testar.

### Trade-offs

- ⚠️ A mudança do `useCallback` pra refs é uma alteração arquitetural pequena no contexto, mas é o padrão correto para callbacks que precisam ler estado sem retriggar effects.
- ⚠️ Após o publish, usuários que já estavam com cache antigo no localStorage de outro user_id verão paywall até clicar em "Já assinei → Verificar acesso" (1 clique). Aceitável.

