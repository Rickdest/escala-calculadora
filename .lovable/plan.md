

## Diagnóstico final (com evidência)

Verifiquei TUDO de novo:

**Banco de dados (perfeito):**
- Pedro: `active yearly` (vence abr/2027) ✅
- Richard: `active pro` ✅  
- Junior: `active pro` ✅
- Henrique: `active monthly` ✅

**Servidor (responde correto):**
Network log às 16:39:17 mostra `POST /check-subscription` → `{"status":"active","plan":"pro"}` retornado para o Richard. E há requests subsequentes carregando produtos/lojas/estoque — ou seja, **na sessão atual do navegador o app está funcionando**, ele NÃO está caindo no paywall.

**Mapeamento de planos (correto):**
- `pricing.ts`: `{ free: 0, pro: 2, monthly: 2, yearly: 7 }` ✅
- Cakto webhook: `"yearly"` → `yearly`, `"monthly"|"mensal"` → `monthly`, `"pro"` → `monthly` ✅
- Trigger DB `enforce_store_limit`: aceita `pro`, `monthly`, `yearly` ✅

**Causa raiz real:** as duas correções anteriores (`billing.service.ts` com fetch nativo e `SubscriptionContext.tsx` com refs) **estão no código mas não foram publicadas em `app.skalify.com.br`**. Por isso usuários em produção (PWA mobile, navegadores normais) ainda rodam a versão velha que falha.

## Plano de correção

Vou adicionar uma rede de segurança no client que garante: **mesmo se o edge function `check-subscription` falhar 100%, qualquer usuário com `status='active'` no banco consegue entrar.**

### 1. Fallback direto no banco (rede de segurança definitiva)

**`src/contexts/SubscriptionContext.tsx`**:
- Quando o `checkSubscription` (edge function) falhar todos os retries, em vez de jogar pra `expired` direto, fazer **uma consulta direta na tabela `subscriptions`** via Supabase client (RLS já filtra pelo `auth.uid()`).
- Se retornar `status='active'`, considerar ativo. Se nada, aí sim `expired`.
- Isso elimina dependência do edge function como single point of failure. Se o RLS deixar o user ler a própria assinatura (já deixa via `auth.uid() = user_id`), o paywall NUNCA mais bloqueia indevidamente.

### 2. Verificar que RLS de `subscriptions` permite SELECT pelo dono

Vou confirmar que a policy `SELECT` existe para `auth.uid() = user_id`. Se não existir, criar via migration.

### 3. Reforçar o cache local

**`src/contexts/SubscriptionContext.tsx`**:
- Aumentar TTL do cache local de `active` de 1h para **24h**.
- Adicionar segundo cache só com `userId + ts` para detectar quando o user mudou (sem nunca cachear estados negativos).

### 4. Trocar o "fail-safe expired" por "manter último estado conhecido"

Se nunca tivemos sucesso E o cache local diz que era ativo recentemente E o fallback DB confirma → ativo. Só vai pro paywall se TUDO falhar (edge function + DB + cache).

### 5. Logs de diagnóstico robustos

Os logs `[subscription]` já existem. Vou adicionar mais um nível: logar exatamente qual fallback foi usado (`edge`, `db`, `cache`, `paywall`).

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/contexts/SubscriptionContext.tsx` | Adicionar fallback DB direto via Supabase client; aumentar TTL cache para 24h; logs detalhados de qual fonte resolveu |
| `supabase/migrations/...sql` | (Se necessário) Garantir que RLS `subscriptions SELECT` existe para `auth.uid() = user_id` |

### O que isso resolve

- ✅ **Edge function quebra** → DB resolve → user entra
- ✅ **DB lento** → cache de 24h resolve → user entra
- ✅ **Tudo quebra** → paywall (correto)
- ✅ Pedro, Richard, Junior, Henrique e todos os 8+ usuários `active` no banco entram independente do estado do edge function

### O que o usuário precisa fazer DEPOIS

1. Eu aplico o fix.
2. **Clicar PUBLISH** — sem isso, nada chega em produção.
3. No celular: fechar e reabrir o PWA.

### Trade-offs

- ✅ Defense-in-depth real: 3 fontes (edge → db → cache) antes de bloquear
- ✅ Edge function continua sendo a fonte primária (mais info, reconciliação por email)
- ⚠️ +1 round-trip ao DB no caso de erro (raro). Aceitável.
- ⚠️ Se o admin cancelar uma assinatura, user com cache de 24h pode ter acesso "fantasma" por até 24h. Aceitável: cancelamentos são raros e o backend segue protegido por RLS.

