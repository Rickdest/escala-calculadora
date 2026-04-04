

## Plano: Reconexão automática + botão "Reconectar" visível

### Problemas
1. **Não aparece opção de reconectar**: Quando o token está conectado mas expirado, o `ConnectionCard` mostra apenas "✅ Conectado" sem ação — o usuário fica preso
2. **Vai ter que fazer toda vez?**: Sim, tokens Shopee expiram (~4h access, ~30 dias refresh). Quando o refresh token também expira, precisa re-autorizar manualmente. Mas podemos **minimizar** isso com refresh automático preventivo

### Solução

#### 1. Backend: retornar erro claro quando token expirado
No `shopee-ads/index.ts`, após `refreshTokenIfNeeded`, verificar se a primeira chamada retorna `invalid_access_token` e retornar `{ error: "token_expired", needs_reauth: true }` em vez de `{ campaigns: 0 }` silenciosamente.

Mesmo tratamento no `shopee-sync/index.ts`.

#### 2. Frontend: `ConnectionCard` com estado "expirado"
No `ShopeeIntegrationModal.tsx`, alterar o `ConnectionCard` para aceitar um terceiro estado: **expirado**. Quando conectado mas expirado, mostrar badge amarelo "⚠ Expirado" com botão "Reconectar" que chama `startOAuth` novamente (o callback vai sobrescrever o token antigo).

#### 3. Frontend: detectar token expirado na aba Ads
No `useShopeeToken`, adicionar campo `isExpired` baseado na resposta do sync. Quando `syncAdsOnly` retorna `{ needs_reauth: true }`, setar estado e mostrar alerta na aba Ads com botão direto "Reconectar API de Ads".

#### 4. Refresh preventivo (reduzir reconexões manuais)
No backend, melhorar `refreshTokenIfNeeded`:
- Logar quando o refresh falha (hoje falha silenciosamente)
- Se o refresh falhar, retornar `needs_reauth: true` na response
- Considerar margem maior (renovar quando faltam 24h, não 5 min)

### Resultado
- Botão "Reconectar" visível quando o token expira (não fica mais preso em "Conectado")
- Alerta claro na aba Ads quando precisa re-autorizar
- Refresh preventivo reduz a frequência de reconexão manual (~1x por mês no pior caso)
- Não precisa reconectar "toda vez" — só quando o refresh token de 30 dias expira

### Arquivos modificados
```text
supabase/functions/shopee-ads/index.ts       — retornar needs_reauth quando token inválido
supabase/functions/shopee-sync/index.ts      — mesmo tratamento
src/hooks/useShopeeToken.ts                  — detectar needs_reauth, expor isExpired
src/components/roas/ShopeeIntegrationModal.tsx — ConnectionCard com estado expirado + botão Reconectar
src/components/roas/AdsTab.tsx               — alerta de reconexão quando token expirado
```

