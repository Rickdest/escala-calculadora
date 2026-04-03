
Objetivo

Parar o redirecionamento indevido ao paywall e garantir que só usuários realmente sem assinatura ativa vejam a cobrança.

Diagnóstico

- O app hoje manda qualquer status diferente de `active` para `/paywall`.
- O `SubscriptionContext` ainda transforma falha técnica em `expired` após retry.
- O indício mais forte está no backend: os logs recentes de `check-subscription` mostram basicamente chamadas `OPTIONS` e não o `POST` real.
- Em `supabase/functions/check-subscription/index.ts`, o CORS responde `Access-Control-Allow-Origin` e `Access-Control-Allow-Headers`, mas não inclui `Access-Control-Allow-Methods`. Isso pode bloquear a chamada real no navegador; quando isso acontece, o client trata como erro e empurra todo mundo para o paywall.
- Portanto, o problema parece ser uma combinação de:
  1. preflight/CORS incompleto na function
  2. fallback agressivo no client (`erro = expired`)

Plano de correção

1. Corrigir a function `check-subscription`
- Adicionar `Access-Control-Allow-Methods: POST, OPTIONS`
- Adicionar `Vary: Origin` e, se necessário, `Access-Control-Max-Age`
- Garantir que o retorno de `OPTIONS` use os mesmos headers completos do fluxo real
- Melhorar logs da function para diferenciar: preflight, token inválido, assinatura achada por `user_id`, assinatura achada por `email`, fallback por `profiles`

2. Parar de converter erro técnico em assinatura expirada
- Ajustar `src/contexts/SubscriptionContext.tsx` para separar falha técnica de status real
- Em caso de erro inicial, manter estado neutro (`loading`/`error`) ou o último status válido do mesmo usuário
- Só definir paywall quando o backend responder explicitamente `free`, `expired`, `canceled` ou `past_due`
- Preservar a lógica por `userId`, mas sem degradar assinantes ativos por timeout/CORS

3. Ajustar os guards de rota
- `ProtectedRoute`: se a checagem falhar tecnicamente, mostrar loader/estado de reconciliação em vez de redirecionar
- `PaywallRoute`: continuar bloqueando acesso ao paywall para quem estiver `active`
- Remover qualquer caminho que dependa de fallback legado para cobrança

4. Validar a consistência do backend
- Manter a prioridade atual da function: `subscriptions` por `user_id` → `subscriptions` por `email` → `profiles.status = 'ativo'`
- Fazer hardening para cenários com múltiplas linhas futuras de assinatura por email
- Revisar `cakto-webhook` depois do fix principal para evitar inconsistência futura, mas isso é secundário ao bug atual

Arquivos principais

- `supabase/functions/check-subscription/index.ts`
- `src/contexts/SubscriptionContext.tsx`
- `src/App.tsx`
- possivelmente `src/services/billing.service.ts`
- opcionalmente `supabase/functions/cakto-webhook/index.ts` para hardening posterior

Ordem de execução

1. Corrigir CORS/preflight da `check-subscription`
2. Corrigir fallback do `SubscriptionContext`
3. Ajustar `ProtectedRoute` e `PaywallRoute`
4. Validar fluxo de assinante ativo vs. não assinante
5. Fazer hardening opcional do webhook

Resultado esperado

- Assinantes ativos param de ser enviados ao paywall
- Falhas temporárias de backend não bloqueiam todo o app
- Apenas usuários realmente sem assinatura ativa vão para a tela de cobrança
