

## Plano: Limpar dados ao desconectar + Esconder API Seller

### Contexto
1. Ao desconectar uma API, os dados associados permanecem no banco -- o usuário espera que sejam apagados.
2. A API Seller (In House System) não está funcionando para usuários externos, então não deve aparecer como opção.

### Mudanças

#### 1. Feature flag para esconder Seller API
**Arquivo:** `src/config/features.ts`
- Adicionar `SHOPEE_SELLER_API_READY: false`

#### 2. Página Integrações -- esconder card Seller + limpar dados ao desconectar
**Arquivo:** `src/pages/Integracoes.tsx`

**Esconder Seller:**
- No estado `neitherConnected`, não renderizar o card "Shopee Seller" (condicionar com feature flag)
- No card de Seller quando Ads está conectado, esconder o botão "Conectar" do Seller e mostrar apenas como "Indisponível no momento"
- Se já estiver conectado, manter visível para permitir desconexão

**Limpar dados ao desconectar Seller (`handleDisconnect`):**
- Após deletar `shopee_tokens`, deletar também:
  - `shopee_performance` (where `user_id`)
  - `product_performance` (where `user_id`)

**Limpar dados ao desconectar Ads (`handleDisconnectAds`):**
- Após deletar `shopee_tokens`, deletar também:
  - `shopee_ads_by_product` (where `user_id`)
  - `shopee_ads_import_jobs` (where `user_id`) -- RLS bloqueia DELETE, então ignorar erro
  - `ads_data` (where `user_id`)
  - `product_ads_metrics` (where `user_id`)
- Atualizar `product_performance` para limpar colunas `ads_*` (set null)

**Diálogo de confirmação:** Atualizar texto para avisar que os dados serão apagados.

#### 3. Página Performance -- remover referências ao Seller API
**Arquivo:** `src/pages/Performance.tsx`
- Remover botão "Conectar Shopee" (Seller) do empty state
- Remover botão "Atualizar API" / "Sincronizar API" do header
- Manter apenas o fluxo de importação Excel como fonte principal
- Remover a aba "Pedidos (API)" quando não houver dados da API

#### 4. Tabelas afetadas na limpeza

| Desconectar | Tabelas limpas |
|---|---|
| Seller | `shopee_performance`, `product_performance` |
| Ads | `shopee_ads_by_product`, `ads_data`, `product_ads_metrics`, campos `ads_*` em `product_performance` |

### Arquivos modificados
- `src/config/features.ts` -- nova flag
- `src/pages/Integracoes.tsx` -- limpeza de dados + esconder Seller
- `src/pages/Performance.tsx` -- remover referências ao Seller API

