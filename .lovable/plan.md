

## Plano: Separar conexão Seller e Ads no card inicial

### Problema
Quando nenhuma API está conectada, só aparece um botão "Conectar com Shopee" que inicia o OAuth Seller. Como a API Seller só funciona para a conta do dono do app (sem Go Live), outros usuários ficam travados sem poder conectar a API Ads (que funciona para qualquer conta).

### Solução
Modificar o card de onboarding (`neitherConnected`) para mostrar **duas opções separadas**:

1. **Conectar Seller** — botão para OAuth Seller (produtos, pedidos, estoque)
2. **Conectar Ads** — botão para OAuth Ads (ROAS, campanhas, gasto)

Cada botão inicia o OAuth com o `app_type` correto. Após conectar qualquer um dos dois, os cards individuais (Seller e Ads) já aparecem normalmente como estão hoje.

### Também
- Mostrar o card de Ads mesmo quando **só Ads** está conectado (sem Seller) — já funciona pelo `adsConnected` na condição `(sellerConnected || adsConnected)`
- Mostrar o card de Seller para conectar mesmo quando só Ads está conectado — já funciona

### Arquivo modificado
- `src/pages/Integracoes.tsx` — substituir o card unificado por dois botões separados no estado `neitherConnected`

