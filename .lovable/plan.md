

## Problema

Quando um usuário **sem assinatura** entra no app, em vez de ir direto pro `/paywall` ele vê **"Erro ao verificar sua assinatura"** com botões "Tentar novamente" / "Sair da conta".

### Causa raiz

No `SubscriptionContext.tsx`, se a chamada à edge `check-subscription` falha por motivo técnico transitório (cold start >10s, hiccup de rede, timeout), o status vai pra `'error'`. O `ProtectedRoute` no `App.tsx` (linhas 109-111) intercepta `status === 'error'` e mostra o componente `ErrorRetry` antes de chegar no paywall.

Cenário típico que dispara o erro:
1. Usuário recém-criado (trigger `handle_new_user_trial` cria sub `free/free`)
2. Faz signup/login → `Auth.tsx` chama `navigate('/')`
3. `ProtectedRoute` chama `checkSubscription` → primeira chamada cai em cold start de 10s → timeout → retry → segundo timeout → `status='error'`
4. Usuário vê tela de erro técnico em vez do paywall comercial

Sintomas adicionais no fluxo atual:
- Mensagem de erro não diferencia "sem plano" de "falha real" — assusta usuário pagante
- Botão "Sair da conta" como ação primária empurra usuário pra fora em vez de oferecer assinar
- Logs do edge mostram só usuários `active`, indicando que a chamada nem chegou no servidor (provavelmente CORS/timeout no client)

## Plano

### 1. Eliminar a tela "ErrorRetry" como bloqueio

**`src/App.tsx`** — `ProtectedRoute`:
- Remover o branch `if (status === 'error') return <ErrorRetry />`.
- Tratar `'error'` como **não-ativo** → mandar pra `/paywall` igual `expired`/`canceled`/`free`.
- Manter o componente `ErrorRetry` apenas como fallback opcional dentro do paywall (banner discreto), não como tela cheia bloqueante.

**Justificativa:** Na dúvida, o comportamento correto é mostrar oferta comercial (paywall), não tela técnica. O paywall já tem botão "Sair" e CTA pra assinar — cobre os dois casos (sem plano e erro transitório).

### 2. Tornar o `SubscriptionContext` mais resiliente

**`src/contexts/SubscriptionContext.tsx`**:
- Quando todos os retries falharem e não houver `lastKnownStatus`, definir `status='expired'` (não `'error'`). Isso é fail-safe: usuário cai no paywall em vez de tela de erro.
- Aumentar o timeout inicial de 10s pra 15s (cold start de Deno edge functions costuma levar 8-12s).
- Manter o status `'error'` apenas como sinal interno pra logging — não exposto ao roteamento.

### 3. Banner informativo no Paywall (opcional, sutil)

**`src/pages/Paywall.tsx`**:
- Adicionar prop/leitura do `useBilling().status`. Se `status === 'error'`, mostrar um banner pequeno acima do hero: *"Não conseguimos confirmar sua assinatura agora. Se você já é assinante, [clique aqui pra tentar novamente]."* com `onClick={refreshSubscription}`.
- Para `status === 'expired'/'free'/'canceled'/'past_due'`, paywall normal sem banner.

### 4. Garantir que signup/login funcione mesmo sem plano

**`src/pages/Auth.tsx`** (linha 98):
- `navigate('/')` continua certo — o `ProtectedRoute` agora redireciona graciosamente pro paywall.
- Sem mudança necessária aqui.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Remover bloco `ErrorRetry` do `ProtectedRoute`; tratar `'error'` como não-ativo (vai pro paywall). Remover componente `ErrorRetry` ou mantê-lo só como import morto |
| `src/contexts/SubscriptionContext.tsx` | Após retries falharem, definir `status='expired'` em vez de `'error'`; timeout 10s → 15s |
| `src/pages/Paywall.tsx` | Banner sutil "Já é assinante? Tentar novamente" quando o status interno indicar problema técnico (opcional, low-priority) |

### Trade-offs

- ✅ Usuário sem assinatura vê paywall (UX comercial), não erro técnico (UX confusa)
- ✅ Usuário pagante com hiccup transitório vê paywall com banner "tentar novamente" — pior cenário ele recarrega
- ✅ Elimina o caminho onde o usuário é praticamente forçado a "Sair da conta" por uma falha de 10s
- ⚠️ Se o backend ficar genuinamente quebrado, o usuário pagante vai ver paywall até refrescar — aceitável, edge functions raramente ficam down por muito tempo
- ⚠️ Perde-se a tela de erro dedicada — mas ela estava causando mais confusão do que ajudando

