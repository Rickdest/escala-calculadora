

## Resposta direta: NÃO, o fallback não libera acesso indevido. Mas tem um detalhe que vale reforçar.

### Por que está seguro hoje

O fallback DB faz exatamente isto:

```sql
SELECT status, plan FROM subscriptions WHERE user_id = auth.uid()
```

Protegido por **3 camadas**:

1. **RLS na tabela `subscriptions`** (`auth.uid() = user_id`): o usuário só consegue ler a **própria** linha. Não tem como inventar ou ver assinatura de outro.
2. **RLS bloqueia INSERT/UPDATE/DELETE pra todos os usuários autenticados**: ninguém consegue criar/editar uma assinatura `active` no client. Só o webhook do Cakto (via `service_role` no servidor) escreve nessa tabela.
3. **Trigger `handle_new_user_trial`** já cria o registro de novo usuário como `status='free', plan='free'` por default — então mesmo que o fallback responda, ele responde `free` e o app manda pro paywall.

**Resultado**: usuário sem pagamento → linha no DB diz `free` → fallback retorna `free` → `STATUS_MAP['free']='free'` → `status !== 'active'` → `ProtectedRoute` redireciona pro `/paywall`. Funciona corretamente.

### Onde existe um risco TEÓRICO (e como blindar)

Hoje o cache local (`localStorage`) só armazena status **`active`** (linha 41: `if (parsed.status !== 'active') return null`). Isso é seguro — mas um atacante poderia, em teoria, abrir o DevTools e injetar manualmente `localStorage.setItem('skalify:sub-cache:v2', '{"status":"active",...}')` pra burlar o paywall **no client**.

**Importante**: isso **não dá acesso real** aos dados — todas as RLS de escrita (`products`, `stores`, `ads_data`, etc.) exigem `has_active_subscription()` checada no **servidor**. O atacante só veria a UI vazia. Mas a UX de paywall seria pulada.

### Proposta de blindagem (1 mudança cirúrgica)

**`src/contexts/SubscriptionContext.tsx`**:

- Quando carregar do cache local, **revalidar imediatamente em background** via DB (chamada barata, RLS-protegida). Se o DB retornar `free`/`expired`, sobrescrever o status na hora e mandar pro paywall.
- Hoje já fazemos isso via edge function — adicionar a mesma revalidação via DB direto como reforço.

Isso fecha o vetor teórico do `localStorage` editado: mesmo se alguém forjar o cache, em <1s a verificação real do DB derruba e manda pro paywall.

### Resumo de garantias

| Cenário | Comportamento |
|---|---|
| Usuário pagante (`active` no DB) | Cache → entra. Edge falha → DB confirma `active` → entra. ✅ |
| Usuário trial/free | DB retorna `free` → paywall. ✅ |
| Usuário expirado (`canceled`/`past_due`) | DB retorna o status real → paywall. ✅ |
| Atacante forja `localStorage` | Vê UI por <1s, revalidação DB derruba → paywall. ✅ |
| Atacante tenta criar produto/loja sem pagar | RLS `has_active_subscription()` bloqueia no servidor. ✅ |

### Arquivo editado

| Arquivo | Mudança |
|---|---|
| `src/contexts/SubscriptionContext.tsx` | Após restaurar do cache, disparar uma revalidação DB em paralelo à chamada do edge function (não bloqueante). Se DB disser `!== active`, sobrescrever estado e ir pro paywall. |

### Trade-offs

- ✅ Fecha o único vetor teórico de bypass do paywall no client
- ✅ Não introduz nenhuma latência extra perceptível (DB query <100ms, paralelo ao edge)
- ⚠️ +1 query DB por carga de página (insignificante — RLS-indexed por `user_id`)

