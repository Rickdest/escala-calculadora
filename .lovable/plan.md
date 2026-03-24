

## Fix: Flash de TrialExpiredBlock ao fazer login (race condition)

### Diagnostico

O usuario `richard.aragao@outlook.com` tem trial valido (ate 26/03) na tabela profiles. A Edge Function retorna `trialing` corretamente. Porem ha uma **race condition**:

1. `onAuthStateChange` dispara com sessao nula (INITIAL_SESSION) → AuthContext seta `loading=false`, `user=null`
2. SubscriptionContext ve `user=null` → seta `status='free'`, `loading=false`
3. ProtectedRoute ve `!isActive && status !== 'loading'` → mostra **TrialExpiredBlock**
4. Depois `getSession()` resolve com sessao real → busca subscription → `trialing` → tela correta

O usuario ve o paywall por 1-2 segundos antes da tela correta carregar.

### Correcao

**`src/contexts/SubscriptionContext.tsx`** — Nao setar status quando auth ainda esta carregando

- Importar `loading` do `useAuth()`
- Quando `loading` do auth for true, manter status como `'loading'` e nao chamar fetchSubscription
- Isso garante que o ProtectedRoute mostra o spinner ate auth + subscription resolverem

```typescript
const { user, session, loading: authLoading } = useAuth();

const fetchSubscription = useCallback(async (noCache = false) => {
  if (authLoading) return; // auth still loading, don't decide yet
  if (!user || !session?.access_token) {
    setStatus('free');
    ...
  }
}, [user, session?.access_token, authLoading]);
```

**`src/contexts/AuthContext.tsx`** — Evitar que `onAuthStateChange` sete `loading=false` antes de `getSession`

- Usar flag `initialSessionResolved` para garantir que `loading` so vira `false` apos `getSession()` resolver
- `onAuthStateChange` atualiza user/session mas nao toca `loading` ate o getSession ter rodado

### Arquivos alterados
- `src/contexts/AuthContext.tsx`
- `src/contexts/SubscriptionContext.tsx`

