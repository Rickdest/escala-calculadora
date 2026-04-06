

## Plano: Corrigir botão Upgrade na página de Lojas

### Problema
O botão "Upgrade" navega para `/paywall`, mas o `PaywallRoute` redireciona usuários com assinatura ativa de volta para `/`. Ou seja, quem já tem plano mensal nunca consegue ver a página de upgrade.

### Solução
Trocar a ação do botão "Upgrade" no banner de limite de lojas para abrir diretamente o checkout do plano anual, em vez de navegar para `/paywall`.

### Mudança em `src/pages/Stores.tsx`

1. Importar `PRICING` de `@/constants/pricing`
2. No botão "Upgrade" do banner, trocar `navigate('/paywall')` por `window.open(PRICING.checkoutYearly, '_blank', 'noopener,noreferrer')`

### Arquivo modificado
- `src/pages/Stores.tsx`

