

## Plano: Página de Detalhe do Produto na Performance + Botão Limpar Dados

### Problema
1. O `ProductPerformanceCard` não tem botão para abrir detalhes — só expande inline
2. A página `PerformanceProductDetail` usa `usePerformanceData()` (Seller API desabilitada) — não funciona com dados do Excel/Ads API
3. Não existe botão para limpar dados de Ads/Performance

### Mudanças

#### 1. Botão "Ver detalhes" no ProductPerformanceCard
**Arquivo:** `src/components/performance/ProductPerformanceCard.tsx`
- Adicionar botão no final do conteúdo expandido: `navigate(/performance/${produto.item_id})`

#### 2. Refatorar PerformanceProductDetail para usar product_performance
**Arquivo:** `src/pages/PerformanceProductDetail.tsx`
- Trocar `usePerformanceData()` por `useProductPerformance()` como fonte primária
- Buscar o produto por `item_id` dos dados do hook
- Cruzar com `shopee_ads_by_product` para dados extras (daily_data, keywords, avg_position, direct_gmv, cost_per_order, status)
- Organizar em seções:
  - **Header**: nome, ID, badges (source, ROAS, posição)
  - **KPIs**: Receita, Unidades, Ticket Médio, Un/Dia (adaptável se ads_only)
  - **Funil de Conversão**: quando tiver dados orgânicos (Excel)
  - **Orgânico vs Ads**: barra comparativa quando ambos existem
  - **Performance de Ads**: seção com tabs (Resumo, Tendência diária, Keywords) — manter lógica existente que já funciona bem
  - **Variações**: tabela com ranking por receita
  - **Insights**: painel com regras automáticas

#### 3. Botão "Limpar Dados" na Performance
**Arquivo:** `src/pages/Performance.tsx`
- Adicionar botão discreto (ícone lixeira) no header ao lado dos outros botões
- Ao clicar, abre confirm dialog: "Isso vai remover todos os dados de performance e Ads da aba. Deseja continuar?"
- Se confirmado: `DELETE FROM product_performance WHERE user_id = X AND store_id = Y`
- Recarrega os dados

#### 4. Hook: adicionar função clearData
**Arquivo:** `src/hooks/useProductPerformance.ts`
- Nova função `clearData()` que deleta todos os registros da loja atual

### Arquivos modificados
- `src/hooks/useProductPerformance.ts` — clearData()
- `src/pages/Performance.tsx` — botão limpar + confirm
- `src/pages/PerformanceProductDetail.tsx` — refatorar para usar product_performance + ads enrichment
- `src/components/performance/ProductPerformanceCard.tsx` — botão "Ver detalhes"

