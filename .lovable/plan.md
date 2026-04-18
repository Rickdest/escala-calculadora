

## Diagnóstico mobile (390px) — 2 telas com problemas distintos

### Tela 1 — `ProductDetail` em mobile (screenshot image-237)

| Problema | Evidência |
|---|---|
| Header pesado: imagem 64px + título grande + subtítulo + badge ocupam ~30% da viewport antes do scroll | KPIs aparecem só após scroll |
| 3 KPIs em linha única (sem o 4º "ROAS empate") | Layout `grid-cols-2 md:grid-cols-4` quebra mal em 390px com 3 cards forçados em uma linha apertada |
| Footer flutuante inesperado: lixeira + share + "Editar produto" colado no rodapé | Não existe esse footer no código atual de `ProductDetail.tsx` (ele tem só dropdown menu). Isso é o `BottomNavigation` da AppLayout sobreposto pelos botões "Editar" empurrados pra baixo. Esse padrão está quebrado em mobile. |
| Padding lateral 16px certo, mas cards grudados verticalmente sem hierarquia | Falta de "respirar" entre header e KPIs |

### Tela 2 — `ProductForm` (modal de edição) em mobile (screenshot image-236)

| Problema | Evidência |
|---|---|
| Hero card com imagem **centralizada empilhada** acima do nome | Linha 245: `flex-col md:flex-row` — em mobile ocupa ~280px de altura desperdiçada. Imagem 96×96 num modal mobile é exagero. |
| Header: nome em itálico truncado debaixo de "Editar Produto" | Linha 224-226: subtítulo redundante (o nome já aparece no hero card abaixo) |
| Card "Precificação" com label "PREÇO DE CUSTO * [EDITÁVEL]" + Input em **coluna única** | Linhas 281-307: `grid-cols-1 md:grid-cols-2` — em mobile cada input fica gigante, força scroll exagerado |
| Badge "EDITÁVEL" laranja vivo do mesmo tamanho do label | Tira foco do que importa (o valor) |
| Footer com botão "Salvar Alterações" laranja gigante + "Cancelar" como link de texto | Linhas 745-751: ordem invertida com `flex-col-reverse` deixa "Cancelar" embaixo, longe do polegar. Em mobile o padrão correto é Cancelar à esquerda + Salvar à direita lado a lado. |

## Plano de melhoria mobile (sem mexer no desktop)

Tudo via classes Tailwind responsivas (`md:` mantém o comportamento desktop atual intacto).

### A) `ProductDetail.tsx` — mobile mais denso e útil

1. **Header compacto em mobile**
   - Imagem **48×48** em mobile, mantém 64×64 a partir de `md:` (linhas 140-143)
   - Título `text-base` em mobile (atual `text-lg`)
   - Remover badge de status do header em mobile e movê-lo para **dentro** do primeiro KPI (Lucro/un fica com pílula colorida no canto)
   - Botões "Editar" + menu "⋯" colados ao header em mobile (atual já está, mas botão Editar sai com `flex-1` ocupando largura útil)

2. **KPIs: 2×2 grid em mobile, 1×4 em desktop**
   - Atual `grid-cols-2 md:grid-cols-4` ✓ ok
   - Aumentar destaque do valor: `text-2xl` em mobile (atual `text-xl`)
   - Adicionar borda colorida sutil de status no card "Margem real" (verde/amarelo/vermelho)

3. **CTA flutuante mobile**
   - Adicionar barra fixa na base com **"Editar produto"** full-width acima do `BottomNavigation` (z-index correto, padding-bottom de 80px no scroll-content para não cobrir)
   - Em desktop esse CTA fica oculto (`md:hidden`) — o botão Editar do header é o suficiente
   - Substitui a sensação atual de "botões flutuando à toa"

4. **Cards do grid em coluna única no mobile (já é o caso)**
   - Reordenar: **Estoque** antes de **Comparativo de canais** em mobile (alerta de reposição é mais acionável que comparativo vazio)

### B) `ProductForm.tsx` — modal de edição mais usável em mobile

1. **Hero compacto: imagem inline com nome em mobile**
   - Em mobile: `flex-row` com imagem **64×64** à esquerda + nome ocupando o restante (mesma linha, como no card de produto)
   - Em desktop: mantém `md:flex-row` com imagem 96×96 (estado atual)
   - Remover subtítulo italic redundante do header (linhas 224-226)

2. **Precificação: Custo + Venda lado a lado em mobile**
   - Trocar `grid-cols-1 md:grid-cols-2` por `grid-cols-2 gap-3` puro (já cabe em 390px com prefix R$ compacto)
   - Embalagem mantém linha própria embaixo (já está)
   - Reduzir altura dos inputs de `h-11` para `h-10` em mobile para densidade
   - Badge "editável": mover para tooltip/ícone `Info` ao lado do label em vez de pílula laranja inline (chama atenção apenas em hover)

3. **Footer mobile: botões lado a lado**
   - Trocar `flex-col-reverse md:flex-row` por `flex-row gap-2` (Cancelar 40% + Salvar 60%)
   - "Cancelar" vira `Button variant="outline"` em vez de ghost para ter peso visual
   - Footer com `pb-[env(safe-area-inset-bottom)]` para iPhone

4. **Header limpo**
   - Remover linha do nome italic (já está no hero card embaixo)
   - Badge "🛍 Shopee" do lado do título — mantém

### C) Refinos transversais mobile

- Padding lateral do modal: `px-4` em mobile (atual `px-5`) → mais espaço útil
- Espaçamento vertical entre seções: `space-y-4` em mobile (atual `space-y-5`) → menos scroll
- `surface-card` com `p-4` em mobile (atual `p-5` em alguns) → consistência

## Arquivos modificados (somente mobile, sem afetar desktop)

1. **`src/pages/ProductDetail.tsx`**
   - Header: imagem 48px mobile, título menor, badge no KPI
   - KPIs: typography mais forte, borda de status
   - Adicionar CTA flutuante mobile-only "Editar produto"
   - Reordenar cards da coluna direita em mobile

2. **`src/components/forms/ProductForm.tsx`**
   - Hero card horizontal em mobile (img + nome lado a lado)
   - Precificação grid 2 colunas em mobile
   - Footer mobile com botões lado a lado
   - Remover subtítulo italic redundante do header

## O que **NÃO** muda

- Desktop (≥768px): tudo permanece exatamente igual ao estado atual
- Lógica de cálculo, ROAS, comparativo, projeção
- Tokens de cor, fontes, ícones
- Modal de edição: continua sendo bottom-sheet em mobile, modal centrado em desktop
- Hook `useShopeeProducts` e a lógica de preservar preço editado (já implementada)

## Resultado esperado

- Mobile do detalhe: header consome 30% menos vertical, KPIs em 2×2 com peso visual real, CTA "Editar" sempre acessível na base
- Mobile do form: hero ocupa 1 linha em vez de 3, custo+venda visíveis sem scroll, botões salvar/cancelar lado a lado no padrão iOS/Android

