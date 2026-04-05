

## Plano: Importar dados da API Ads na Performance + Enriquecer com Excel

### Problema atual
A aba Performance só mostra dados quando o usuário importa o Excel (`parentskudetail`). Os dados da API Ads (`shopee_ads_by_product`) estão disponíveis mas só são usados como enriquecimento no momento da importação Excel -- nunca como fonte primária.

### O que muda
Quando o usuário tem dados de Ads sincronizados via API, a Performance deve mostrar esses produtos automaticamente (GMV, gasto, ROAS, pedidos, impressões, cliques). Quando o Excel for importado depois, ele enriquece esses registros com dados orgânicos (funil completo, variações, recompra).

### Mudanças

#### 1. Hook `useProductPerformance` -- importar dados da API Ads
**Arquivo:** `src/hooks/useProductPerformance.ts`

Adicionar função `importFromAdsApi()`:
- Buscar todos os registros de `shopee_ads_by_product` do usuário
- Agregar por `item_id` (mesmo produto pode ter múltiplas campanhas)
- Para cada item_id, criar/atualizar um registro em `product_performance` com:
  - `ads_roas`, `ads_gasto`, `ads_gmv`, `ads_pedidos`, `ads_impressoes`, `ads_cliques` preenchidos
  - Campos orgânicos zerados (impressoes, cliques, ctr, etc = 0) -- serão preenchidos pelo Excel
  - `nome` = `item_name` da campanha
  - `source` = `'ads_api'`
  - `period_start` / `period_end` do range dos dados de Ads
- Upsert com `onConflict: 'store_id,item_id,period_start,period_end'`
- Quando o Excel for importado depois, o upsert sobrescreve os campos orgânicos mantendo os ads

Modificar `importExcel()`:
- Após importar o Excel, re-buscar `shopee_ads_by_product` e atualizar campos `ads_*` dos registros existentes (já faz isso, manter)

#### 2. Botão "Sincronizar Ads" na Performance
**Arquivo:** `src/pages/Performance.tsx`

Atualizar o botão existente de "Sincronizar Ads":
- Após chamar `startAdsImport()` e a importação concluir, chamar `perfHook.importFromAdsApi()` para popular a `product_performance`
- Isso garante que os dados apareçam na aba Performance automaticamente

#### 3. Ajustar cards para dados "somente Ads"
**Arquivo:** `src/components/performance/ProductPerformanceCard.tsx`

- Quando `source === 'ads_api'` e dados orgânicos estão zerados:
  - Ocultar seção "Funil de conversão" (não há dados de impressões orgânicas)
  - Mostrar badge "📈 Dados via Ads" no card
  - Exibir métricas de Ads como primárias: GMV Ads, Gasto, ROAS, Pedidos Ads
  - Ocultar "Orgânico vs Ads" (sem dados orgânicos ainda)
- Quando o Excel enriquecer depois, o `source` vira `'excel'` e tudo aparece normalmente

#### 4. KPI cards adaptáveis
**Arquivo:** `src/pages/Performance.tsx`

- Quando só tem dados de Ads (sem Excel): mostrar KPIs de Ads (GMV Ads, Gasto Total, ROAS Geral, Produtos com Ads)
- Quando tem Excel: manter KPIs atuais (Receita Paga, Unidades, Ticket Médio, Produtos)
- Badge no header indicando fonte: "📈 API Ads" ou "📊 Excel + API Ads"

#### 5. Empty state atualizado
- Se tem token de Ads mas sem dados: mostrar botão "Sincronizar Ads" como CTA primário
- Manter "Importar Excel" como CTA secundário

### Fluxo do usuário

```text
1. Conecta API Ads → Sincroniza Ads
2. Performance mostra produtos com dados de Ads (GMV, ROAS, gasto)
3. Usuário importa Excel → Performance enriquece com funil orgânico
4. Cards mostram dados completos: orgânico + Ads combinados
```

### Arquivos modificados
- `src/hooks/useProductPerformance.ts` -- nova função `importFromAdsApi()`
- `src/pages/Performance.tsx` -- fluxo de sync, KPIs adaptáveis, empty state
- `src/components/performance/ProductPerformanceCard.tsx` -- layout adaptável por `source`

