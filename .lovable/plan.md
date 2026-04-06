

# Auditoria Completa do Projeto Skalify

---

## Pontos Positivos

- **RLS bem implementado** — Todas as tabelas possuem políticas de Row-Level Security com filtro por `auth.uid()`. Tabelas sensíveis (`subscriptions`, `subscription_events`) bloqueiam INSERT/UPDATE/DELETE do cliente
- **Validação Zod** — Inputs de formulários e webhook Cakto validados com schemas Zod
- **Timing-safe comparison** — Webhook Cakto usa `timingSafeEqual` para validar segredo
- **Sanitização de CSV** — Verificação de XSS, tamanho máximo, validação de magic bytes em imagens
- **Separação de credenciais** — Nenhuma API key da Shopee exposta no frontend; tudo via Edge Functions
- **Error Boundary** — Implementado com reset por rota
- **Admin role via RPC** — `has_role()` com `SECURITY DEFINER` evita recursão de RLS
- **Lazy loading** — Todas as páginas usam `React.lazy`
- **Subscription resilience** — Retry com backoff, cache do último status, estado "error" separado de "expired"

---

## Bugs e Erros

### ALTO: `ShopeeCallback` sem proteção de rota
**Arquivo:** `src/App.tsx` linha 168
```tsx
<Route path="/shopee-callback" element={<ShopeeCallback />} />
```
A rota não tem `ProtectedRoute` nem `AuthRoute`. Qualquer pessoa pode acessar `/shopee-callback` diretamente. Embora o Edge Function valide o `state`, o componente frontend pode mostrar UI confusa ou executar lógica inesperada sem usuário autenticado.
**Correção:** Envolver com `ProtectedRoute` ou adicionar guard no componente.

### MEDIO: `deleteStore` não filtra por `user_id`
**Arquivo:** `src/contexts/StoreContext.tsx` linhas 155-157
```tsx
await supabase.from('products').delete().eq('store_id', storeId);
await supabase.from('stores').delete().eq('id', storeId);
```
O RLS protege, mas a boa prática é incluir `.eq('user_id', user.id)` como defesa em profundidade (anti-IDOR). O mesmo vale para `updateStore`, `updateStoreConfig`, `updateProduct`, `deleteProduct`.
**Correção:** Adicionar filtro explícito de `user_id` em todas as operações de mutação.

### MEDIO: `updateProduct` não valida `user_id`
Qualquer `productId` válido pode ser passado. O RLS bloqueia, mas um erro silencioso ocorre sem feedback claro ao usuário.

### BAIXO: `NotFound` sem proteção
```tsx
<Route path="*" element={<NotFound />} />
```
Página 404 acessível sem login — normalmente aceitável, mas pode vazar layout/componentes se `NotFound` importar contextos de auth.

---

## Segurança

### ALTO: Webhook Cakto CORS muito restritivo pode bloquear chamadas legítimas
**Arquivo:** `supabase/functions/cakto-webhook/index.ts` linha 37
```ts
"Access-Control-Allow-Origin": "https://pay.cakto.com.br"
```
Isso é bom para segurança. Porém, se o Cakto enviar de outro domínio/subdomínio, falhará silenciosamente. Verificar se o domínio exato está correto.

### MEDIO: `check-subscription` aceita qualquer origem
```ts
"Access-Control-Allow-Origin": "*"
```
Permite que qualquer site chame o endpoint. Embora requeira Bearer token, um token roubado pode ser usado de qualquer origem. Considerar restringir ao domínio da app.

### MEDIO: Shopee tokens acessíveis via SELECT pelo cliente
O `useShopeeToken` faz `select('*')` na tabela `shopee_tokens`, que retorna `access_token` e `refresh_token` ao frontend. Tokens de API da Shopee expostos no JavaScript do navegador.
**Correção:** Criar uma view ou RPC que retorne apenas `shop_id`, `app_type`, `expire_in`, `token_created_at` — nunca os tokens em si.

### BAIXO: `shopee-callback` upsert sem unique constraint explícito
Linha 145: `onConflict: "user_id,store_id,shop_id,app_type"` — verificar que esse índice único existe no banco, senão o upsert falhará silenciosamente inserindo duplicatas.

---

## Performance

### MEDIO: `AdsDetailFullView.tsx` com 1727 linhas
Componente monolítico difícil de manter. Re-renderizações desnecessárias em cada mudança de estado.
**Correção:** Separar em subcomponentes (EconomiaPorVenda, AcosVsMargem, HaloEffect, etc).

### MEDIO: `StoreContext` recarrega todos os produtos de todas as lojas
`fetchStoresAndProducts` busca tudo de uma vez. Com muitos produtos, isso pode ser lento.
**Correção:** Paginar ou buscar produtos apenas da loja atual.

### BAIXO: `queryClient` instanciado fora do componente
```tsx
const queryClient = new QueryClient({...});
```
Funciona, mas em cenários de SSR ou testes pode causar cache compartilhado. Aceitável para SPA client-only.

---

## Qualidade de Código

### MEDIO: Type assertions com `as any` no hook `useShopeeToken`
```ts
query = (query as any).eq('app_type', appType);
```
Indica que os tipos gerados do Supabase não refletem os filtros necessários. Pode esconder bugs.
**Correção:** Usar encadeamento adequado ou tipar corretamente.

### MEDIO: `useApiAdsData` usa `as any` repetidamente
Mesmo problema — falta de tipagem nos queries encadeados.

### BAIXO: Imports não utilizados potenciais
`AdsDetailFullView.tsx` importa muitos ícones — verificar se todos são usados.

### BAIXO: `msg` declarado mas não usado
**Arquivo:** `src/hooks/useShopeeToken.ts` linhas 149 e 174
```ts
const msg = res.error?.message || 'Erro ao sincronizar dados da loja';
```
Variável declarada mas nunca referenciada.

---

## UX/UI

### MEDIO: Inputs numéricos sem formatação de moeda
Os inputs de preço de venda e custo no card "Economia por Venda" aceitam notação com ponto (padrão JS) mas usuários brasileiros esperam vírgula. `parseFloat` ignora vírgula.
**Correção:** Usar `inputMode="decimal"` e normalizar vírgula para ponto no onChange.

### MEDIO: Erro de assinatura sem ação clara
`ProtectedRoute` mostra "Erro ao verificar assinatura" com botão "Tentar novamente", mas sem explicação do que aconteceu nem link para suporte.

### BAIXO: `Auth.tsx` tem links de Termos e Privacidade apontando para `#`
```tsx
<a href="#" style={{ color: '#e85d00' }}>Termos de Uso</a>
```
Links não funcionais — pode gerar problemas de compliance.

### BAIXO: Avatar imports sem fallback
```tsx
import avatar1 from '@/assets/avatar1.jpg';
```
Se os arquivos não existirem, o build falha. Não há fallback visual.

---

## Configuração e Infra

### ALTO: `VITE_CAKTO_URL` não está no `.env`
O checkout service faz fallback para `PRICING.checkoutMonthly`, mas a variável principal está ausente. Isso já foi corrigido no plano anterior, mas confirma que a configuração está incompleta.

### MEDIO: `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` usados com `!` (non-null assertion)
**Arquivo:** `check-subscription/index.ts` linha 68-69
```ts
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
```
Se a variável não existir, crash em runtime sem mensagem útil.
**Correção:** Validar e retornar 500 com mensagem clara, como já feito no cakto-webhook.

---

## Resumo por Prioridade

| Risco | Qtd | Principais |
|-------|-----|------------|
| Alto  | 3   | Tokens Shopee expostos no frontend, ShopeeCallback sem guard, VITE_CAKTO_URL ausente |
| Medio | 9   | Falta `user_id` em mutations, AdsDetailFullView monolítico, `check-subscription` CORS `*`, inputs sem formatação BR, `as any` |
| Baixo | 5   | Links de termos `#`, imports não usados, variáveis declaradas não usadas |

---

## Correções Recomendadas (Prioridade)

1. **Criar RPC/view para shopee_tokens** que retorne apenas metadados (sem access/refresh token) ao frontend
2. **Adicionar `user_id` explícito** em todas as operações de DELETE/UPDATE no StoreContext
3. **Envolver `/shopee-callback`** em ProtectedRoute
4. **Validar env vars** no `check-subscription` com guard explícito (como no cakto-webhook)
5. **Refatorar `AdsDetailFullView`** em subcomponentes menores
6. **Adicionar `inputMode="decimal"`** e normalização de vírgula nos inputs monetários
7. **Restringir CORS** do `check-subscription` ao domínio da app

