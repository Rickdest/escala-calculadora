

## Plano: Bloquear acesso para quem não comprou

### Causa raiz

O trigger `handle_new_user_trial()` no banco de dados cria automaticamente uma assinatura com `status = 'active'` e `plan = 'monthly'` para **todo novo usuário** que se cadastra. Isso significa que qualquer pessoa que cria uma conta recebe acesso completo imediatamente, sem precisar pagar.

### Solução

1. **Alterar o trigger `handle_new_user_trial()`** para criar a assinatura com `status = 'free'` e `plan = 'free'` em vez de `active`/`monthly`. Assim, novos usuários caem no paywall e só ganham acesso após pagamento via Cakto.

2. **Limpar assinaturas indevidas já criadas**: executar um UPDATE nas assinaturas que foram criadas pelo trigger (status `active`, plan `monthly`) mas que **não têm** um `cakto_order_id` — ou seja, nunca pagaram. Essas serão alteradas para `free`/`free`.

### Mudanças

**Migration SQL:**
```sql
-- 1. Corrigir o trigger para novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, email, status, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'free',
    'free'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Revogar acesso de quem nunca pagou
UPDATE public.subscriptions
SET status = 'free', plan = 'free', updated_at = now()
WHERE status = 'active'
  AND plan = 'monthly'
  AND cakto_order_id IS NULL
  AND cakto_subscription_id IS NULL;
```

### Resultado
- Novos cadastros caem direto no paywall
- Usuários que já pagaram via Cakto (possuem `cakto_order_id`) não são afetados
- Acesso só é liberado quando o webhook da Cakto confirma o pagamento

