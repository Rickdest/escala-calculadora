

## Plano: Ativar assinatura manualmente para ghenriquemendanha@gmail.com

### Contexto
O pagamento foi confirmado na Cakto (status "Pago", R$ 37,41 via Pix, recorrência 1), mas o webhook nunca chegou — zero eventos em `subscription_events`. O usuário está bloqueado no paywall.

### Ação
Executar uma migration SQL para atualizar a assinatura:

```sql
UPDATE public.subscriptions
SET status = 'active',
    plan = 'monthly',
    updated_at = now(),
    current_period_start = now()
WHERE email = 'ghenriquemendanha@gmail.com';
```

### Investigação recomendada
Verificar na plataforma Cakto se o webhook está configurado corretamente com a URL da edge function e o segredo correto, pois nenhum evento chegou para esse email.

