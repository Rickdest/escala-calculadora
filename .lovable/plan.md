

## Implementar Operation Log Parser + Timeline + Card Compacto de Ads

### Visão Geral
3 melhorias paralelas: parser de log de operações da Shopee, armazenamento no banco, timeline visual no detalhe de Ads, e card compacto de Ads no ProductCard.

---

### 1. Parser do Operation Log — `src/lib/shopeeAdsParser.ts`

**Adicionar ao final do arquivo:**
- Interface `OperationField` (union type) e `OperationLogEntry`
- Função `parseOperationLogCSV(content)`:
  - Detecta pelo header "Registro de operações"
  - Extrai metadata (ID do Produto) das linhas iniciais
  - Encontra header "Atualizar horário" e parseia cada linha de dados
  - Mapeia eventType → field (`roas_target`, `budget`, `quick_boost`, `campaign_created`, `other`)
  - Extrai fromValue/toValue via regex nos details
  - Retorna ordenado por timestamp ASC
- Função `detectAndParseCSV(content)` que retorna `{ type, performanceData?, operationLog? }`
  - "Relatório de Anúncios de Produto" → performance (chama `parseShopeeAdsCSV`)
  - "Registro de operações" → operation_log (chama `parseOperationLogCSV`)
  - Else → unknown

### 2. Migration — coluna `operation_log` em `product_ads_metrics`

```sql
ALTER TABLE public.product_ads_metrics
  ADD COLUMN IF NOT EXISTS operation_log JSONB DEFAULT NULL;
```

### 3. Fluxo de importação — `src/components/forms/ProductAdsSection.tsx`

- Substituir `parseShopeeAdsCSV` por `detectAndParseCSV`
- Se `type === 'operation_log'`: salvar no campo `operation_log` da linha existente (match por `shopee_product_id` ou `product_id`)
- Se `type === 'performance'`: fluxo atual inalterado
- Se `type === 'unknown'`: toast de erro

### 4. Hook `useProductAdsMetrics.ts`

- Adicionar `operationLog?: OperationLogEntry[]` ao retorno de `rowToMetric`
- Ler `r.operation_log` e passar adiante

### 5. Timeline no `AdsDetailFullView.tsx`

Substituir o placeholder "Evolução Temporal" (linhas ~707-717) por conteúdo real quando `operationLog` existir:

**Bloco A — Mini gráfico ROAS meta:**
- `LineChart` do recharts (já instalado), 120px de altura
- Eixo X: datas dos eventos `roas_target` e `campaign_created`
- Eixo Y: valor ROAS meta
- Linha laranja (primary), dots com tooltip
- Linha tracejada horizontal amarela no ROAS Empate (se disponível)
- Só aparece se ≥2 pontos de `roas_target`

**Bloco B — Lista de eventos:**
- Todos os eventos do log, mais recente primeiro
- Ícone por tipo (Target/DollarSign/Zap/Plus/Settings)
- Label formatado: "ROAS meta: 11.1 → 14.0", "Orçamento: R$30 → R$40", etc.
- Data formato "dd/MM HH:mm"
- Header: "Histórico de Ajustes" com ícone History

**Props:** O `ad` (`EnrichedAdsData`) já vem do `useAdsData` — precisa propagar `operation_log` do banco para o `EnrichedAdsData` ou buscar separadamente. Buscar via `product_ads_metrics` se `ad.product_id` existir.

### 6. Card Compacto de Ads no `ProductCard.tsx`

Substituir a seção de Ads atual (linhas ~244-289) pelo layout com cores por faixa:
- **Posição**: fundo verde (≤10), amarelo (11-20), vermelho (>20) com `#N` grande
- **ROAS**: fundo colorido por faixa com valor grande + "direto X.XX" abaixo
- **Custo/un**: fundo neutro com valor + "N vendidos" abaixo
- Header com dot de status + "Ads Shopee" + período
- Footer hint "↗ Ver detalhes · ACOS, GMV, Gasto"

### Arquivos modificados
1. `src/lib/shopeeAdsParser.ts` — novas interfaces e funções
2. `src/components/forms/ProductAdsSection.tsx` — usar `detectAndParseCSV`
3. `src/hooks/useProductAdsMetrics.ts` — propagar `operationLog`
4. `src/components/roas/AdsDetailFullView.tsx` — timeline real
5. `src/components/cards/ProductCard.tsx` — card compacto de Ads
6. Migration SQL — adicionar coluna `operation_log`

### Restrições respeitadas
- Nenhum cálculo de ROAS alterado
- `calcProductRoas` e `roasUtils.ts` intocados
- Migration aditiva (DEFAULT NULL)
- Gráfico só aparece com ≥2 entradas de `roas_target`
- Importação de Operation Log opcional

