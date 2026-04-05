

## Diagnóstico

A aba Performance usa a API **Seller** (via `shopee-sync`). Os logs mostram o problema real:

1. **Token refresh falha com `"shop_no_linked"`** — o parceiro (Partner ID) e a loja não estão mais vinculados (provavelmente porque o usuário trocou de conta ou a autorização expirou)
2. A função `refreshTokenIfNeeded` marca `needs_reauth: true` mas **continua a execução** com o token inválido
3. Todas as chamadas da API retornam **403 `invalid_acceess_token`**
4. O `shopeeGet` retorna `{ error: "HTTP 403" }` em vez de lançar exceção — o código de pedidos interpreta isso como "0 pedidos"
5. A função **sobrescreve** os dados existentes com dados vazios (0 pedidos, 0 faturamento)

## Plano de correção

### 1. Parar sincronização quando `needs_reauth` é `true`
Em `shopee-sync/index.ts`, logo após `refreshTokenIfNeeded`, se `needs_reauth` for `true`, retornar imediatamente com uma mensagem amigável em vez de continuar chamando APIs com token inválido.

### 2. Não sobrescrever dados existentes com dados vazios
No bloco de persistência do `shopee_performance`, verificar se `total_orders > 0` antes de fazer upsert. Se o sync retornou 0 pedidos, não sobrescrever o que já está salvo.

### 3. Mostrar aviso de reconexão no frontend
Em `usePerformanceData`, quando `sync()` retorna `needs_reauth: true`, exibir toast informando que é necessário reconectar a Shopee Seller, em vez de "Nenhum dado disponível".

## Arquivos modificados
- `supabase/functions/shopee-sync/index.ts` — early return quando token inválido + proteção contra overwrite
- `src/hooks/usePerformanceData.ts` — tratar `needs_reauth` no retorno do sync

## Sem migration

