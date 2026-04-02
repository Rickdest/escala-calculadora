

## Plano: Campanhas individuais com dados e detalhe clicável

### Diagnóstico

Os logs confirmam:
- **35 campanhas encontradas** com `item_id` ✓
- **Shop-level daily data funciona** (28 dias, expense=R$2050, roas=10.15) ✓
- **Per-campaign API retorna `entries=0` para TODAS as 35** — o endpoint `get_product_campaign_daily_performance` via GET retorna arrays vazios
- O DEBUG raw response não apareceu nos logs (race condition no `fetchIdx` compartilhado entre promises paralelas)

**Causa provável**: o endpoint pode precisar ser chamado via **POST** em vez de GET (padrão Shopee AMS/Ads API), ou o response tem estrutura diferente que estamos ignorando.

### Correções planejadas

#### 1. Backend — Corrigir chamada per-campaign (`shopee-ads/index.ts`)

- **Trocar de GET para POST** usando `shopeePost` (já existe em `_shared/shopee.ts`), passando `campaign_id`, `start_date`, `end_date` no body JSON
- **Corrigir debug logging**: logar raw response ANTES do batch paralelo, com um fetch serial do primeiro campaign_id para garantir que o log apareça
- **Manter fallback GET**: se POST retornar erro, tentar GET como fallback
- **Não agrupar por item_id**: retornar `ads_by_campaign` (1 entrada por campaign_id) em vez de `ads_by_product` (1 entrada por item_id). Cada campanha mantém suas métricas individuais
- **Incluir campo `campaign_id`** em cada entrada para identificação única

#### 2. Backend — Nova estrutura de retorno

```text
ads_by_campaign: [
  {
    campaign_id, item_id, item_name, status,
    impressions, clicks, expense, gmv, direct_gmv,
    orders, direct_orders, avg_position,
    roas, direct_roas, acos, ctr, cost_per_order,
    days_active,
    daily: [{date, expense, gmv, roas, clicks, impressions}]
  }
]
```

Se per-campaign continuar retornando vazio, cada campanha terá métricas zeradas mas ainda aparecerá no frontend com nome, item_id e status.

#### 3. Frontend — Cards individuais por campanha (`ApiAdsDashboard.tsx`)

- Trocar a seção "Performance por Produto" por "Campanhas" com cards individuais
- Cada card mostra: nome da campanha, item_id, status, e todas as métricas (se disponíveis)
- ROAS colorido (verde ≥3, amarelo 1-3, vermelho <1)
- Mini sparkline dos últimos 7 dias
- Botão "↻ Atualizar" por campanha

#### 4. Frontend — Detalhe clicável por campanha

- Ao clicar num card de campanha, expandir uma view de detalhe inline (similar ao `AdsDetailFullView` do CSV)
- Mostrar: gráfico diário (ROAS/Gasto/Receita), grid de métricas completas, período
- Usar estado local `selectedCampaign` no `ApiAdsDashboard`

#### 5. Banco de dados — Atualizar upsert

- Mudar upsert para usar `campaign_id` como chave (em vez de `item_id`)
- Ou criar novo campo `campaign_id` na tabela `shopee_ads_by_product` e ajustar unique constraint

### Arquivos alterados

```text
supabase/functions/shopee-ads/index.ts     — POST em vez de GET, retorno por campanha, debug fix
supabase/functions/_shared/shopee.ts       — nenhuma mudança (shopeePost já existe)
src/components/roas/ApiAdsDashboard.tsx     — cards por campanha, click-to-detail, ordenação
src/components/roas/AdsTab.tsx             — ajustar para ads_by_campaign
Migration SQL                              — adicionar campaign_id na tabela + ajustar constraint
```

### Sem mudanças

- `AdsDetailFullView.tsx` (usado apenas para dados CSV, não muda)
- `useShopeeToken.ts` (já suporta itemId, não muda)

