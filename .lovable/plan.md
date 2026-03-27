

## Remover Posição e Alerta dos Cards Gerais (SummaryCards)

### Problema
O card de "POSIÇÃO" e o alerta de posição média estão nos KPIs gerais da aba de Ads, mas a posição é uma métrica individual de cada anúncio — não faz sentido no resumo geral. Deve aparecer apenas no detalhe do produto (AdsDetailFullView), onde já está implementado.

### Mudança em `src/components/roas/SummaryCards.tsx`

1. Remover do `useMemo`: cálculo de `avgPosition`, `withPosition`
2. Remover constantes: `positionColor`, `positionLabel`, `showPositionWarning`
3. Remover do grid: o card condicional de Posição (`{s.avgPosition !== null && (...)}`)
4. Simplificar grid: voltar para `grid-cols-2 md:grid-cols-4` fixo (sem condicional de 5 colunas)
5. Remover o bloco de alerta `{showPositionWarning && (...)}` abaixo do grid
6. Remover imports não usados: `MapPin`, `AlertTriangle`

### O que NÃO muda
- Os 4 KPIs (GMV, Gasto, ROAS Médio, Lucro Est.) permanecem intactos
- O card de posição no `AdsDetailFullView.tsx` permanece (é o lugar correto)
- Nenhuma lógica de cálculo alterada

