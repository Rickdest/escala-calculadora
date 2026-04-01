

## Plano: Buscar preços/estoque via get_model_list e melhorar relatório

### Problema
- Produtos com variações (`has_model: true`) não retornam `price_info`/`stock_info_v2` no `get_item_base_info`
- Precisa chamar `/api/v2/product/get_model_list` para obter preços e estoque por variação
- Dados de Ads não estão disponíveis via API (restrição da Shopee) — CSV continua necessário

### Alterações

**Arquivo 1: `supabase/functions/shopee-sync/index.ts`**

Após buscar `get_item_base_info`, para cada produto com `has_model: true`, chamar:
```
GET /api/v2/product/get_model_list?item_id={item_id}
```
Retorna `model[]` com `price_info` (preço por variação) e `stock_info` (estoque por variação). Agregar os dados e anexar ao produto no resultado.

Limitar a 20 produtos para não exceder rate limits. Fazer chamadas sequenciais.

**Arquivo 2: `src/components/roas/ShopeeIntegrationModal.tsx`**

- Atualizar `ProductListReport` para ler preços e estoque dos models quando `price_info` do item estiver ausente
- Mostrar faixa de preço (min-max) quando houver múltiplas variações
- Somar estoque de todas as variações
- Adicionar nota clara na seção de Ads explicando que dados de Ads só vêm via CSV (limitação do App na Shopee)

### Estrutura esperada do get_model_list
```json
{
  "response": {
    "model": [
      {
        "model_id": 123,
        "model_name": "P / Preto",
        "price_info": [{ "current_price": 49.90, "original_price": 59.90 }],
        "stock_info_v2": { "summary_info": { "total_available_stock": 10 } }
      }
    ]
  }
}
```

### Sem alteração para Ads
Dados de Ads (ROAS, ACOS, impressões, cliques, gastos) **continuam vindo exclusivamente via CSV**. Para ter acesso via API, seria necessário solicitar à Shopee a aprovação do escopo `shop_marketing` no painel de parceiro.

