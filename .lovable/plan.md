

## Diagnóstico (image-270)

A área no topo da aba Análise tem 3 problemas reais:

### 1. Linha de chips solta acima das tabs
- "Importar da Shopee" (botão outline laranja) + "31 sem custo" (pill destructive) ficam **flutuando sem container**, em uma faixa horizontal vazia que ocupa altura mas não tem peso visual
- O chip "31 sem custo" é alarmante (vermelho) mas **não é clicável** — só informa, sem CTA. Em tela larga (1079px) fica perdido à esquerda com 70% de espaço vazio à direita

### 2. Tabs gigantes desbalanceadas
- TabsList ocupa **largura total** (h-11) com 2 abas + um botão de download isolado à direita
- A aba ativa "Análise" vira uma **barra laranja sólida enorme** (~700px de largura) — visualmente domina a página, parece banner
- Botão de download está **destacado num quadradinho separado** (40x40 outline) sem agrupamento visual com as tabs

### 3. KPI tiles inconsistentes em altura
- Card "Margem" tem mini-rodapé Best/Worst → fica **muito mais alto** que os outros 3 (Lucro/Na Meta/Sem Custo)
- Quebra simetria na grid `grid-cols-4` — os 3 cards menores ficam com espaço vazio embaixo
- Ícones (Percent, $, Target, AlertCircle) estão pequenos (3.5x3.5) e cinza apagado — não têm presença

## Plano de redesign (apenas a faixa do topo)

### A. Toolbar unificada (substitui chip row + tabs row)

Fundir as 2 linhas atuais em **1 toolbar única** com 3 zonas:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Produtos (32)] [Análise]    [⚠ 31 sem custo]  [↓Shopee] [⬇] │
└─────────────────────────────────────────────────────────────────┘
```

- **Esquerda**: TabsList compacto (não full-width) — `inline-flex` com `h-9` em vez de `h-11 grid`. Tabs ganham largura natural pelo conteúdo (~280px total em vez de 700px). Aba ativa fica destacada mas não vira banner laranja gigante
- **Centro/Direita**: chip "31 sem custo" **clicável** (vira filtro `?filter=sem-custo` na aba Produtos) ao lado dos botões de ação
- **Direita**: "Importar Shopee" + ícone download agrupados, mesma altura `h-9`, espaçamento consistente

### B. Chip "Sem custo" → ação útil

- Adicionar `onClick` que navega `/products?filter=sem-custo` (a lógica já existe no draftFilter, linha 83-84)
- Adicionar hover state (`hover:bg-destructive/15`) e cursor-pointer
- Ícone `AlertTriangle` em vez de `AlertCircle` (mais condizente com chamada à ação)
- Texto: "31 produtos sem custo →" (com seta indicando ação)

### C. KPI tiles — uniformizar altura

Problema: card "Margem" cresce por causa do bloco Best/Worst. 

**Solução**: aplicar `min-h-[160px]` em todos os 4 cards + `flex-1` no espaço entre conteúdo principal e rodapé. Cards sem Best/Worst ganham um **placeholder visual** no rodapé (pequena legenda contextual):
- **Lucro**: rodapé com `↗ +R$ X esse mês` (delta vs período anterior, se disponível) ou apenas `Lucro líquido total`
- **Na Meta**: rodapé com mini-bar de progresso já presente + `X% no alvo`
- **Sem Custo**: rodapé "Toque para preencher →" clicável (vai pra products?filter=sem-custo)

### D. Polimentos visuais nos KPIs

- Ícones: aumentar de `w-3.5 h-3.5` → `w-4 h-4`, dar cor semântica (Margem=primary, Lucro=success, Na Meta=primary, Sem Custo=destructive em vez de cinza)
- Section-label: já está bom, manter
- Valor: já tem hierarquia OK, manter
- Mini-bars: aumentar de `h-1` → `h-1.5` pra ficarem mais visíveis

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | (1) Remover bloco standalone "Shopee import + cost chip" (linhas 232-256); (2) Refatorar `<Tabs>` row: TabsList compacto inline + chip "sem custo" clicável + botões "Importar Shopee" + Download agrupados na mesma toolbar; (3) KPI tiles: `min-h-[160px]`, ícones coloridos semânticos `w-4 h-4`, mini-bars `h-1.5`, rodapé do card "Sem Custo" clicável que filtra produtos |

Sem mudanças em `AnalyticsCharts.tsx`, `TrendSearchCard.tsx`, `PageHeader.tsx`, ou backend.

## Trade-offs

- ✅ Topo perde 1 linha inteira de altura (chips fundidos com tabs)
- ✅ Tabs deixam de parecer banner — voltam ao tamanho de "controle de navegação"
- ✅ Chip "sem custo" vira ação útil (1 clique pra ver os produtos)
- ✅ KPIs uniformes em altura — grid simétrica
- ✅ Ícones com cor semântica reforçam significado de cada KPI
- ⚠️ Em mobile (<640px) a toolbar precisa quebrar em 2 linhas: tabs em cima, ações embaixo (já previsto com `flex-wrap`)

