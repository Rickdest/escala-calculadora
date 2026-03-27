

## Redesign Completo da Aba de Ads — Dashboard Estratégico

### Visão Geral
Refatoração visual da listagem e visão de detalhe de Ads, mantendo 100% dos dados, cálculos e lógica existentes. Baseado nas referências enviadas.

---

### 1. `AdsTab.tsx` — Layout Principal

**Toolbar**: Manter título "Visão Geral de Ads" à esquerda. Botões "Importar CSV" e "Excluir Tudo" à direita, sem mudanças de lógica. Adicionar botão "Nova Campanha" (ghost, apenas visual por agora — placeholder).

**Period Chips**: Manter como está, já está limpo.

**SummaryCards**: Sem mudança de componente, apenas chamada mantida.

**AlertsSection**: Manter posição atual.

**FilterChips**: Manter como está.

**Grid de cards**: Manter `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`.

---

### 2. `SummaryCards.tsx` — KPIs Mais Impactantes

Baseado na referência (imagem 2):

- **4 KPIs principais** em `grid-cols-2 md:grid-cols-4`: GMV Total, Gasto Total, ROAS Médio, Lucro Estimado.
- Aumentar tipografia dos valores para `text-2xl md:text-4xl font-black font-mono`.
- Ícone no canto superior direito de cada card (já existe, manter).
- **ROAS Médio**: Manter termômetro/barra. Adicionar label "Acima da meta (X.X)" com dot verde quando ROAS >= 3.
- **Sub-text**: Manter como está ("X anúncios ativos", "Investido em ads no período", "GMV - Gasto").
- Remover os 4 mini-cards de status inferiores (Lucrativos, Atenção, Prejuízo, Score) — essas informações já estão nos FilterChips com contadores.

---

### 3. `AdsProductCard.tsx` — Cards Mais Limpos

Baseado na referência (imagem 2):

- **Barra de status no topo** (accent bar) — já existe, manter.
- **Header**: Imagem + nome + badge (Lucrativo / Não vinculado) + período — já existe. Manter.
- **Métricas primárias**: Layout de 3 colunas com labels uppercase acima:
  - `ROAS` — font-mono text-2xl, cor semafórica (já existe)
  - `GMV` — font-mono text-lg (já existe)
  - `GASTO` — font-mono text-lg (já existe)
- **Métricas secundárias** (Pos, Vendas, Custo): Já refatoradas com destaque. Manter como está.
- **Botão "Ver Detalhes"** para vinculados: Manter full-width outline.
- **Botões "Vincular" / "Cadastrar"**: Manter grid-cols-2 outline/ghost.
- **Melhoria**: Adicionar sutil `hover:translate-y-[-1px]` para efeito de elevação.

---

### 4. `AdsDetailFullView.tsx` — Detalhe do Produto

Baseado nas referências (imagens 3, 4, 5, 6):

**Header (já bom)**: Breadcrumb + navegação < > + contador. Manter.

**Product Card (já bom)**: Imagem + nome + período + botões CSV/Trocar/Desvincular. Manter.

**KPIs horizontais (já bom)**: 6 KPIs (Impressões, Cliques, CTR, Vendas, GMV, ROAS). Manter.

**Tabs (já implementadas)**: "Visão Financeira" e "Performance & Gráficos". Manter.

**Tab Financeira — melhorias**:
- **Status de Lucratividade**: Já tem barra de progresso ROAS Real vs Empate. Manter layout atual que já segue a referência.
- **ACOS vs Margem**: Já bem formatado. Manter.
- **Score**: Já está na coluna direita. Manter.
- **Custo vs Lucro**: Já detalhado. Manter.

**Tab Performance — melhorias**:
- **Histórico de Ajustes & ROAS**: O card com título+descrição está separado do `OperationLogTimeline`. Unificar — mover o título para dentro do `OperationLogTimeline`, removendo o card wrapper duplicado (linhas 942-945).
- **Gráfico**: Já tem ícones SVG no topo + linhas verticais sutis + ReferenceLine de empate. Manter como na referência (imagem 3).
- **Geral vs Direto**: Já tem tabela clean. Manter.

---

### 5. `FilterChips.tsx` — Sem Mudanças

Já está no formato pill com dots coloridos e contadores. Consistente com referência.

---

### 6. `AlertsSection.tsx` — Sem Mudanças

Já colapsável e limpo.

---

### Resumo de Mudanças Concretas

| Arquivo | Mudança |
|---|---|
| `SummaryCards.tsx` | Remover mini-cards de status inferiores (Lucrativos/Atenção/Prejuízo/Score). Aumentar tipografia dos KPIs para `text-2xl md:text-4xl`. |
| `AdsProductCard.tsx` | Adicionar `hover:translate-y-[-1px]` sutil. Sem outras mudanças — já está alinhado com referência. |
| `AdsDetailFullView.tsx` | Remover card wrapper duplicado do título "Histórico de Ajustes & ROAS" (linhas 942-945), já que `OperationLogTimeline` tem seu próprio header. |
| `AdsTab.tsx` | Adicionar botão "Nova Campanha" placeholder ao lado de "Importar CSV". |

### O que NÃO muda
- Nenhum cálculo, variável ou lógica de estado
- `adsHelpers.ts`, `roasUtils.ts`, hooks — intocados
- Toda a lógica de filtro, período, sort, import/export
- Componentes internos do detalhe (Status, ACOS, Score, Custo vs Lucro, Diagnóstico, etc.)

