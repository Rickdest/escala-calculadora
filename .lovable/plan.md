

## Plano: Ativar Proteção contra Senhas Vazadas (HIBP)

### Diagnóstico

Esta configuração **não pode ser feita via migration SQL nem via código**. O comando `ALTER SYSTEM SET auth.password_hibp_enabled = true` não está disponível em Lovable Cloud — é uma configuração do serviço de autenticação, não do banco de dados.

### Ação necessária (manual)

Você precisa ativar isso manualmente no painel do Lovable Cloud:

1. Abrir a aba **Cloud** no Lovable
2. Ir em **Users** → ícone de engrenagem (**Auth settings**)
3. Na seção **Email settings**, ativar **Password HIBP Check**

Isso bloqueará automaticamente senhas conhecidas em vazamentos de dados (HaveIBeenPwned).

### Sobre o finding "SECURITY DEFINER functions"

O finding `handle_new_user_definer` (nível **info**) é apenas informativo — as 6 funções `SECURITY DEFINER` existentes (`has_role`, `has_active_subscription`, `handle_new_user`, `handle_new_user_trial`, `update_subscription_status`, `get_own_profile_protected`) estão corretamente escopadas e são necessárias para o funcionamento do sistema. Nenhuma ação é necessária.

### Resultado

Não há alterações de código ou migrations a implementar. A única ação é a configuração manual descrita acima.

