

## Plano: Refatorar página Integrações conforme HTML de referência

### Resumo
Reescrever `Integracoes.tsx` seguindo a estrutura do HTML fornecido: remover jargões técnicos, substituir token por barra de progresso com dias restantes, unificar estado desconectado, remover toggle de notificação, e adicionar fluxo de conexão em cadeia (seller → ads).

### Mudanças

#### 1. `src/pages/Integracoes.tsx` — Reescrita completa

**Remover:**
- `notifySync` state e seu toggle
- `getTokenExpiry` (data absoluta)
- Textos "Seller In House System · Partner ID 2032348" e "Ads Service · Partner ID 2032223"
- "Shopee Ads API" → "Shopee Ads"
- Estado desconectado duplicado (dois cards separados)

**Adicionar:**
- `getTokenDaysRemaining(token)` e `getTokenProgressPercent(token)` — calcula dias restantes dos 365 e percentual para barra de progresso
- Token bar com barra de progresso visual ("🔑 Token válido · X dias restantes")
- Descrições user-friendly: "Produtos · Pedidos · Estoque" e "ROAS · Campanhas · Gasto"
- `handleConnectBoth()` — salva flag `skalify_pending_ads_oauth` no localStorage e inicia OAuth seller

**Estados da página:**
1. **Nenhum conectado**: Banner onboarding + card unificado "Conectar com Shopee" com 4 passos + card Ads com opacity 0.5 ("Conecte a Shopee primeiro")
2. **Seller conectado, Ads não**: Card Seller completo + card Ads com botão "Conectar"
3. **Ambos conectados**: Dois cards completos com barra de progresso do token

#### 2. `src/pages/Integracoes.tsx` — useEffect para auto-connect Ads

Adicionar `useEffect` que verifica:
- Se `skalify_pending_ads_oauth` existe no localStorage
- Se seller está conectado e ads não
- Remove a flag e inicia `adsHook.startOAuth('ads')` após 1.5s com toast informativo

#### 3. `supabase/functions/shopee-callback/index.ts` — Redirect para integrações

Alterar redirect de sucesso de `/roas?shopee_connected=true` para `/configuracoes/integracoes?shopee_connected=true&app_type=${appType}` — pois é a página onde o fluxo faz sentido agora.

### Arquivos modificados
```
src/pages/Integracoes.tsx                    — reescrita com todas as mudanças
supabase/functions/shopee-callback/index.ts  — redirect para /configuracoes/integracoes
```

### Resultado
- Página limpa, sem jargões técnicos
- Token mostrado como "X dias restantes" com barra de progresso
- Fluxo unificado de conexão: um clique conecta seller, depois automaticamente redireciona para ads
- Estado parcial (só seller) mostra botão claro para conectar ads separadamente

