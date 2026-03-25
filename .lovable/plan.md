

## Conceder Acesso — richard.aragao@outlook.com

### Situação Atual
- Usuário encontrado no banco: `user_id = 05ae74b6-f175-4547-9940-65458c305278`
- Perfil existente com status `trial`
- **Sem registro na tabela `subscriptions`** — por isso está bloqueado

### Ação
Criar uma migração SQL para inserir um registro ativo na tabela `subscriptions`:

```sql
INSERT INTO public.subscriptions (user_id, email, status, plan, current_period_start, updated_at)
VALUES (
  '05ae74b6-f175-4547-9940-65458c305278',
  'richard.aragao@outlook.com',
  'active',
  'pro',
  now(),
  now()
)
ON CONFLICT DO NOTHING;
```

Apenas 1 arquivo criado: migração SQL. Nenhuma alteração de código.

