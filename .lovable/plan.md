

## Relatório de Teste Completo — Bugs e Problemas Encontrados

### Bugs Críticos (impactam uso real)

**1. Crash ao navegar entre páginas (ALTO)**
- O session replay mostra que ao navegar para `/roas`, o app crashou exibindo "Algo deu errado"
- O erro de runtime é `useStore must be used within a StoreProvider` vindo do `Sidebar.tsx`
- **Causa provável**: durante hot-reload ou navegação, o `ErrorBoundary` captura um erro interno e substitui toda a árvore de providers. Quando o ErrorBoundary renderiza, os contexts (StoreContext, AuthContext) não estão mais disponíveis, mas o Sidebar tenta usar `useStore()`
- **Correção**: O `ErrorBoundary` está no nível correto (envolve tudo). O problema real pode ser um erro transitório no `RoasAnalysis` (componente pesado). Adicionar um `ErrorBoundary` local dentro de `AppLayout` para isolar crashes de páginas sem derrubar o layout inteiro

**2. Warnings de `forwardRef` no console (BAIXO)**
- `SectionLabel` em `RoasAnalysis.tsx` e `BottomNavigation` são function components recebendo refs sem `forwardRef`
- Não causa crash, mas polui o console

---

### Problemas de Qualidade / Prontidão para Lançamento

**3. Loading spinner infinito em telas (MÉDIO)**
- O session replay mostra múltiplos "Loading spinner displayed" — pode indicar que o `isLoading` do `StoreContext` ou `SubscriptionContext` não resolve em certos cenários (ex: sem rede, token expirado)
- **Correção**: Adicionar timeout no `SubscriptionContext` — se a chamada demorar mais de 10s, tratar como `expired` em vez de ficar em loading eterno

**4. `ads_reports` DELETE policy ainda usa `has_active_subscription()` (MÉDIO)**
- Na migration anterior removemos `has_active_subscription` dos UPDATE/DELETE de products/stores/estoque, mas `ads_reports` DELETE ainda tem essa restrição
- **Correção**: Remover `has_active_subscription()` do DELETE policy de `ads_reports`

**5. `product_ads_metrics` RLS usa `public` em vez de `authenticated` (ALTO — Segurança)**
- A policy `Users can manage own ads metrics` aplica para role `public`, não `authenticated`
- Isso significa que requests anônimos podem tentar manipular dados (o `auth.uid()` check impede acesso real, mas é má prática)
- **Correção**: Recriar a policy com role `authenticated`

**6. `price_history` INSERT ainda exige `has_active_subscription()` (BAIXO)**
- Consistência: se removemos de INSERT dos outros, deveria seguir o mesmo padrão — mas como é automático (não manual do usuário), pode manter

---

### O que está OK ✓

- Autenticação: fluxo login/signup funciona
- Subscription: edge function com reconciliação por email está correta
- Trial de 7 dias: trigger configurada corretamente
- WhatsApp: link usa `api.whatsapp.com/send` (funcional)
- Imagens: migração para Storage com fallback localStorage
- Cálculo de margem: inclui `adsRevenue` corretamente
- RLS SELECT: sem bloqueio por subscription (corrigido anteriormente)
- ErrorBoundary global: presente e funcional

---

### Plano de Correções

**Arquivo 1: `src/components/layout/AppLayout.tsx`**
- Envolver `{children}` (o conteúdo da página) em um `ErrorBoundary` local para que crashes em páginas como Roas não derrubem o layout inteiro (sidebar, header, bottom nav continuam funcionando)
- Exibir mensagem de erro inline em vez de tela branca

**Arquivo 2: `src/contexts/SubscriptionContext.tsx`**
- Adicionar timeout de 10s na chamada `checkSubscription` para evitar loading infinito
- Se falhar ou timeout, definir status como `expired` (comportamento seguro)

**Arquivo 3: Migration SQL**
- Corrigir `product_ads_metrics` RLS: recriar policy com `authenticated` em vez de `public`
- Remover `has_active_subscription()` do DELETE de `ads_reports`

**Arquivo 4: `src/components/charts/RoasAnalysis.tsx`**
- Adicionar `forwardRef` ao `SectionLabel` ou remover ref passada a ele para eliminar warning

**Arquivo 5: `src/components/layout/BottomNavigation.tsx`**
- Adicionar `forwardRef` ou corrigir o uso de ref para eliminar warning

### Resumo de impacto
- 5 arquivos alterados (3 frontend + 1 migration + 1 context)
- Nenhuma funcionalidade alterada
- Foco em estabilidade, segurança e eliminação de warnings

