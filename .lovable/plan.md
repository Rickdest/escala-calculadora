`.
<lov-tool-use id="toolu_vrtx_019skznUgYFZsDH5QZX4vB1P" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Kz8869KGUoCKYBxnLLwWXH" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/functions\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HVFQu2PqW3uZty2n4DP5rT" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/migrations\"}">
</lov-tool-use>
Vou explorar o projeto em profundidade antes de entregar a auditoria.
<lov-tool-use id="toolu_vrtx_01XBsFhX14gSHY5LK9HzWk4U" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016aBTgs6a1Dutrun3vWRweG" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/functions\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EEr8vDpGScibyxEMMa53hZ" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/migrations\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01B5GqkyqcLKmuLcSw8i7TUT" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CurtYMaotKF1uMx2aUGDKa" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/hooks\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PLCbaz1X9cs6XdZMYjVQ3G" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/lib\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JjwV2XixEQpD4nnvTxd95E" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && wc -l src/pages/*.tsx src/contexts/*.tsx src/hooks/*.ts* supabase/functions/*/index.ts 2>/dev/null | sort -rn | head -60\", \"user_facing_description\": \"Listando os arquivos maiores do projeto para focar a auditoria\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XgbviDdKLx1fsDez2bcfyF" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Products.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019iknaEu9uY3SBx5NhB5Vr3" name="code--view" integration-id="code" data="{\"file_path\": \"src/contexts/SubscriptionContext.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016H9MNKUuByEUMS6BcbSwFc" name="code--view" integration-id="code" data="{\"file_path\": \"src/contexts/StoreContext.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0137KDPm8Jhkw98ajDHu7YBX" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/cakto-webhook/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Dp46WSz7dzYvvEwuod99uR" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/check-subscription/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01S2HYhpRWUnMf15rT4zwYFX" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/shopee-auth/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019jPFa5FYAhDqk4VVuSXW1L" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/shopee-callback/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01U7WJ5Kd9jMu8VzArhkLsiW" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/shopee-sync/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Qcy7vpverbhJo595K7Bp5u" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/_shared/shopee.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016s39iKLFAcspf3zBNhUh7u" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Auth.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JHKSgKPqRWAcM72A1o2RTU" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Paywall.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KtW3pETCW4mk3UQMsTcA69" name="code--view" integration-id="code" data="{\"file_path\": \"src/services/billing.service.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ef1R1F61mXid7k5HRgz6ud" name="code--view" integration-id="code" data="{\"file_path\": \"src/services/checkout.service.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XUnVDhMWSAcztKiS5R6BiC" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/calculateProduct.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017QwugAWGiBTtJ96mfMJt4e" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/utils.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01D4nstGojBi22AmQLG5ri12" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/imageUtils.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Wy3Bu3cDGi3oJ99zVFNyRu" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/exportUtils.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HpmF9BUX51dSRfDkN1uKCf" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && grep -rn \\\"console\\\\.log\\\\|console\\\\.warn\\\\|console\\\\.error\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | wc -l && echo \\\"---\\\" && grep -rn \\\"any\\\\b\\\" src/hooks/*.ts src/lib/*.ts 2>/dev/null | wc -l && echo \\\"---\\\" && grep -rn \\\"dangerouslySetInnerHTML\\\" src/ 2>/dev/null && echo \\\"---NO XSS RAW\\\" && grep -rn \\\"localStorage\\\\.\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | wc -l\", \"user_facing_description\": \"Coletando indicadores rápidos: logs, uso de any, XSS, localStorage\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TPRwMUGp6RQeAM8wGyZ5fd" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/shopee-ads/index.ts\", \"lines\": \"1-150\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01APwuRaGUCTmVRtRBJ2m5ND" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/ErrorBoundary.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01U2uP1t8NR5o83ZDSWGdakU" name="code--view" integration-id="code" data="{\"file_path\": \"src/integrations/lovable/index.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GKnXWWjhvUphAK3EGvJstX" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/products/TrendSearchCard.tsx\", \"lines\": \"790-820\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JYJ1LRFjcCMmTa4G7pUdC8" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/validations.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Fe9fkWtL2D4thtzMFkznza" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/fetch-product-trends/index.ts\", \"lines\": \"1-120\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XT31pXeovDAhgAXRjeUmGc" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Home.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TygXnHzEXHciY9VLQLcTkz" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && grep -rn \\\"TODO\\\\|FIXME\\\\|XXX\\\\|HACK\\\" src/ supabase/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" 2>/dev/null | head -30 && echo \\\"---\\\" && grep -rn \\\"window\\\\.location\\\\.\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | head -20 && echo \\\"---\\\" && grep -rn \\\"innerHTML\\\\|eval(\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | head -10 && echo \\\"---\\\" && grep -rn \\\"Access-Control-Allow-Origin.*\\\\*\\\" supabase/functions/ | head -20\", \"user_facing_description\": \"Procurando TODOs, redirects diretos, riscos de XSS e CORS aberto\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01E9Gv25HzXJV3vg7zWf2RdT" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/shopee-seller-discovery/index.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01V7x9Fuuxmhtqb67XxNTMZq" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useAdsData.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ubd9w7DYJKBgWq1TZU19P3" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Profile.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NhwHsEDRoYPJsdScQ5etae" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && grep -rn \\\"useEffect\\\" src/pages/*.tsx 2>/dev/null | wc -l && echo \\\"---deps missing---\\\" && grep -rn \\\"useEffect.*\\\\[\\\\]\\\" src/pages/*.tsx | head -20 && echo \\\"---DUPLICATE FOLDERS---\\\" && ls src/components/products src/components/produtos 2>/dev/null && echo \\\"---\\\" && grep -rln \\\"as any\\\" src/ --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" | wc -l && echo \\\"any tsx files\\\" && grep -rn \\\"memo(\\\\|useMemo\\\\|useCallback\\\" src/pages/Products.tsx | wc -l\", \"user_facing_description\": \"Buscando duplicações e padrões problemáticos\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EYh4dENiTHk8jpqTTLnuoF" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Products.tsx\", \"lines\": \"80-280\"}">
</lov-tool-use>
Já tenho contexto suficiente para a auditoria. Vou validar mais alguns pontos críticos (segurança, RLS, hooks), depois entrego o relatório.
<lov-tool-use id="toolu_vrtx_01MjSEE8dpvA7pSTkEViBUS9" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && grep -rn \\\"ALLOWED_ORIGIN\\\\|allowedOrigin\\\" supabase/functions/ | head && echo \\\"---\\\" && grep -rn \\\"rate.?limit\\\\|RateLimit\\\" supabase/functions/ src/ --include=\\\"*.ts\\\" -i | head -10 && echo \\\"---storage policies---\\\" && grep -rn \\\"bucket_id.*product-images\\\\|bucket_id.*banners\\\" supabase/migrations/ 2>/dev/null | tail -10 && echo \\\"---\\\" && grep -rn \\\"user_id.*=.*placeholder\\\\|00000000-0000-0000-0000\\\" src/ supabase/ 2>/dev/null | head\", \"user_facing_description\": \"Verificando rate-limit, ALLOWED_ORIGIN, storage policies e placeholder UUID\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Mo4n96NQhCg3QMyMrmqNqd" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useAdmin.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Hv7eR8dZUriggF44ygikRv" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useBilling.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CPjB7swge1nksatd3k7bwZ" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useSignOut.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01G99BuCg9aN6EYEyiz5zTHP" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useStoreLimit.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015YR2b8uARedu1YfyDZxXPL" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/ShopeeCallback.tsx\"}">
</lov-tool-use>
Tenho contexto mais que suficiente. Vou fechar com uma rápida verificação na migration recente de RLS e entregar o relatório completo.
<lov-tool-use id="toolu_vrtx_01KJniH1uBTbxL3MwTbid3ae" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/migrations/20260420044552_e08714bb-5d81-4325-a108-fd6d2c4948df.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018npfaarGPkXR5882KN4HnM" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/migrations/20260420042219_c65c59fe-d19a-4e3e-bf2e-4362b69fce7f.sql\"}">
</lov-tool-use>
Tenho o que preciso. Aqui vai a auditoria completa.

---

# Auditoria técnica — Skalify

## A. Resumo executivo

**Saúde geral**: o app está **funcional e seguro o suficiente para produção**, com base sólida (RLS em todas as tabelas, separação de roles via `user_roles`, webhooks com HMAC+timing-safe, refresh de tokens preventivo). Mas tem **dívida técnica acumulada** típica de projeto que cresceu rápido: arquivos gigantes (`Products.tsx` 843 linhas, `useAdsData.ts` 705, `fetch-product-trends/index.ts` 1484), pastas duplicadas (`products/` + `produtos/`), inconsistência idioma (PT-BR + EN no mesmo arquivo), 65 `as any` em hooks/lib e duplicação de lógica de refresh token entre 3 edge functions.

**Maturidade**: ~6.5/10. Padrões certos aplicados (RLS, security definer, CSP de input em PT, validações Zod), mas execução desigual: muitos arquivos seguem o padrão, alguns ignoram (ex: `Products.tsx` faz UI + cálculo + filtros + estatísticas tudo inline).

**Top 10 problemas críticos**

1. **CORS `*` em todos os edge functions** — `ALLOWED_ORIGIN` é secret existente mas não é usado em nenhum deles
2. **CSRF em webhook Cakto** — secret só validado no body; sem rate-limiting, sem replay protection global (idempotency é por order_id, mas eventos sem orderId passam livres)
3. **Placeholder UUID `00000000-…` como user_id** — quebra chave estrangeira lógica, força fallback frágil em `check-subscription`
4. **Duplicação de `refreshTokenIfNeeded`** em 3 edge functions Shopee (`shopee-sync`, `shopee-ads`, `shopee-seller-discovery`) — refator pendente
5. **Pastas duplicadas `components/products/` + `components/produtos/`** — confusão organizacional
6. **`Products.tsx` viola SRP** — 843 linhas fazendo data fetching, filtros, sort, agregações, 4 KPIs, 2 tabs, modal, export
7. **`useAdsData.ts` 705 linhas** — fuzzy match O(n²) com LCS rodando em cada CSV, sem memoização cross-render
8. **`dangerouslySetInnerHTML` em TrendSearchCard** com replace regex — risco baixo (input controlado) mas viola `<input-validation-security>`
9. **Política RLS de `profiles` UPDATE** com 5 sub-selects à mesma tabela — performance ruim em escala, e proteção contra mudança de status pode ser feita por trigger BEFORE UPDATE
10. **Bundle não tem code-split por feature** — `vendor-recharts` e calculadoras (5 tabs) carregam mesmo se usuário só usa preço

---

## B. Lista priorizada de problemas

### CRÍTICA

**B1. CORS `Access-Control-Allow-Origin: *` em edge functions com auth**
- Categoria: Segurança
- Local: `supabase/functions/_shared/shopee.ts:45`, `cakto-webhook/index.ts:37`, `check-subscription/index.ts:4`, `fetch-product-trends/index.ts:5`
- Descrição: Todas as edge functions retornam `*`. Já existe secret `ALLOWED_ORIGIN` configurado, mas não é lido. Permite que qualquer origem chame as functions com o token JWT do usuário (se vazado por XSS em outro site, é exfiltrado).
- Impacto: Aumenta surface de CSRF/XSS pivotada.
- Fix: Ler `Deno.env.get("ALLOWED_ORIGIN")` e devolver origem da whitelist (`app.skalify.com.br`, `escala-calculadora.lovable.app`, preview), validando `req.headers.get("origin")`.

**B2. Webhook Cakto — secret no body, sem origin/IP allowlist**
- Categoria: Segurança
- Local: `supabase/functions/cakto-webhook/index.ts:80-106`
- Descrição: O secret é parseado do JSON body. Se o body falhar antes (`req.json()` joga), retorna 500 sem validar nada. Não há allowlist de IP da Cakto, não há limite de tamanho do body (atacante pode enviar JSON gigante para esgotar isolate). Idempotência só funciona quando `orderId` está presente — eventos sem orderId fazem upsert duplicado.
- Fix: validar `Content-Length` antes de parsear, mover `req.json()` para dentro do try mais cedo, manter idempotency por `(email, event, day)` quando faltar orderId.

**B3. Placeholder UUID em `subscriptions.user_id`**
- Categoria: Bug / Arquitetura
- Local: `cakto-webhook/index.ts:211`, `check-subscription/index.ts:106`
- Descrição: Quando o webhook chega antes do signup, grava `user_id = '00000000-…'` para depois reconciliar. Isso deixa um registro órfão no banco e o reconciliador (`reconcile_subscription_events`) vive na tabela errada (atua em `subscription_events`, não em `subscriptions`).
- Impacto: Usuário paga, faz signup → `check-subscription` precisa fazer fallback por email e atualizar; se o trigger falhar, fica trancado fora.
- Fix: deixar `user_id` `NULL` (a coluna já permite) e adicionar trigger `AFTER INSERT ON auth.users` que reconcilie `subscriptions WHERE email = NEW.email AND user_id IS NULL`.

**B4. Sem rate limiting em edge functions sensíveis**
- Categoria: Segurança
- Local: `cakto-webhook`, `shopee-auth`, `check-subscription`, `fetch-product-trends`
- Descrição: O `fetch-product-trends` faz scraping pesado e tem rate-limit interno do Google Trends (`rateLimited` flag), mas o app pode ser DoS-ado por usuário malicioso disparando 100 buscas/seg — gasta isolate-time de toda a infra.
- Fix: tabela `request_log(user_id, endpoint, ts)` + check no início (≥30 chamadas/min → 429). `useAdsData.ts:127` já tem `checkRateLimit` no client — replicar no servidor.

### ALTA

**B5. `Products.tsx` (843 linhas) viola SRP**
- Categoria: Arquitetura / Manutenção
- Local: `src/pages/Products.tsx`
- Descrição: Faz fetching (via context), 2 useMemo grandes com agregações, 5 filtros, 2 sorts, 4 KPI tiles inline, modal de form, modal de import, dropdown export, banner de draft, chip "sem custo", tabs Produtos/Análise. Re-renderiza tudo a cada digitação no search.
- Impacto: Bug-prone, difícil testar, lento ao filtrar 500+ produtos.
- Fix: extrair `useProductsAnalysis(currentStore)` (memoiza stats/filterCounts/best-worst), `<AnalysisToolbar />`, `<ProductKpiTiles />`, `<ProductsList />`, `<AnalysisList />`. Reduz arquivo a ~200 linhas.

**B6. `useAdsData.ts` (705 linhas) — fuzzy matching O(n²) por CSV**
- Categoria: Performance
- Local: `src/hooks/useAdsData.ts:60-120`
- Descrição: A cada importação roda LCS para cada nome de CSV vs todos os produtos. 500 produtos × 500 linhas CSV × LCS O(N×M) = bilhões de ops.
- Fix: pré-normalizar nomes uma vez, usar índice por trigrama ou usar `levenshtein` de uma lib otimizada (`fast-levenshtein`), e fazer match rápido por `shopee_product_id` antes (já está, mas o fuzzy não é gateado).

**B7. RLS UPDATE policy em `profiles` faz 5 sub-selects na própria tabela**
- Categoria: Performance / Segurança
- Local: tabela `profiles`, policy "Users can update own profile safe"
- Descrição: O `WITH CHECK` repete `(SELECT p.status FROM profiles p WHERE p.user_id = auth.uid())` 5 vezes para garantir que campos críticos não mudem. Em alta concorrência, é caro e difícil de auditar.
- Fix: criar trigger `BEFORE UPDATE` que rejeita mudança em `status`, `trial_inicio`, `trial_fim`, `payment_status`, `payment_email`. Policy fica `auth.uid() = user_id`.

**B8. Storage bucket `product-images` é público mas listing é restrito**
- Categoria: Segurança (já parcialmente mitigado)
- Local: migrations 20260419034707 e 20260419034724, `mem://security/storage-bucket-policies`
- Descrição: O bucket é público (URLs `/storage/v1/object/public/...` acessíveis sem auth). Como path é `userId/productId.jpg`, qualquer um que conheça (ou adivinhe) `userId` + `productId` (UUIDs) acessa. UUID v4 é seguro (~122 bits), mas se um leak ocorrer (logs, Sentry), expõe todas as imagens daquele usuário.
- Fix: usar bucket privado + URLs assinadas com TTL, ou mover URLs para `getSignedUrl(60*60*24*7)` no `mapDbProduct`.

**B9. `dangerouslySetInnerHTML` em `TrendSearchCard.tsx:805`**
- Categoria: Segurança
- Local: `src/components/products/TrendSearchCard.tsx:803-811`
- Descrição: Renderiza `actionInsight` (string vinda de cálculo client-side) substituindo `**...**` por `<strong>`. Hoje é seguro (input vem de função interna), mas se algum dia `actionInsight` puder vir de API/usuário, abre XSS.
- Fix: usar componente `<Markdown />` mínimo ou parsear manualmente com `escapeHtml` antes do replace.

**B10. Edge functions duplicam `refreshTokenIfNeeded`**
- Categoria: Refatoração
- Local: `shopee-sync/index.ts:12-63`, `shopee-ads/index.ts:88-121`, `shopee-seller-discovery/index.ts:14-41`
- Descrição: 3 versões quase idênticas, divergentes em logging e retorno (uma retorna string, outra `{token, needs_reauth}`).
- Fix: mover para `_shared/shopee.ts` como `refreshShopeeTokenIfNeeded(token, appType): Promise<{ token, needs_reauth }>`.

### MÉDIA

**B11. `Profile.tsx` — `loadProfile` chamado sem `await` e sem limpeza**
- Local: `src/pages/Profile.tsx:28-46`
- Descrição: `useEffect(() => { loadProfile() }, [user])` sem cleanup. Se `user` mudar (re-login) durante a carga, set state pode acontecer em componente desmontado → warning.
- Fix: padrão `let cancelled = false; ... if (!cancelled) setX(...)`.

**B12. `AuthContext` silencia erros do `signOut` remoto**
- Local: `src/contexts/AuthContext.tsx:100-110`
- Descrição: `try { signOut() } catch { signOut({scope:'local'}) }`. Se o remoto falhar, refresh tokens da sessão atual continuam válidos no servidor — pode ser revogado por outro device.
- Fix: registrar telemetria do erro; documentar como aceitação consciente.

**B13. `SubscriptionContext` retry com setTimeout sem AbortController**
- Local: `src/contexts/SubscriptionContext.tsx:65-95`
- Descrição: `Promise.race([checkSubscription(...), timeoutPromise])` deixa o fetch real rodando após timeout. Se usuário deslogar nesse meio, o resolve futuro pode chamar `setStatus` com dados de outro user.
- Fix: usar `AbortController` e cancelar; já há ref `resolvedUserId` que mitiga, mas não é à prova.

**B14. `useEffect(() => { loadBanners() }, [])` em `AdminBanners.tsx:63`** — único deps array vazio sem `eslint-disable`. Se `loadBanners` capturar prop, fica stale.

**B15. Pastas duplicadas: `src/components/products/` e `src/components/produtos/`**
- Categoria: Organização
- Fix: unificar em `products/` (idioma do projeto é PT, mas o resto do código usa `products`). Mover `ShopeeImportModal.tsx`.

**B16. `useShopeeToken.ts` chama `(supabase.rpc as any)('get_shopee_token_metadata', ...)`**
- Local: `src/hooks/useShopeeToken.ts:108`
- Descrição: cast pra `any` significa que `types.ts` não foi regenerado depois da migration que criou a função. Pode estar quebrado em runtime se a função não existir.
- Fix: regenerar tipos do Supabase; remover `as any`.

**B17. `Auth.tsx` — `<a href="#">` para Termos e Privacidade**
- Local: `src/pages/Auth.tsx:255-257`
- Descrição: Usuário aceita termos vazios. Risco legal real (LGPD).
- Fix: criar `/termos` e `/privacidade` mesmo que stub.

**B18. `exportUtils.ts` — `window.open('', '_blank')` para PDF**
- Local: `src/lib/exportUtils.ts:176`
- Descrição: Bloqueado por popup-blocker em iOS Safari por padrão; `printWindow.print()` com `setTimeout(250)` é frágil para imagens externas.
- Fix: gerar Blob HTML e abrir em iframe oculto, ou usar `jspdf`.

**B19. `imageUtils.ts` — sem validação de tipo/tamanho antes do upload**
- Local: `src/lib/imageUtils.ts:38-62`
- Descrição: Aceita qualquer dataUrl. Se atacante manipular front, pode subir blob de 50MB ou conteúdo não-imagem (compressão pode falhar silenciosamente em `img.onerror`).
- Fix: já existe `imageValidation.ts` — verificar se está sendo usado; senão, validar magic bytes server-side.

**B20. Bundle splitting parcial**
- Local: `vite.config.ts:24-46`
- Descrição: `vendor-recharts` em chunk próprio (bom), mas calculadoras (5 tabs `Amazon/ML/Shein/Shopee/TikTok`) e `xlsx`/parsers Excel pesados não são lazy.
- Fix: lazy-load calculadoras individuais; lazy-load `shopeeExcelParser` só quando user clica em importar.

### BAIXA

**B21. Console.logs em produção** — 21 ocorrências em `src/`. Logger condicional (`if (import.meta.env.DEV)`) seria mais higiênico.

**B22. `cn()` import + `clsx` + `tailwind-merge`** — fine, já é o padrão shadcn.

**B23. `tailwind.config.lov.json` no root de `src/`** — arquivo Lovable, parece OK.

**B24. `useAdmin` retorna `loading: false` se query desabilitada (sem user)** — pode causar flash de estado errado em `AdminRoute`.

**B25. Migrations: 84 arquivos** — tamanho normal pra produto vivo, mas vale gerar snapshot/baseline pra evitar drift.

**B26. `App.tsx` — `defaultOptions.queries.gcTime: 10*60*1000`** — bom, mas `staleTime: 2min` é agressivo pra dados que mudam pouco (subscriptions, admin role já têm staleTime próprio).

**B27. `public/robots.txt` não checado** — verificar se `/admin/*` está disallowed.

**B28. `Paywall.tsx` — `window.open` com URL de Cakto hardcoded em `PRICING.checkoutMonthly`** — não passa email (o fluxo correto seria via `openCheckout` do `checkout.service.ts`).

---

## C. Revisão por área

**Frontend**: Tailwind tokens consistentes (`mem://design`), shadcn/radix bem aplicado. Problemas: arquivos gigantes, componentes mistos com lógica de negócio. ErrorBoundary correto mas só por rota — sem Sentry/telemetria.

**Backend (Edge Functions)**: HMAC certo, refresh token preventivo, idempotência básica. Problemas: duplicação de código, CORS aberto, sem rate-limit, logs com `console.log` ainda dominantes apesar do `_shared/logger.ts`.

**Banco**: RLS bem implementado, `has_role` security-definer correto, `enforce_store_limit` trigger sólido. Pontos: policy de `profiles` UPDATE pesada, placeholder UUID em `subscriptions`, sem índices explícitos visíveis em colunas filtradas (`user_id` em `products`, `ads_data` etc — provavelmente PK/FK já cobre, mas vale checar `pg_indexes`).

**APIs**: client Supabase bem isolado. `services/billing.service.ts` é o tipo certo de serviço — replicar padrão pra outras features (Shopee, Ads).

**Segurança**: maioria do que importa está certa (RLS, HMAC, Zod, timing-safe, CSV sanitization). Gaps reais: CORS e rate-limit.

**UI/UX**: dark theme estrito, mobile-first OK. Problemas resolvidos nas últimas iterações (KPIs, tabs). Pendente: estados loading/error inconsistentes (cada página inventa o seu, apesar de existir `PageStates.tsx`).

**Performance**: bundle splitting parcial, fuzzy match O(n²), re-renders em `Products.tsx`. React Query bem configurado (`staleTime/gcTime`).

**Infra**: secrets corretas, edge functions com `verify_jwt=false` mas validando JWT em código (correto pro padrão Lovable). Migrations versionadas.

**Testes**: 5 arquivos em `src/test/` (calculateProduct, calculations, validations, shopeeAdsParser, example). Cobre lógica financeira crítica. Faltam: edge functions (Deno test), integração de hooks (RTL), e2e (Playwright).

**Organização**: pastas duplicadas, idioma misto, lógica de negócio em components.

---

## D. Código morto e limpeza

- `tmp/general-ads.csv`, `tmp/product-ads.csv` — fixtures? Mover para `src/test/fixtures/` ou `.gitignore`.
- `localStorage.removeItem('precify-local-images')` em `StoreContext:97` — migração antiga, pode remover após 2-3 meses.
- `src/test/example.test.ts` — provavelmente boilerplate; verificar.
- `bun.lock` + `bun.lockb` + `package-lock.json` — três lockfiles. Decidir um (recomendo `bun.lockb`) e remover os outros.
- `.lovable/plan.md` — verificar se ainda é referenciado.
- `tailwind.config.lov.json` — confirmar com Lovable se é necessário ou se é leftover.
- `useShopeeProducts` + `useShopeeToken` + `useApiAdsData` + `useAdsData` — sobreposição de responsabilidades; consolidar no domínio "Shopee".
- Imports de ícones em `Products.tsx:3` — 19 ícones importados, vários podem estar mortos após os redesigns recentes (`Trophy`, `BarChart3`, `Sparkles`, `LineChart`, `ChevronRight`, `ArrowUpDown` — verificar uso).

---

## E. Melhorias recomendadas

**Quick wins (1-4h cada)**
1. Trocar CORS `*` por whitelist via `ALLOWED_ORIGIN`
2. Remover ícones não usados em `Products.tsx`
3. Cleanup de imports / lockfiles duplicados
4. Adicionar páginas `/termos` e `/privacidade`
5. Logger condicional para `console.log` em dev
6. Regenerar tipos do Supabase, remover `as any` de `useShopeeToken`

**Médio esforço (1-3 dias)**
1. Extrair `useProductsAnalysis` + componentes de `Products.tsx`
2. Unificar refresh token Shopee em `_shared`
3. Lazy-load calculadoras e parsers Excel
4. Trigger BEFORE UPDATE em `profiles` substituindo policy pesada
5. Substituir placeholder UUID por `NULL` + trigger reconciliador
6. Validação magic-bytes server-side de uploads

**Refatorações estruturais (1-2 semanas)**
1. Reorganizar `components/products` + `produtos` num único namespace
2. Camada de serviços por domínio (`services/shopee.service.ts`, `services/ads.service.ts`) absorvendo `supabase.from(...)` direto dos hooks
3. Migrar bucket `product-images` para privado com URLs assinadas
4. Suite de testes Deno para edge functions críticas (cakto-webhook, check-subscription, shopee-callback)
5. Sentry/telemetria com sanitização de payload

**Segurança urgente**
1. CORS whitelist (B1)
2. Rate-limit server-side (B4)
3. Webhook hardening (B2)
4. Storage com URL assinada (B8)

**Layout/UX**
1. Padronizar loading/error usando `PageStates.tsx` em todas as páginas
2. Sparklines nos KPIs (já discutido)
3. Skeleton loaders em vez de spinner full-page
4. Toast de erro com ação ("Tentar novamente") quando aplicável

---

## F. Plano de ação priorizado

**Sprint 1 (segurança crítica)**
1. CORS whitelist em todos edge functions
2. Rate-limit server-side
3. Webhook hardening + remover placeholder UUID
4. Bucket privado + URLs assinadas

**Sprint 2 (qualidade de código)**
5. Quebrar `Products.tsx` em componentes/hooks
6. Quebrar `useAdsData.ts` + otimizar fuzzy match
7. Unificar refresh token Shopee
8. Limpar pastas duplicadas / imports mortos

**Sprint 3 (escala e DX)**
9. Lazy-load calculadoras/parsers
10. Trigger BEFORE UPDATE em `profiles`
11. Sentry + logger condicional
12. Suite de testes Deno

**Backlog contínuo**
- Skeleton loaders, padronização de PageStates, refator dos hooks Shopee num único domain service.

---

## G. Notas finais

| Dimensão | Nota |
|---|---|
| Segurança | **7/10** — base sólida, mas CORS aberto e sem rate-limit puxam pra baixo |
| Performance | **6.5/10** — React Query bem usado, bundle parcial; matching O(n²) e re-renders pesam |
| Qualidade do código | **6/10** — padrões certos aplicados desigualmente; arquivos de 800+ linhas |
| Arquitetura | **6.5/10** — separação contexts/hooks/services existe mas não é consistente |
| Manutenção | **6/10** — duplicação Shopee + pastas redundantes + idioma misto criam atrito |
| UX/UI | **7.5/10** — design system coeso, mobile/desktop OK, iterando bem nos refinements |
| Confiabilidade | **7/10** — ErrorBoundary, retry, idempotency básica, mas sem telemetria de produção |

**Média geral: 6.6/10** — produto sério em produção que precisa de hardening de segurança e refatoração de 2-3 arquivos pivô antes de escalar pra 5x usuários.

---

## Listas finais

**Arquivos mais problemáticos**
1. `src/pages/Products.tsx` (843 linhas)
2. `src/hooks/useAdsData.ts` (705)
3. `supabase/functions/fetch-product-trends/index.ts` (1484)
4. `supabase/functions/shopee-ads/index.ts` (777)
5. `src/pages/Integracoes.tsx` (732)
6. `src/contexts/StoreContext.tsx` (acoplado demais ao Supabase)

**Correções mais urgentes**
1. CORS whitelist
2. Rate-limit server-side
3. Webhook Cakto hardening
4. Placeholder UUID → NULL + trigger
5. Bucket privado / URLs assinadas

**Refatorações de maior ganho**
1. Quebrar `Products.tsx` em hook + 4-5 componentes
2. Mover lógica Supabase de hooks para `services/*.service.ts`
3. Unificar `refreshTokenIfNeeded` em `_shared`
4. Otimizar fuzzy match em `useAdsData`
5. Lazy-load calculadoras e parsers

**Vulnerabilidades exploráveis (em ordem de risco)**
1. CSRF amplificado por CORS `*` (médio)
2. Webhook Cakto sem rate-limit/IP-allowlist (médio)
3. Imagens de produto enumeráveis se UUID vazar em logs (baixo)
4. XSS latente no `dangerouslySetInnerHTML` se fonte mudar (baixo)
5. DoS via `fetch-product-trends` sem rate-limit (médio)

**Melhorias de UX**
1. Skeleton loaders no lugar de spinner full-page
2. Sparklines nos KPI tiles
3. Padronização de empty/loading/error via `PageStates`
4. Termos/Privacidade reais
5. Toast de erro com botão "Tentar novamente"

<lov-actions>
<lov-suggestion message="Aplique o Sprint 1 completo de segurança: CORS whitelist via ALLOWED_ORIGIN nas edge functions, rate-limit server-side em cakto-webhook + check-subscription + fetch-product-trends, e remoção do placeholder UUID '00000000-...' substituindo por user_id NULL com trigger reconciliador.">Sprint 1: Hardening de segurança crítica</lov-suggestion>
<lov-suggestion message="Refatore src/pages/Products.tsx (843 linhas) extraindo: useProductsAnalysis hook (memoiza stats/filterCounts/best-worst), <AnalysisToolbar />, <ProductKpiTiles />, <ProductsList />, <AnalysisList />. Reduza o arquivo a ~200 linhas mantendo o comportamento atual.">Quebrar Products.tsx</lov-suggestion>
<lov-suggestion message="Unifique a função refreshTokenIfNeeded duplicada em shopee-sync, shopee-ads e shopee-seller-discovery movendo para supabase/functions/_shared/shopee.ts como refreshShopeeTokenIfNeeded(token, appType): Promise<{token, needs_reauth}>.">Unificar refresh token Shopee</lov-suggestion>
<lov-suggestion message="Otimize o fuzzy matching em src/hooks/useAdsData.ts (705 linhas) substituindo o LCS O(n²) por trigram index ou fast-levenshtein, gateando o fuzzy só quando o match exato por shopee_product_id falha, e memoizando nomes normalizados cross-render.">Otimizar fuzzy match useAdsData</lov-suggestion>
<lov-suggestion message="Migre o bucket Storage 'product-images' de público para privado com URLs assinadas (TTL 7 dias) geradas no mapDbProduct. Atualiza o mapper em storeMappers.ts e remove getPublicUrl em imageUtils.ts.">Storage privado + URLs assinadas</lov-suggestion>
</lov-actions>