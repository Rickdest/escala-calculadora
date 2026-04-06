

## Plano: Correções da Auditoria Skalify

Analisei o documento completo. Vou focar nos itens que **podemos corrigir aqui** (itens de código). Os itens 1 e 2 (.env no Git) e item 6 (CSVs no Git) são problemas de **histórico Git** — o .env é gerenciado automaticamente pelo Lovable e não pode ser editado, e operações git (rm, commit) não são permitidas neste ambiente. Esses precisam ser tratados manualmente no GitHub.

### Itens a corrigir

**1. [ALTO] Normalizar planName no webhook Cakto** (item 4.2)
- Arquivo: `supabase/functions/cakto-webhook/index.ts`
- Adicionar função `normalizePlanName()` que converte "Skalify Pro Mensal" → `monthly`, "Skalify Anual" → `yearly`
- Aplicar antes de salvar no `subscriptionData`

**2. [ALTO] Adicionar plano legado 'pro' ao PLAN_STORE_LIMITS** (item 4.3)
- Arquivo: `src/constants/pricing.ts`
- Adicionar `pro: 2` ao mapa de limites

**3. [ALTO] Trigger no banco para enforcement server-side do limite de lojas** (item 4.1)
- Migration SQL: criar função `enforce_store_limit()` + trigger `BEFORE INSERT ON stores`
- Consulta a tabela `subscriptions` para obter o plano e valida o limite

**4. [MÉDIO] CORS restrito nas Edge Functions** (item 3.4)
- Arquivo: `supabase/functions/check-subscription/index.ts`
- Trocar `"*"` por `Deno.env.get("ALLOWED_ORIGIN")` (secret já existe)

**5. [BAIXO] .gitignore — adicionar .env e tmp/** (item 3.1 + 3.3)
- Arquivo: `.gitignore`
- Adicionar `.env`, `.env.local`, `.env.*.local`, `tmp/`

**6. [MÉDIO] Invalidar cache de stores após refresh de subscription** (item 4.4)
- Arquivo: `src/contexts/SubscriptionContext.tsx`
- Após `refreshSubscription()`, chamar `queryClient.invalidateQueries(['stores-and-products'])`

### Itens que NÃO serão alterados (e por quê)

| Item | Motivo |
|------|--------|
| .env no Git (rotacionar chaves) | .env é auto-gerenciado pelo Lovable, não editável |
| Remover CSVs do histórico Git | `git rm` não é permitido neste ambiente |
| URLs checkout hardcoded | Decisão deliberada — variáveis de ambiente no Lovable já são usadas para outros fins; o fallback garante funcionamento |
| ErrorBoundary + Sentry | Backlog, requer conta Sentry configurada |
| subscriptions sem INSERT/UPDATE para user | Correto por design — só service_role escreve |

### Arquivos modificados
- `supabase/functions/cakto-webhook/index.ts`
- `supabase/functions/check-subscription/index.ts`
- `src/constants/pricing.ts`
- `src/contexts/SubscriptionContext.tsx`
- `.gitignore`
- Nova migration SQL (trigger `enforce_store_limit`)

