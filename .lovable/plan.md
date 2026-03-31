

## Plano: Redesenhar layout do Impacto das Mudanças e Métricas para match com mockups

Analisando os mockups vs código atual, as diferenças principais são:

### 1. Impacto das Mudanças (OperationLogTimeline) — linhas 338-387

**Mockup mostra:** Cards maiores com borda completa colorida (não apenas border-left), texto principal grande (~text-lg), e no lado direito: deltas de impressões com label "impressões"/"vendas" explícito. Abaixo do label principal, uma linha de observação contextual (ex: "⚠ Meta aumentada 10→20: algoritmo tende a reduzir volume").

**Mudanças:**
- Borda completa no card (border colorido ao redor, não só esquerda)
- Texto do label maior (text-base/text-lg em vez de text-[13px])
- Adicionar linha de observação contextual abaixo do label (lógica de análise do impacto baseada no campo e valores)
- Deltas à direita com labels "impressões" e "vendas" visíveis
- Remover ícone à esquerda (mockup não mostra ícones, só pills)

### 2. Posicionamento card — linhas 1043-1102

**Mockup mostra:** Layout de 2 colunas dentro do card: esquerda com #número grande + label + barras de tier, direita com caixa de recomendação. Texto "Posição importada via CSV individual" no canto inferior direito.

**Mudanças:**
- Grid interno 2 colunas no card de posicionamento
- Número em text-5xl/6xl (muito grande)
- Label "Segunda Página" em text-xl bold
- Recomendação como card separado à direita (não embaixo)
- Adicionar "Posição importada via CSV individual" como nota

### 3. Ordem na tab Métricas permanece igual (já foi movido para topo)

### Arquivo editado
- `src/components/roas/AdsDetailFullView.tsx` — apenas UI, sem alteração de lógica/cálculos

### Detalhes técnicos

**Event cards (linhas 338-387):** Substituir `border-l-2` por `border` completo com opacidade. Aumentar font-size do label. Adicionar função helper `getObservation(entry)` que retorna texto contextual baseado no campo (roas_target aumentado = "⚠ Meta aumentada: algoritmo tende a reduzir volume", budget = sem obs, etc). Mostrar deltas com labels explícitos.

**Posicionamento (linhas 1043-1102):** Wrap conteúdo em `grid grid-cols-[1fr_auto]` ou `flex`. Lado esquerdo: número + label + barras. Lado direito: recomendação em card com bg-card e border. Nota "Posição importada via CSV individual" em text-[10px] no canto.

