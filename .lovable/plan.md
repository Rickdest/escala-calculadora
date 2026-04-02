

## Plano: Vincular automaticamente campanhas da API a produtos cadastrados

### Problema

Quando campanhas são importadas via API, cada uma traz um `item_id` da Shopee. Produtos cadastrados (importados via Shopee ou manualmente) já têm `shopee_item_id` salvo. Mas hoje o dashboard de API (`ApiAdsDashboard`) exibe as campanhas sem tentar vincular ao produto correspondente.

### Solução

Ao carregar/importar dados de Ads via API, cruzar `item_id` de cada campanha com `shopee_item_id` dos produtos cadastrados. Se houver match, enriquecer a campanha com `product_id`, `product_name`, e dados financeiros do produto (custo, margem) para calcular classificação e ROAS de empate automaticamente.

### Alterações

#### 1. `src/components/roas/AdsTab.tsx` — enriquecer campanhas com dados de produtos

No `campaignToEnrichedAds`, buscar o produto pelo `item_id` da campanha:
```typescript
// Dentro de campaignToEnrichedAds, antes de retornar:
const matchedProduct = products.find(p => 
  String((p as any).shopeeItemId || (p as any).shopee_item_id) === String(campaign.item_id)
);
// Se encontrou, preencher product_id e calcular classificação
```

Isso faz com que:
- O card da campanha mostre que está vinculado (cor de classificação)
- ROAS de empate e margem de contribuição sejam calculados
- O botão "Vincular" não apareça para campanhas já vinculadas

#### 2. `src/components/roas/ApiAdsDashboard.tsx` — mostrar indicador de vínculo

Passar `products` como prop e no `CampaignCard`:
- Mostrar badge "Vinculado" se o `item_id` tem match
- Mostrar nome do produto cadastrado se diferir do nome da campanha
- Mostrar classificação (Lucrativo/Prejuízo) quando vinculado

#### 3. `src/hooks/useAdsData.ts` — importFromApi já faz linking

O fluxo de `importFromApi` (linha 582-613) já faz match por `shopeeItemId` e cria drafts. Isso continuará funcionando para dados CSV. A mudança principal é no dashboard de API que hoje opera separado.

### Fluxo resultante

```text
Produto Shopee importado → shopee_item_id = 12345
Campanha Ads API → item_id = 12345
                  ↓
Auto-match por item_id === shopee_item_id
                  ↓
Card mostra: vinculado, classificação, ROAS empate
```

### Arquivos alterados

```text
src/components/roas/AdsTab.tsx          — enriquecer campaignToEnrichedAds com match de produto
src/components/roas/ApiAdsDashboard.tsx  — receber products, mostrar badge de vínculo e classificação
```

