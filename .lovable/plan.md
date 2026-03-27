

## Subir Histórico de Ajustes + Marcações no gráfico

### Problema
A seção "Histórico de Ajustes" está no final da página (seção 7), muito escondida. Além disso, o gráfico de ROAS meta não mostra marcações visuais de cada alteração feita.

### Mudanças em `src/components/roas/AdsDetailFullView.tsx`

**1. Mover timeline para cima — após "Posicionamento" (seção 4)**

Na função `renderRightColumn()` (~linha 884-885), mover o `<OperationLogTimeline>` de depois do Halo Effect para logo após a seção de Posicionamento (~linha 786). Isso coloca a timeline como seção 5, empurrando ACOS vs Margem e as demais para baixo.

**2. Adicionar marcações no gráfico para cada evento**

No `ReLineChart` dentro do `OperationLogTimeline`:
- Para cada entrada do `sortedEvents` (não apenas roas_target, mas budget, quick_boost, etc.), adicionar um `<ReferenceLine x={date}>` vertical com:
  - Cor do ícone correspondente ao tipo (laranja roas_target, azul budget, amarelo quick_boost, verde campaign_created)
  - Stroke tracejado fino
  - Label no topo com texto curto (ex: "ROAS 14.0", "Orç R$30", "Boost", "Criou")
- Usar `<ReferenceDot>` nos pontos de mudança de ROAS para destacar com dot maior
- Importar `ReferenceDot` do recharts (já disponível)

**3. Ajustar dados do gráfico para incluir eventos não-ROAS**

Atualmente o eixo X só tem pontos de `roas_target` e `campaign_created`. Para que as `ReferenceLine` verticais dos outros eventos (budget, boost) apareçam corretamente:
- Incluir TODOS os eventos no eixo X como pontos de dados (com valor ROAS repetido do ponto anterior, ou null)
- Ou usar `ReferenceLine` com valor de x baseado no label de data correspondente

### Resultado
- Timeline visível mais cedo ao rolar a página
- Cada ajuste marcado visualmente no gráfico com linha vertical colorida e label

### Arquivo modificado
- `src/components/roas/AdsDetailFullView.tsx`

