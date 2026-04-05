

## Diagnóstico: Por que a aba Performance parou de funcionar

### O que aconteceu

A aba Performance depende exclusivamente da **API Seller** (função `shopee-sync`), que chama endpoints como:
- `/api/v2/order/get_order_list` — pedidos
- `/api/v2/product/get_item_list` — produtos
- `/api/v2/shop/get_shop_info` — info da loja

O backend filtra explicitamente por `app_type: 'seller'` na linha 337 de `shopee-sync/index.ts`:
```typescript
.eq("app_type", "seller")
```

### Antes vs Agora

**Antes**: Você tinha um token Seller conectado → `shopee-sync` encontrava o token → dados de pedidos/produtos eram carregados → Performance funcionava.

**Agora**: Você desconectou o token Seller (ou ele expirou). Só tem o token **Ads** conectado. O `shopee-sync` não encontra token com `app_type: 'seller'` e retorna erro `"No Shopee token found"`.

A aba Performance usa `useShopeeToken()` sem filtro de tipo, então encontra o token Ads e mostra `isConnected: true` — mas ao clicar "Atualizar", a sync falha porque o backend exige token Seller.

### O que a API Ads **não** fornece
- Pedidos reais (order_list, order_detail)
- Dados de produtos (estoque, preço, avaliações)
- Faturamento real por produto

A API Ads só tem: campanhas, impressões, cliques, gastos, GMV estimado.

### Solução proposta

1. **Corrigir o estado de conexão na aba Performance** — usar `useShopeeToken('seller')` em vez de `useShopeeToken()` sem filtro, para mostrar corretamente "Conecte sua Shopee Seller" quando só Ads está conectado.

2. **Reconectar o Seller** — o fluxo OAuth do Seller já foi corrigido (preflight removido). Basta reconectar com sua conta (a que tem Go Live) para restaurar os dados de Performance.

3. **Opcional: mostrar dados parciais de Ads** — quando só Ads estiver conectado, exibir GMV/gastos/ROAS por produto na aba Performance como dados parciais, com aviso de que dados completos requerem a API Seller.

### Arquivos a modificar
- `src/pages/Performance.tsx` — trocar `useShopeeToken()` por `useShopeeToken('seller')` e ajustar mensagem de conexão
- `src/hooks/usePerformanceData.ts` — usar `useShopeeToken('seller')` para que o `syncStoreData` busque o token correto

