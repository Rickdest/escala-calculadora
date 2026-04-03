

## Plano: Corrigir Paywall (remover sidebar + proteger assinantes ativos)

### Problemas identificados

1. **Paywall mostra sidebar/navegação**: O `Paywall.tsx` usa `<AppLayout>` que renderiza sidebar e header — deveria ser uma página isolada sem navegação lateral
2. **Assinante ativo vê paywall**: A rota `/paywall` não tem proteção — qualquer usuário (mesmo ativo) pode cair nela. Falta um guard que redirecione assinantes ativos de volta para `/`
3. **Erro no catch do SubscriptionContext**: Quando a chamada `check-subscription` falha e não há cache, o status cai para `'expired'` — isso joga assinantes ativos no paywall por erro de rede

### Alterações

#### 1. `src/pages/Paywall.tsx` — remover AppLayout
- Substituir `<AppLayout>` por um wrapper simples (`div` com fundo e centralização)
- Página standalone, sem sidebar, sem header, sem navegação
- Manter todo o conteúdo interno (toggle, preço, CTA, benefícios)

#### 2. `src/App.tsx` — proteger rota `/paywall`
- Criar um `PaywallRoute` que:
  - Se `status === 'active'` → redireciona para `/`
  - Se `!user` → redireciona para `/auth`
  - Se loading → mostra loader
  - Caso contrário → renderiza Paywall
- Aplicar na rota: `<Route path="/paywall" element={<PaywallRoute><Paywall /></PaywallRoute>} />`

#### 3. `src/contexts/SubscriptionContext.tsx` — retry antes de expirar
- No catch, se não há cache, fazer 1 retry antes de definir como `'expired'`
- Isso evita que falha temporária de rede jogue assinante ativo no paywall

### Arquivos alterados

```text
src/pages/Paywall.tsx              — remover AppLayout, página standalone
src/App.tsx                        — PaywallRoute guard
src/contexts/SubscriptionContext.tsx — retry no catch
```

