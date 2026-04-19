

## Auditoria de Segurança, Bugs e Melhorias — abril 2026

Rodei o scanner de segurança, o linter Supabase, inspecionei as 22 tabelas, todas as 75 RLS policies, policies de storage e bati contra as memórias do projeto (findings já justificados).

### 1. Achados de SEGURANÇA

**🟢 Já justificados (manter ignorados — alinhado com `mem://security/ignored-findings-rationale`)**
- `shopee_tokens` sem INSERT/UPDATE para usuários — **correto**: tokens só são gravados via Edge Functions com service_role. Confirmei que `shopee-callback` usa service role.
- `subscription_events` sem SELECT para usuários — **correto**: log de auditoria, payload só visível ao admin.

**🟡 Achado real a corrigir (1)**
- **`shopee_auth_states` sem DELETE policy** — usuários não conseguem limpar seus próprios state tokens após o OAuth. Hoje só o trigger `cleanup_old_shopee_states` (10 min) limpa, ok como rede de segurança, mas o ideal é apagar imediatamente após troca por token bem-sucedida.
- **Ação:** adicionar policy `DELETE USING (auth.uid() = user_id)` + chamar `delete()` no `shopee-callback` após sucesso.

**🟡 Storage buckets públicos com listing aberto (`banners`, `product-images`)**
- Hoje qualquer um pode **listar** todos os arquivos do bucket via `storage.objects.select`.
- Para `banners`: aceitável (conteúdo público gerenciado por admin), mas vamos restringir SELECT a `bucket_id` apenas para os arquivos referenciados na tabela `banners` (impede enumeração).
- Para `product-images`: **vazamento real** — qualquer usuário lista todas as imagens de produtos de outros usuários. A policy atual `Product images are publicly accessible` é `bucket_id = 'product-images'` sem nenhum filtro. As URLs já são públicas (ok para `<img src>`), mas listing não deveria ser. **Ação:** restringir SELECT a `(storage.foldername(name))[1] = auth.uid()::text` (usuário vê só as suas), e manter URLs públicas para renderização (acesso direto por URL continua funcionando, só listing fica bloqueado).

### 2. BUGS funcionais identificados

**Bug 1 — Sincronização Shopee pode reiniciar `sale_price` editado**
Acabamos de implementar a preservação no `useShopeeProducts`, mas a Edge Function `shopee-sync` **não tem essa proteção**. Se a sync for via API (não via importProducts do hook), o preço editado é sobrescrito. Precisa replicar a regra `if (existing.sale_price === 0 || null) updatePrice` lá também.

**Bug 2 — `subscription_events.user_id` é nullable e nunca preenchido em alguns paths**
A tabela permite `user_id NULL` (necessário para webhooks pré-vinculação), mas hoje **nenhum job retroativo** vincula `user_id` quando o usuário se cadastra depois. A reconciliação descrita em `mem://auth/subscription-reconciliation-logic` cobre `subscriptions`, mas `subscription_events` fica órfão. Adicionar trigger `AFTER INSERT ON profiles` que faz `UPDATE subscription_events SET user_id = NEW.user_id WHERE email = NEW.email AND user_id IS NULL`.

**Bug 3 — `shopee_auth_states` permite múltiplos states ativos por usuário**
Não há `UNIQUE(user_id, app_type)`. Se o usuário clica "Conectar Shopee" 2x rápido, gera 2 states e o callback consome o errado. Adicionar índice único parcial: `UNIQUE(user_id, app_type) WHERE created_at > now() - interval '10 min'` — ou simplesmente fazer o insert com `ON CONFLICT DO UPDATE`.

**Bug 4 — `enforce_store_limit` não considera plano `essencial` novo**
A função tem `'monthly' → 2, 'yearly' → 7, 'pro' → 2` mas as memórias dizem "Essencial 2 lojas, Pro 7 lojas" (`mem://business/pricing-plans`). Se o `subscriptions.plan` for gravado como `'essencial'` ou `'skalify_pro'`, cai no fallback `0`. Precisa alinhar os literais com o que o webhook Cakto grava.

### 3. MELHORIAS de robustez

**M1 — 140 chamadas de `console.log/error` nas Edge Functions**
Logs desestruturados podem vazar tokens/payloads em produção. Padronizar wrapper `logger.info/warn/error` que faz redaction automática de campos `access_token`, `refresh_token`, `partner_key`, `email` (mascarado).

**M2 — Falta rate limiting em endpoints públicos**
- `cakto-webhook` (`verify_jwt = false`) — só valida secret, mas sem throttle por IP
- `shopee-callback` (`verify_jwt = false`) — qualquer um pode bater com `?code=...&state=...` aleatórios. Adicionar rate limit (10/min/IP) via tabela `rate_limits` ou contador em memória.

**M3 — Senhas: HIBP check desligado**
O scan não acusou, mas vale checar via `configure_auth`. Se desligado, ativar `password_hibp_enabled: true` para bloquear senhas vazadas.

**M4 — `profiles.push_subscription` (jsonb) sem validação de schema**
Se for usado para web push notifications, pode receber JSON malformado. Validar com Zod no client antes de gravar.

**M5 — Índices ausentes em queries frequentes**
- `ads_data(user_id, periodo_fim DESC)` — dashboard filtra por isso
- `product_performance(user_id, period_end DESC)` — idem
- `shopee_ads_by_product(user_id, store_id, period_end DESC)`
Verificar com `EXPLAIN ANALYZE` se há sequential scan e adicionar índices compostos.

### 4. MELHORIAS de UX/qualidade

**UX1 — Auth: mensagem genérica em erros 500 do `signUp`**
Hoje cai no "Erro ao processar. Tente novamente." Adicionar telemetria (Sentry-like) para ver erros reais sem expor ao usuário.

**UX2 — `useShopeeProducts.importProducts` não mostra progresso**
Em loja com 200+ produtos, a UI fica "carregando" sem feedback. Adicionar progress bar (X/Y processados) via state local.

**UX3 — Preço editado manualmente: sem indicador visual na lista**
Já implementado o lock no sync, falta mostrar uma pílula "Preço customizado" na lista de produtos quando `sale_price !== shopee_price_snapshot`. Requer adicionar coluna `shopee_sale_price` em `products` (snapshot da última sync) para comparar.

**UX4 — Modal de edição: campo `cost_price` não tem mesma proteção do `sale_price`**
Custo também vem da Shopee (quando há `mtsku`), e hoje pode ser sobrescrito sem aviso. Aplicar a mesma lógica de "preservar se já editado".

### 5. Plano de execução proposto (priorizado)

| # | Item | Impacto | Esforço |
|---|---|---|---|
| 1 | DELETE policy + delete imediato em `shopee_auth_states` | Médio (segurança) | Baixo |
| 2 | Restringir SELECT em `product-images` (anti-enumeração) | Alto (privacidade) | Baixo |
| 3 | Replicar preservação de `sale_price` no `shopee-sync` edge | Alto (bug usuário) | Baixo |
| 4 | Alinhar literais de plano em `enforce_store_limit` | Alto (bug billing) | Baixo |
| 5 | UNIQUE em `shopee_auth_states(user_id, app_type)` | Médio | Baixo |
| 6 | Trigger reconciliação `subscription_events.user_id` | Médio | Baixo |
| 7 | Logger com redaction nas Edge Functions | Médio (segurança) | Médio |
| 8 | Rate limiting `cakto-webhook` e `shopee-callback` | Médio (DoS) | Médio |
| 9 | Indicador visual de "preço customizado" + snapshot Shopee | Baixo (UX) | Médio |
| 10 | Progresso de importação Shopee (X/Y) | Baixo (UX) | Baixo |

### Atualizações de memória após implementação
- Atualizar `mem://security/ignored-findings-rationale` adicionando `product-images` listing como **corrigido** (não mais ignorado).
- Criar `mem://security/storage-bucket-policies` documentando a regra "buckets públicos sem listing aberto".

### Pergunta
Quer que eu execute **todos os 10 itens em sequência** ou prefere começar só pelos críticos (1–6, todos baixo esforço)?

