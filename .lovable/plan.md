

## Ícones acima dos dias no gráfico de Histórico de Ajustes

### Problema
As marcações atuais (linhas verticais tracejadas + dots coloridos) ficam confusas. O usuário quer ícones visuais (Target, DollarSign, Zap, Plus) posicionados acima de cada dia no gráfico.

### Mudança em `src/components/roas/AdsDetailFullView.tsx`

**Substituir ReferenceDot por CustomizedLayer com ícones SVG no topo do gráfico:**

1. **Remover** as `ReferenceLine` verticais tracejadas e os `ReferenceDot` coloridos (linhas ~259-286)

2. **Adicionar um componente `Customized`** do recharts que renderiza ícones SVG no topo do gráfico para cada `dateMarker`:
   - Usar `xAxisMap` e `yAxisMap` do payload para converter o `fullDate` em coordenada X pixel
   - Posicionar o ícone no topo do gráfico (Y fixo, ~2px do top)
   - Renderizar o ícone SVG correspondente ao tipo do evento (Target para roas_target, DollarSign para budget, Zap para quick_boost, Plus para campaign_created)
   - Se múltiplos eventos no mesmo dia, empilhar ícones verticalmente ou mostrar o ícone do tipo mais relevante (roas_target > budget > quick_boost)

3. **Aumentar `margin.top`** do chart de 8 para ~28px para dar espaço aos ícones

4. **Manter a linha vertical fina** (sem tracejado pesado) apenas como guia sutil ligando o ícone ao ponto no gráfico — `strokeWidth: 0.5`, `strokeOpacity: 0.3`

5. **Manter a legenda** abaixo do gráfico (já funciona bem)

### Resultado
- Ícones claros e reconhecíveis no topo de cada dia com alteração
- Visual limpo sem texto bagunçado
- Fácil identificar o tipo de alteração de relance

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx`

