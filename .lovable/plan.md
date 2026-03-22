

## Integração com Cakto no lugar da Hotmart

### Contexto
O app usa Hotmart para pagamentos. A Cakto é uma plataforma brasileira com estrutura de webhook diferente. As principais diferenças:
- **Hotmart**: autenticação via header `x-hotmart-hottok`, dados do comprador em `buyer.email`, eventos como `PURCHASE_APPROVED`
- **Cakto**: autenticação via campo `secret` no webhook, dados do comprador em `customer.email`, eventos como `purchase_approved`, `refund`, `chargeback`, `subscription_canceled`

### Pontos de mudança

Existem 4 áreas para alterar:

---

### 1. Edge Function do Webhook

**Arquivo**: `supabase/functions/hotmart-webhook/index.ts` → renomear para `supabase/functions/cakto-webhook/index.ts`

Mudanças principais:
- Header de autenticação: trocar `x-hotmart-hottok` por validação do campo `secret` no body do webhook (campo `fields.secret` configurado no painel Cakto)
- Secret: trocar `HOTMART_HOTTOK` por `CAKTO_WEBHOOK_SECRET`
- Dados do comprador: `customer.email` em vez de `buyer.email`
- ID da transação: `body.id` ou `body.refId` em vez de `purchase.transaction`
- Mapeamento de eventos Cakto:
  - `purchase_approved` → status `active`
  - `refund`, `chargeback` → status `canceled`
  - `purchase_refused` → ignorar (não afeta subscription)
  - `subscription_canceled` → status `canceled`
  - `subscription_renewed` → status `active`
  - `subscription_renewal_refused` → status `past_due`
- Remover campos `hotmart_transaction_id` e `hotmart_subscription_id` → usar `cakto_order_id` e `cakto_subscription_id`

### 2. Checkout URL

**Arquivo**: `src/services/checkout.service.ts`

- Trocar URL da Hotmart por URL da Cakto (placeholder para o usuário configurar)
- Manter lógica de `email` como query param (Cakto suporta `?email=` no checkout)
- Atualizar comentários

### 3. Migration SQL

- Renomear colunas na tabela `subscriptions`: `hotmart_transaction_id` → `cakto_order_id`, `hotmart_subscription_id` → `cakto_subscription_id`
- Renomear colunas na tabela `profiles`: `hotmart_email` → `payment_email`, `hotmart_status` → `payment_status`
- Atualizar a função `get_own_profile_protected()` e `update_subscription_status()` para usar os novos nomes
- Atualizar RLS policies que referenciam essas colunas

### 4. Config e Secrets

- Atualizar `supabase/config.toml`: remover `[functions.hotmart-webhook]`, adicionar `[functions.cakto-webhook]`
- Solicitar ao usuário configurar o secret `CAKTO_WEBHOOK_SECRET` (é o `secret` gerado ao criar o webhook no painel Cakto)
- Deletar a edge function antiga `hotmart-webhook`

### 5. Arquivo de referência (profiles)

- `check-subscription/index.ts`: atualizar referências a `hotmart_email`/`hotmart_status` para os novos nomes

---

### Detalhes técnicos

**Payload do webhook da Cakto** (baseado na documentação da API de Orders):
```text
{
  "id": "uuid",
  "refId": "CATDiPp",
  "status": "paid",
  "customer": {
    "name": "...",
    "email": "cliente@email.com",
    "phone": "..."
  },
  "product": { "id": "...", "name": "..." },
  "subscription": null | { ... },
  "event": "purchase_approved"  // custom_id do evento
}
```

**Eventos relevantes da Cakto**:
- `purchase_approved` — Compra aprovada
- `purchase_refused` — Compra recusada
- `refund` — Reembolso
- `chargeback` — Chargeback
- `subscription_created` — Assinatura criada
- `subscription_canceled` — Assinatura cancelada
- `subscription_renewed` — Assinatura renovada
- `subscription_renewal_refused` — Renovação recusada

### Setup no painel Cakto

Após implementação, o usuário precisará:
1. No painel Cakto, ir em **Integrações > Webhooks > Adicionar**
2. Colar a URL: `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/cakto-webhook`
3. Selecionar eventos: `purchase_approved`, `refund`, `chargeback`, `subscription_canceled`, `subscription_renewed`, `subscription_renewal_refused`
4. Copiar o `secret` gerado e configurar como `CAKTO_WEBHOOK_SECRET`
5. Atualizar a URL de checkout em `VITE_CAKTO_URL` (env var ou diretamente no código)

