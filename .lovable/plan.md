

## Plano: Ajustar importação de produtos para usar dados da API de Ads

### Problema
O botão "Importar da Shopee" chama `shopee-sync` (requer token Seller), mas o usuário só tem token Ads. Os produtos já existem via `source: "ads_api"`.

### Correção

**Arquivo: `src/components/produtos/ShopeeImportModal.tsx`**

1. Quando não há token Seller conectado, em vez de mostrar erro genérico, verificar se há token Ads disponível
2. Se há token Ads: usar a função `shopee-ads` para sincronizar dados de produtos via API de Ads (que já cria stubs de produtos), e depois listar os produtos existentes no banco com `source = 'ads_api'` para o usuário selecionar quais ativar/importar
3. Alterar o fluxo do modal:
   - Sem token Seller + Com token Ads: buscar produtos direto da tabela `products` onde `source = 'ads_api'` e `draft = true`, permitindo ao usuário "ativar" esses produtos (tirar do draft)
   - Sem nenhum token: mostrar mensagem para conectar em Integrações
4. Adicionar opção de "Atualizar via Ads" que chama `syncAdsOnly()` para refresh dos dados

### Arquivo modificado
- `src/components/produtos/ShopeeImportModal.tsx`

