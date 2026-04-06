

# Auditoria Completa — Skalify

## 📌 Avaliação Final

**✅ O aplicativo está pronto para venda? Sim, com ressalvas.**

O produto tem uma base sólida: RLS em todas as tabelas, validação Zod no webhook, enforcement server-side de limites via trigger, autenticação bem implementada, e UX coerente. Os problemas encontrados são corrigíveis e nenhum é um bloqueador absoluto de lançamento.

---

## 🔴 Bugs Críticos (ALTO RISCO)

### 1. `.env` e `tmp/` NÃO estão no `.gitignore`

O `.gitignore` atual só bloqueia `*.local`. Os arquivos `.env` (com chaves reais) e `tmp/` (com dados de clientes reais nos CSVs) continuam sendo rastreados pelo Git. A correção anterior que deveria adicionar estas entradas **não foi aplicada** — o arquivo atual não contém `.env` nem `tmp/`.

**Correção:** Adicionar ao `.gitignore`:
```
.env
.env.local
.env.*.local
tmp/
```

### 2. Subscription status "trialing" redireciona para Paywall

O `handle_new_user_trial` trigger cria subscriptions com `status: 'trialing'`. No `SubscriptionContext`, `trialing` é mapeado para `'expired'`. No `check-subscription`, trialing retorna `status: "expired"`. Resultado: **novos usuários caem direto no paywall sem trial funcional**.

Se trial foi intencionalmente desativado, o trigger `handle_new_user_trial` deveria ser removido ou alterado para criar com `status: 'active'` + trial period. Atualmente ele cria registros que imediatamente bloqueiam o acesso.

**Impacto:** Novos usuários não conseguem usar o app após cadastro — experiência frustrante que causa abandono.

### 3. Sessão expirada mostra tela genérica "Erro ao verificar assinatura"

Confirmado pela session replay: o usuário viu "Erro ao verificar sua assinatura" com botão "Tentar novamente". Isso acontece quando `check-subscription` falha (timeout, token expirado, etc.). Após 2 retries, o status fica em `'error'` e mostra essa tela estática sem contexto. O usuário fica preso sem opção de logout ou recarregar.

**Correção:** Adicionar botão de "Sair da conta" ao `ErrorRetry` em `App.tsx` para que o usuário possa fazer logout e relogar.

---

## 🟠 Problemas Médios

### 4. Senha mínima inconsistente: 8 no cadastro, 6 na alteração

Em `Auth.tsx`, o input tem `minLength={8}`. Em `Profile.tsx`, `handleChangePassword` valida `newPassword.length < 6`. Deveria ser 8 em ambos.

### 5. `addStore` não valida nome no frontend

`handleAddStore` em `Stores.tsx` apenas verifica `newStoreName.trim()` não vazio. Não há limite de comprimento nem sanitização. Um nome com 10.000 caracteres seria aceito. O schema do banco aceita `text` sem limite.

**Correção:** Adicionar validação de max 100 caracteres.

### 6. `deleteStore` não limpa dados relacionados além de products

Ao deletar uma loja, apenas `products` são removidos. Dados de `shopee_tokens`, `shopee_ads_by_product`, `ads_reports`, `product_performance`, `product_ads_metrics` vinculados àquela store ficam órfãos. Não há foreign keys com CASCADE.

**Correção:** Adicionar limpeza dos dados relacionados no `deleteStore` ou criar foreign keys com `ON DELETE CASCADE`.

### 7. Sem feedback ao usuário quando `addStore` falha por limite do trigger

O trigger `enforce_store_limit` levanta `RAISE EXCEPTION`, que retorna como erro genérico do Supabase. O `addStore` exibe `toast.error('Erro ao criar loja')` sem detalhes. O usuário não entende que é por limite de plano.

**Correção:** Parsear a mensagem de erro do trigger e exibir mensagem contextualizada (ex: "Limite de lojas atingido para seu plano").

### 8. `displayName` no Profile não é sanitizado

O campo aceita qualquer string sem limite. Deveria ter `max(100)` e trim.

### 9. Falta de loading/disabled state no botão "Salvar" em Settings

O `handleSave` tem um `await setTimeout(300)` artificial e depois `updateStoreConfig`. Durante o `updateStoreConfig` real, o botão já voltou ao estado normal. Se o request demora, o usuário pode clicar novamente.

---

## 🟡 Problemas Leves

### 10. `ProductForm` — o botão flutuante FAB pode sobrepor conteúdo

O FAB de "Adicionar Produto" em `Products.tsx` pode sobrepor o último card da lista, especialmente em telas menores. O `pb-24` mitiga parcialmente, mas pode não ser suficiente com many products.

### 11. Componente `WhatsAppFab.tsx` existe mas não é usado no layout

O arquivo existe em `src/components/layout/WhatsAppFab.tsx` mas não é importado em `AppLayout`. O suporte via WhatsApp está apenas em Settings como link. Considerar remover o arquivo morto ou integrar.

### 12. Sem tratamento de rate limiting no `addProduct`/`updateProduct`

Se o usuário clica rapidamente, múltiplas requests são enviadas. Não há debounce ou lock.

### 13. `compressImage` resolve com `dataUrl` original se `img.onerror` dispara

Se a imagem falha ao carregar para compressão, o dataUrl original (potencialmente grande) é usado. Deveria rejeitar ou limitar.

### 14. Falta de `aria-label` em vários botões icon-only

Botões como o `+` em Stores, o ícone de filtro em Products, e chevrons de navegação não têm labels acessíveis.

---

## 💡 Sugestões de Melhoria (Não Bloqueiam Lançamento)

1. **Monitoramento de erros**: Integrar Sentry ou similar ao `ErrorBoundary.componentDidCatch` para capturar erros em produção.

2. **Loading skeleton**: Trocar spinners genéricos por skeleton screens (shimmer) nas páginas principais para melhor perceived performance.

3. **Optimistic updates**: `addStore`, `deleteProduct` etc. poderiam atualizar a UI otimisticamente e reverter em caso de erro.

4. **Rate limiting no frontend**: Implementar debounce/throttle em ações de mutação (add, update, delete).

5. **Validação de email no Profile**: Permitir que o usuário atualize o email (atualmente bloqueado sem explicação de como resolver).

---

## ⚠️ Riscos Atuais

| Risco | Severidade | Status |
|-------|-----------|--------|
| `.env` exposto no Git | Crítico | .gitignore não foi atualizado |
| Trial cria status bloqueado | Crítico | Novos usuários caem no paywall |
| Tela de erro sem escape | Alto | Usuário fica preso |
| Dados órfãos ao deletar loja | Médio | Sem cleanup |
| Senha mínima inconsistente | Médio | 8 vs 6 |

## 🔥 Prioridade de Correção

1. Corrigir `.gitignore` (adicionar `.env` e `tmp/`)
2. Resolver flow de trial/novos usuários (trialing → expired)
3. Adicionar botão "Sair" na tela de erro de subscription
4. Uniformizar senha mínima para 8
5. Parsear erro do trigger de limite de lojas
6. Limpar dados órfãos ao deletar loja

## 🚀 O que pode melhorar sem bloquear

- Skeleton loaders
- Sentry integration
- Acessibilidade (aria-labels)
- Rate limiting no frontend
- Remover arquivo morto (WhatsAppFab)

