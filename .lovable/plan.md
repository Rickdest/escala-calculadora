

## Bugs identificados no mobile (390x672)

### 🐛 Bug 1 — CTA flutuante cobrindo conteúdo
A página tem `pb-28` (≈112px) de padding bottom, mas:
- BottomNavigation (`bottom-0`, ~70px com safe-area)
- CTA "Editar produto" flutuante (`bottom-16` = 64px, altura ~72px com padding)
- Total = **~140px ocupados** vs `pb-28` = 112px

Resultado: a Projeção Mensal e os últimos elementos da aba Tendência ficam **parcialmente cobertos** pelo CTA fixo. Precisa subir para `pb-36` (144px).

### 🐛 Bug 2 — Header com overflow no preço
A linha `{fmt(salePrice)} · custo {fmt(costPrice)}` em `font-mono text-xs` quebra/trunca em nomes longos a 390px porque o container do título tem `flex-1` mas compete com a imagem (48px) + dropdown (40px) + gap. Sobram ~270px e o nome em 2 linhas + preços + badge fica apertado.

### 🐛 Bug 3 — Status badge duplicado no DOM
Renderizado duas vezes (linhas 153 desktop + 187-191 mobile). O mobile usa `-mt-2` que não cancela bem o `mb-5/6` do header; gera espaço inconsistente.

### 🐛 Bug 4 — TabsList truncado
`grid-cols-2` ok, mas o ícone + texto "Análise"/"Tendência" + padding interno do Tab estoura levemente em 360px. `text-sm` + `mr-1.5` no ícone não tem `min-w-0` no trigger.

### 🐛 Bug 5 — Breakdown de Custos: labels longos vazam
Linha `Taxa Shopee (12% + R$4)` + valor em `font-mono` não tem `min-w-0` no span do label → o label corta o valor à direita ou empurra layout.

### 🐛 Bug 6 — Slider da Projeção Mensal sem padding lateral
O `<input type="number">` da Projeção tem `w-16` mas o container `flex items-center gap-3` não respira; em 390px o número fica colado no slider quando ele expande.

### 🐛 Bug 7 — Cards KPI com texto cortado
`text-2xl` (24px) + `font-mono` em valores como `R$ 1.234,56` em card de ~170px de largura → trunca ou quebra feio. Falta `truncate` ou redução de tamanho no mobile.

### 🐛 Bug 8 — Comparativo de Canais 2 colunas em mobile
`grid-cols-2` força 2 colunas mesmo a 360px, deixando cada card com label "Mercado Livre" + "%" lado a lado → label trunca.

### 🐛 Bug 9 — ROAS de Referência: label fixo `w-32`
Na linha `<span className="w-32 shrink-0">` (128px) + barra + valor = não cabe em 358px (390 − 32px padding) sem barra ficar com 30px.

---

## Melhorias de layout (estilo Opus 4.7 / Claude Designer)

### ✨ M1 — Header mobile mais clean (pattern app nativo)
- Imagem 56px + nome em 1 linha (truncate) + chip status inline pequeno
- Mover preço/custo pra **micro-row abaixo do título** com separador `·` (não competir com imagem)
- Dropdown vira ícone único 36px (sem botão Editar — o CTA flutuante já cobre)

### ✨ M2 — KPI hero como "stat tiles" 2x2 mais densos
- Reduzir font do valor pra `text-xl` em mobile (em vez de `text-2xl`)
- Adicionar **ícone discreto** de 12px no canto superior direito de cada KPI (TrendingUp/Target/etc) — eleva o visual sem poluir
- Border-l de 2px só na margem (já tem) → estender pra todos os 4 com cor semântica (lucro=success, vs meta=primary, etc)

### ✨ M3 — Sticky tab strip
TabsList vira `sticky top-0 z-30` no mobile (com fundo sólido) → fica acessível ao rolar entre Análise/Tendência. Padrão iOS/Android moderno.

### ✨ M4 — Breakdown de custos colapsável + barra visual
- **Top:** barra horizontal segmentada mostrando proporção de cada custo (visual stack bar) — 1 olhada e o usuário entende onde tá indo o dinheiro
- **Abaixo:** lista atual, mas com valores **alinhados à direita em coluna fixa** (`tabular-nums w-24 text-right`) pra alinhar verticalmente os preços
- Custos = 0 ficam ocultos por padrão com botão "ver tudo" (reduz ruído mobile)

### ✨ M5 — ROAS de Referência reformatado (mobile-first)
Trocar layout horizontal por **3 chips verticais empilhados**:
```
Empate  ━━━━━━━━━━━━━ 1.85x  (badge vermelho)
Saudável ━━━━━━━━━━━━ 2.50x  (badge amarelo)
Ideal   ━━━━━━━━━━━━━ 4.20x  (badge verde)
```
Label acima da barra, valor à direita em chip colorido. Elimina o `w-32` fixo.

### ✨ M6 — Comparativo de Canais: 1 coluna no mobile, com barra
Mobile vira lista vertical com:
- Nome do canal + 🏆 + % à direita (font-mono grande)
- Barrinha proporcional à melhor margem abaixo
- Diferença vs Shopee em linha menor: `+R$ 2,30/un vs Shopee`

### ✨ M7 — Estoque com mini-progresso
Adicionar barra: estoque atual / (mínimo × 4) com cor:
- Vermelho se ≤ mínimo
- Amarelo se ≤ mínimo × 2
- Verde se acima
- Texto: "X un. · ~Y dias de venda" (calculado por venda média estimada)

### ✨ M8 — Projeção Mensal com presets rápidos
Antes do slider: chips `30 · 50 · 100 · 200 · 500` vendas/mês pra toque rápido. Slider continua pra ajuste fino. Em mobile, número + chips facilita muito mais que slider preciso.

### ✨ M9 — CTA flutuante mais elegante
- Em vez de barra full-width opaca, virar **FAB pill** centralizado: `Editar` ícone + texto, largura `w-auto px-6`, sombra forte, `bottom-20` (acima do nav com folga)
- Mais leve visualmente, deixa conteúdo respirar atrás

### ✨ M10 — Aba Tendência: ajustes pontuais no mobile
- 3 cards de diagnóstico já estão `grid-cols-1 sm:grid-cols-3` → trocar pra `grid-cols-3 gap-2` mobile mesmo (cards menores e densos), com font reduzida
- Gráfico 5 anos: `h-44` no mobile (atual `h-56` ocupa muito vertical num iPhone)
- Ciclo sazonal + Regiões: já em coluna única no mobile, OK
- Buscas relacionadas: reduzir `space-y-1` e font dos chips

---

## Arquivos a alterar

| Arquivo | Mudanças |
|---|---|
| `src/pages/ProductDetail.tsx` | Bugs 1-9 + M1, M2, M3, M4, M5, M6, M7, M8, M9 |
| `src/components/products/trend/ProductTrendTab.tsx` | M10: cards diag 3-col mobile, altura gráfico, density |
| `src/components/products/trend/SeasonalCycleChart.tsx` | Altura `h-36` no mobile (atual 44) |
| (sem novos arquivos) | — |

---

## Trade-offs

- ✅ Não muda nenhuma lógica/cálculo — só layout e responsividade
- ✅ Desktop fica idêntico ou melhor (KPIs com ícones, sticky tabs ajudam em todos os tamanhos)
- ⚠️ Estoque com "dias de venda" precisa de uma estimativa simples (vendas/mês usado na Projeção, default 50) — fica próximo mas não preciso. Marcar como "~estimado"
- ⚠️ Stack bar do breakdown adiciona ~30px de altura — vale a pena pelo entendimento visual

