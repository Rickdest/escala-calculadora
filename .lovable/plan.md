

## Desabilitar Trial — Acesso Apenas por Assinatura

### Resumo
Remover toda lógica de trial do sistema. Usuários sem assinatura ativa (`status === 'active'`) veem tela de bloqueio. Sem período gratuito.

### Mudanças

#### 1. Edge Function `check-subscription/index.ts`
- Remover bloco de trial na função `resolveStatus` (linhas 35-42): status `trialing` passa a retornar `expired`
- Remover fallback de trial em `profiles` (linhas 144-172): não verificar mais `trial_fim`/`trial_inicio`
- Manter reconciliação por email (compra antes do cadastro) intacta

#### 2. `src/contexts/SubscriptionContext.tsx`
- Remover `trialing` do tipo `SubscriptionStatus`
- Remover `trialEnd` do state e do contexto
- Alterar `isActive` para apenas `status === 'active'`

#### 3. `src/hooks/useBilling.ts`
- Remover `isTrialing`, `trialEnd`, `daysLeft`
- Simplificar retorno

#### 4. `src/services/billing.service.ts`
- Remover `trialEnd` do `SubscriptionData`

#### 5. `src/pages/Home.tsx`
- Remover import e uso de `trialEnd` (linha 46)
- Remover bloco `subscriptionCta` (linhas 105-118) — banner de trial
- Remover `<DailyOfferModal />` (linha 395) e import (linha 11)
- Manter `expiredCta` mas sem check de `trialing`

#### 6. `src/components/DailyOfferModal.tsx`
- Deletar arquivo inteiro (só aparecia durante trial)

#### 7. `src/pages/Profile.tsx` — `SubscriptionSection`
- Remover bloco `trialing` (linhas 271-276)
- Manter apenas `active` e `canceled/past_due/expired`

#### 8. `src/components/TrialExpiredBlock.tsx`
- Atualizar texto: remover "período de teste" → "Assine o Precify para acessar"
- Manter botão checkout e "Já assinei → Verificar acesso"

#### 9. `src/App.tsx` — `ProtectedRoute`
- Simplificar: se `status !== 'active'` e não `loading`, mostra `TrialExpiredBlock`

### Arquivos modificados
- `supabase/functions/check-subscription/index.ts`
- `src/contexts/SubscriptionContext.tsx`
- `src/hooks/useBilling.ts`
- `src/services/billing.service.ts`
- `src/pages/Home.tsx`
- `src/pages/Profile.tsx`
- `src/components/TrialExpiredBlock.tsx`
- `src/App.tsx`
- `src/components/DailyOfferModal.tsx` (deletar)

