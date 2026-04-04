

## Plano: Corrigir filtro de datas para funcionar por dia

### Causa raiz
Todos os registros em `shopee_ads_by_product` compartilham o mesmo `period_start` (2026-03-05) e `period_end` (2026-04-01) — a janela completa de 28 dias. O filtro atual compara esses campos por registro, então:
- "Hoje" (04/04): `period_end` (04/01) < 04/04 → zero resultados
- "Última semana" (28/03–04/04): período intersecta → mostra TUDO (28 dias)

O filtro precisa operar nos dados **diários** (`daily_data`) dentro de cada registro, não no nível do registro.

### Solução
Filtrar o array `daily_data` de cada registro para incluir apenas os dias dentro do range selecionado, e recalcular as métricas agregadas (impressions, clicks, expense, gmv, orders) a partir dos dias filtrados.

#### 1. `buildApiAdsDataFromRows` — aceitar filtro de datas
Adicionar parâmetros `dateFrom` e `dateTo` opcionais. Após agregar por `item_id`, filtrar o `daily_data` de cada produto para incluir apenas dias no range. Recalcular `impressions`, `clicks`, `expense`, `gmv`, `orders` somando apenas os dias filtrados. Produtos que ficam com zero em tudo após filtro são removidos da lista.

Formato das datas em `daily_data` é `DD-MM-YYYY` — converter para `YYYY-MM-DD` antes de comparar.

#### 2. `AdsTab.tsx` — passar datas para o builder
Passar `dateFromStr` e `dateToStr` para `buildApiAdsDataFromRows` no `useMemo` de `persistedApiData`. Remover o `dateFilteredRows` intermediário (não serve mais — todos os registros passam, a filtragem é interna).

### Arquivos modificados
```
src/hooks/useApiAdsData.ts  — buildApiAdsDataFromRows recebe dateFrom/dateTo, filtra daily_data, recalcula métricas
src/components/roas/AdsTab.tsx — passar datas ao builder, remover dateFilteredRows
```

### Resultado
- "Hoje" mostra métricas apenas do dia atual
- "Ontem" mostra apenas o dia anterior
- "Última semana" mostra exatamente os últimos 7 dias
- Cards de resumo recalculam automaticamente

