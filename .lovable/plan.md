

## Plano: Verificação de bugs e melhorias

### Bugs encontrados

**1. Flag `PERFORMANCE_CONNECTED_REAL_ACCOUNT` morta**
- Declarada em `features.ts` mas não importada em nenhum arquivo (foi removida do Performance.tsx na última edição)
- **Ação**: Remover da `features.ts`

**2. `mapDbProduct` usa `(p as any).draft` e `(p as any).source`**
- As colunas `draft` e `source` existem no banco mas o tipo gerado `Tables<'products'>` não foi atualizado automaticamente
- O `as any` funciona em runtime mas perde type-safety
- **Ação**: Verificar se o tipo já reflete as colunas; se não, manter o cast (tipos são auto-gerados)

**3. Performance: dados não persistem entre navegações**
- O state `data` é local (`useState`), perdido ao sair da página
- Não é um bug crítico, mas o usuário precisa re-sincronizar cada vez que volta
- **Ação**: Sem mudança por enquanto (é esperado para dados de API)

**4. `useShopeeProducts`: import de produtos não atualiza `shopee_item_id` para produtos existentes**
- No update path (linha 51-58), o `shopee_item_id` (bigint) não é setado, apenas `shopee_product_id` (text)
- Se o produto foi criado pelo CSV de Ads com `shopee_product_id` mas sem `shopee_item_id`, o match no modal de import pode falhar
- **Ação**: Adicionar `shopee_item_id: p.item_id` no update path

**5. `useAdsData.importGeneralCSV`: auto-criação de draft com `cost_price: 0`**
- Insere `cost_price: 0` em vez de `null`, impedindo que o filtro `cost_price.is.null` capture esses produtos
- O filtro na Products page usa `or('cost_price.is.null,cost_price.eq.0')`, então funciona, mas semanticamente `null` seria melhor
- **Ação menor**: Nenhuma mudança necessária, o filtro já cobre ambos os casos

**6. `ShopeeImportModal`: não fecha modal nem recarrega lista após import**
- Após importar, `setImporting(false)` roda mas o modal não fecha — o `onClose` é chamado pelo parent em `Products.tsx` (linha 479)
- ✅ Funciona corretamente — parent fecha o modal

**7. Sidebar: ícones repetidos**
- `Calculator` usado para "Início" e "Calculadoras"
- `TrendingUp` usado para "Ads" e "Performance"
- **Ação**: Usar ícones distintos (ex: `BarChart2` para Ads no Sidebar, `TrendingUp` para Performance)

### Resumo de ações

| # | Arquivo | Ação | Prioridade |
|---|---------|------|------------|
| 1 | `features.ts` | Remover `PERFORMANCE_CONNECTED_REAL_ACCOUNT` | Baixa |
| 2 | `useShopeeProducts.ts` | Adicionar `shopee_item_id` no update | Média |
| 3 | `Sidebar.tsx` | Ícones distintos para Ads e Performance | Baixa |
| 4 | Nenhum bug crítico bloqueante encontrado | — | — |

### Verificações sem problemas
- ✅ Rotas no `App.tsx` corretas (Performance registrada)
- ✅ `BottomNavigation` tem Performance
- ✅ ProductForm detecta `isShopeeProduct` corretamente
- ✅ ProductDetail abre ProductForm modal (não inline)
- ✅ ProductDetailDrawer usa `onEdit` → ProductForm
- ✅ Ads import com auto-criação de drafts funciona
- ✅ Filtro `?filter=draft` em Products funciona
- ✅ ShopeeImportModal com seleção granular funciona
- ✅ Campos 🔒 para produtos Shopee no ProductForm

