

## Plano: Corrigir parsing e dados do shopee-sync

### Problemas identificados nos logs

1. **Shop Info**: dados estão na raiz (`data.shop_name`), não em `data.response`
2. **Produtos**: `price_info`, `stock_info_v2`, `sale_info` não vêm sem `response_optional_fields`
3. **Pedidos**: funcionando, mas precisa mensagem amigável quando vazio
4. **Campanhas**: endpoint indisponível para este app — remover completamente

### Alterações

**Arquivo 1: `supabase/functions/shopee-sync/index.ts`**

- Na chamada `get_item_base_info` (linha 131-135), adicionar `need_tax_info: "true"` e `response_optional_fields: "price_info,stock_info_v2,sale_info,item_status"`
- Remover todo o bloco de Marketing/Ads (linhas 191-216) — não incluir `campaigns` nos resultados

**Arquivo 2: `src/components/roas/ShopeeIntegrationModal.tsx`**

- **ShopInfoReport** (linhas 50-62): ler campos direto de `data` em vez de `data.response` — `data.shop_name`, `data.region`, `data.status`, `data.is_sip`, `data.shop_fulfillment_flag`
- **OrderReport** (linha 109-111): remover estilo de erro quando `listData.error` é string vazia (Shopee retorna `error: ""` como sucesso)
- Remover `CampaignsReport` component (linhas 136-162)
- Remover `campaigns` do `SyncReport` interface (linha 21)
- Remover seção de campanhas do JSX do relatório (linhas 266-270)
- Remover import `BarChart3` (não mais usado)

### Resumo das mudanças

| O que | Antes | Depois |
|-------|-------|--------|
| Shop Info parsing | `data.response.shop_name` | `data.shop_name` |
| Product details | sem campos opcionais | `response_optional_fields` com price/stock/sale |
| Campanhas | 2 endpoints tentados, ambos falham | removido completamente |
| Pedidos vazios | exibe normalmente | mantém igual (já funciona) |
| OrderReport erro | trata `error: ""` como erro | ignora string vazia |

