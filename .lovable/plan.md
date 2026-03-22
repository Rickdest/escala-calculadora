
## Integração Cakto — Concluída ✅

### O que foi feito

1. **Edge Function `cakto-webhook`** criada em `supabase/functions/cakto-webhook/index.ts`
   - Autenticação via campo `secret` no body
   - Eventos mapeados: `purchase_approved`, `refund`, `chargeback`, `subscription_canceled`, `subscription_renewed`, `subscription_renewal_refused`
   - Dados do comprador via `customer.email`

2. **Migration SQL** executada
   - `subscriptions.hotmart_transaction_id` → `cakto_order_id`
   - `subscriptions.hotmart_subscription_id` → `cakto_subscription_id`
   - `profiles.hotmart_email` → `payment_email`
   - `profiles.hotmart_status` → `payment_status`
   - Funções `get_own_profile_protected()` e `update_subscription_status()` recriadas
   - RLS policy de profiles atualizada

3. **Checkout URL** atualizada para Cakto em `src/services/checkout.service.ts`

4. **Config** atualizada: `supabase/config.toml` aponta para `cakto-webhook`

5. **Edge Function antiga** `hotmart-webhook` deletada

6. **check-subscription** atualizado para usar `payment_status`/`payment_email`

### Setup necessário no painel Cakto

1. Ir em **Integrações > Webhooks > Adicionar**
2. URL: `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/cakto-webhook`
3. Selecionar eventos: `purchase_approved`, `refund`, `chargeback`, `subscription_canceled`, `subscription_renewed`, `subscription_renewal_refused`
4. O `CAKTO_WEBHOOK_SECRET` já foi configurado ✅
5. Configurar `VITE_CAKTO_URL` com a URL de checkout do produto na Cakto
