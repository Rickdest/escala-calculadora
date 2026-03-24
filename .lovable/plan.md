

## Ajustar Layout da Tela de Detalhe Ads

### Resumo
Reorganizar a ordem das secoes, mover Status de Lucratividade e Posicionamento para a coluna esquerda com destaque, mover Score para a direita, melhorar KPIs e header.

### Alteracoes em `src/components/roas/AdsDetailFullView.tsx`

**1. Reorganizar `renderLeftColumn()`** — nova ordem:
1. Header (ja existe, melhorar imagem nao vinculada com borda tracejada)
2. KPIs (ja existe, adicionar `border border-border bg-card` e icones nos cards)
3. Status de Lucratividade (MOVER da direita para ca, com fundo semaforo `bg-emerald-500/5` etc)
4. Posicionamento (MOVER do final para ca, com regua melhorada gradiente + marcador circular)
5. ACOS vs Margem (barras com `bg-orange-500/80` e `bg-emerald-500/80`, `h-3`)
6. Geral vs Direto (manter)
7. Halo Effect (manter)
8. Evolucao Temporal placeholder (DESCER para o final)

**2. Reorganizar `renderRightColumn()`** — nova ordem (quando vinculado):
1. Score de Eficiencia (MOVER da esquerda, compacto)
2. Custo vs Lucro por Venda (manter)
3. Configuracao + Meta ROAS (manter)
4. Orcamento Sugerido (manter)
5. Diagnostico checklist (manter)

**3. KpiCard** — melhorar visual:
- Adicionar `text-center`, icone centralizado com label
- `text-[10px] uppercase tracking-wider` no label

**4. Header** — produto nao vinculado:
- Trocar `bg-surface-2` por `border-2 border-dashed border-border` no placeholder de imagem

**5. Posicionamento melhorado:**
- Regua com gradiente `from-emerald-500/20 via-amber-500/20 to-red-500/20`
- Marcadores de zona tracejados em 15%, 40%, 80%
- Labels de zona abaixo (Top 3, Pag 1, Pag 2, 17+)
- Posicao grande `text-3xl` no header do card
- Cores por faixa no label de classificacao

**6. Mobile** — manter logica de 1 coluna mas agora:
- Status Lucratividade ja esta na esquerda (nao precisa renderizar direita primeiro)
- Ordem mobile: Header → KPIs → Status → Posicionamento → resto esquerda → direita

**7. Espacamento:**
- Cards: `rounded-2xl border border-border bg-card shadow-sm p-5`
- Gap colunas: `gap-6`
- `space-y-5` entre cards

### Arquivo alterado
- `src/components/roas/AdsDetailFullView.tsx` — reescrever completo (~700 linhas)

