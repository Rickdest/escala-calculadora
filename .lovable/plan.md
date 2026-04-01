

## Plano: Reestruturar Integração Shopee em 3 abas + Nova página Performance

### Visão Geral

Reorganizar a integração Shopee seguindo o mockup fornecido:
1. **Aba Ads** — ajustar estados (vazio e com dados) com botão API desabilitado + chip de status
2. **Página Produtos** — importação Shopee, campos com 🔒, chip "sem custo"  
3. **Página Settings** — card de integração Shopee + seção Ads
4. **Nova página Performance** — dados de pedidos/vendas por produto (90 dias), acessível como guia no nav
5. **Feature flags** — arquivo centralizado de controle

### Alterações por arquivo

**1. `src/config/features.ts`** (novo)
- Flags: `SHOPEE_ADS_API_READY: false`, `SHOPEE_AUTO_SYNC_READY: true`, `SHOPEE_PRODUCTS_IMPORT_READY: true`

**2. Migração SQL** — adicionar colunas em `products`
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS shopee_item_id bigint,
  ADD COLUMN IF NOT EXISTS shopee_synced_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS products_shopee_item_id_idx 
  ON products(shopee_item_id) WHERE shopee_item_id IS NOT NULL;
```
- A tabela já tem `image_url`, `stock_quantity`, `sale_price`, `cost_price` — não precisa adicionar

**3. `src/components/roas/AdsEmptyState.tsx`** — modificar
- Botão "Sincronizar via Shopee API" fica `disabled` com badge "em breve"
- Texto explicativo abaixo sobre CSV ser o fluxo garantido

**4. `src/components/roas/AdsTab.tsx`** — modificar header
- Quando `hasData`: mostrar chip de status "Shopee conectada · sync há Xh" (se conectada)
- Botão "Atualizar CSV" sempre visível
- Botão "Sincronizar" só aparece quando `FEATURES.SHOPEE_ADS_API_READY === true` (hoje escondido)
- Remover botão "Integrar" atual

**5. `src/pages/Settings.tsx`** — adicionar seção
- Card "Integração Shopee": status de conexão, nome da loja, expiração do token, botões reconectar/desconectar
- Toggle de sync automático (visual, controlado por flag)
- Nota somente leitura
- Seção separada "Shopee Ads" explicando CSV como fluxo atual

**6. `src/pages/Products.tsx`** — modificar
- Header: botão "Importar da Shopee" (chama sync de produtos)
- Chip "⚠ X sem custo" quando há produtos sem `cost_price`
- Cards de produtos importados da Shopee: campos preço/estoque com badge 🔒 e tooltip
- Campo custo editável com borda colorida (laranja = tem, vermelho = sem)
- Nota rodapé somente leitura

**7. `src/hooks/useShopeeProducts.ts`** (novo)
- Função `importarProdutosDaShopee()`: chama `shopee-sync`, faz upsert nos `products` via Supabase
- Upsert por `shopee_item_id`, SEM sobrescrever `cost_price`
- Retorna contagem de importados e sem custo

**8. Nova página `src/pages/Performance.tsx`**
- Dados de performance de vendas (90 dias) via Shopee sync
- Resumo: total pedidos, faturamento, ticket médio
- Ranking de produtos por vendas
- Variações mais vendidas
- Pedidos por status
- Reutiliza lógica do `PerformanceReport` já existente no modal

**9. `src/App.tsx`** — adicionar rota `/performance`

**10. `src/components/layout/BottomNavigation.tsx`** — adicionar item "Performance" (ícone TrendingUp)

**11. `src/components/layout/Sidebar.tsx`** — adicionar item "Performance"

### Regras de negócio

- O app NUNCA escreve na Shopee (somente leitura)
- `cost_price` é o único campo editável pelo usuário nos produtos importados
- Upsert de sync exclui `cost_price` da query para preservar valor do usuário
- Feature flags controlam visibilidade dos botões de API

### Detalhes técnicos

| Item | Tipo | Complexidade |
|------|------|-------------|
| Feature flags | Novo arquivo | Baixa |
| Migração SQL | 2 colunas + index | Baixa |
| AdsEmptyState | Edição | Baixa |
| AdsTab header | Edição | Média |
| Settings Shopee | Edição | Média |
| Products Shopee | Edição | Alta |
| useShopeeProducts | Novo hook | Média |
| Performance page | Nova página | Média |
| Nav updates | Edição (2 arquivos) | Baixa |

### Ordem de implementação
1. Feature flags + migração SQL
2. AdsEmptyState + AdsTab header
3. Settings (card Shopee)
4. Performance page + rotas + nav
5. Products (importação + campos lock)
6. useShopeeProducts hook

